import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    // Service role client to read all users' data
    const admin = createClient(supabaseUrl, serviceKey);

    // Get caller's specialty
    const { data: myClinic } = await admin
      .from("clinics")
      .select("specialty, ticket_private, ticket_insurance")
      .eq("user_id", userId)
      .maybeSingle();

    if (!myClinic?.specialty) {
      return new Response(JSON.stringify({ error: "no_specialty" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const specialty = myClinic.specialty;

    // Find all clinics with same specialty (excluding caller)
    const { data: peerClinics } = await admin
      .from("clinics")
      .select("user_id, ticket_private, ticket_insurance")
      .eq("specialty", specialty)
      .neq("user_id", userId);

    if (!peerClinics || peerClinics.length < 3) {
      return new Response(
        JSON.stringify({ error: "insufficient_peers", peerCount: peerClinics?.length ?? 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const peerUserIds = peerClinics.map((c) => c.user_id);
    const peerTickets: Record<string, { tp: number; ti: number }> = {};
    for (const c of peerClinics) {
      peerTickets[c.user_id] = { tp: c.ticket_private ?? 250, ti: c.ticket_insurance ?? 100 };
    }

    // Get last 30 days of checkins for peers
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

    const { data: peerCheckins } = await admin
      .from("daily_checkins")
      .select(
        "user_id, appointments_scheduled, attended_private, attended_insurance, noshows_private, noshows_insurance, cancellations, empty_slots, new_appointments, followup_done, extra_appointments"
      )
      .in("user_id", peerUserIds)
      .gte("date", dateStr);

    if (!peerCheckins || peerCheckins.length === 0) {
      return new Response(
        JSON.stringify({ error: "insufficient_data" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate per peer user
    const perUser: Record<string, { totalAttended: number; totalScheduled: number; totalNoshows: number; totalCapacity: number; days: number; totalRevenue: number }> = {};

    for (const c of peerCheckins) {
      if (!perUser[c.user_id]) {
        perUser[c.user_id] = { totalAttended: 0, totalScheduled: 0, totalNoshows: 0, totalCapacity: 0, days: 0, totalRevenue: 0 };
      }
      const u = perUser[c.user_id];
      const attended = (c.attended_private ?? 0) + (c.attended_insurance ?? 0);
      const noshows = (c.noshows_private ?? 0) + (c.noshows_insurance ?? 0);
      const cap = (c.appointments_scheduled ?? 0) + (c.extra_appointments ?? 0);
      const tickets = peerTickets[c.user_id] || { tp: 250, ti: 100 };

      u.totalAttended += attended;
      u.totalNoshows += noshows;
      u.totalCapacity += Math.max(cap, 1);
      u.days += 1;
      u.totalRevenue += (c.attended_private ?? 0) * tickets.tp + (c.attended_insurance ?? 0) * tickets.ti;
    }

    // Only count peers with at least 3 days of data
    const validPeers = Object.values(perUser).filter((u) => u.days >= 3);
    if (validPeers.length < 3) {
      return new Response(
        JSON.stringify({ error: "insufficient_peers", peerCount: validPeers.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate IDEA score per peer (simplified version matching client logic)
    function calcIDEA(attended: number, noshows: number, cancellations: number, emptySlots: number, capacity: number): number {
      const cap = Math.max(capacity, 1);
      const totalLoss = noshows + cancellations + emptySlots;
      const penalty = (totalLoss / cap) * 100;
      const base = 100 - penalty;
      const bonusOcc = (attended / cap) >= 0.9 ? 3 : 0;
      return Math.max(0, Math.min(100, Math.round(base + bonusOcc)));
    }

    // Per-peer averages (we aggregate at user level first for fairness)
    let sumOccupancy = 0;
    let sumNoshowRate = 0;
    let sumIdeaScore = 0;

    // Recompute with cancellations/empty_slots per user for IDEA
    const perUserFull: Record<string, { totalAttended: number; totalNoshows: number; totalCancels: number; totalEmpty: number; totalCap: number; days: number }> = {};
    for (const c of peerCheckins) {
      if (!perUserFull[c.user_id]) {
        perUserFull[c.user_id] = { totalAttended: 0, totalNoshows: 0, totalCancels: 0, totalEmpty: 0, totalCap: 0, days: 0 };
      }
      const u = perUserFull[c.user_id];
      u.totalAttended += (c.attended_private ?? 0) + (c.attended_insurance ?? 0);
      u.totalNoshows += (c.noshows_private ?? 0) + (c.noshows_insurance ?? 0);
      u.totalCancels += c.cancellations ?? 0;
      u.totalEmpty += c.empty_slots ?? 0;
      u.totalCap += Math.max((c.appointments_scheduled ?? 0) + (c.extra_appointments ?? 0), 1);
      u.days += 1;
    }

    const validPeersFull = Object.entries(perUserFull).filter(([_, u]) => u.days >= 3);
    for (const [_, u] of validPeersFull) {
      const occ = u.totalCap > 0 ? u.totalAttended / u.totalCap : 0;
      const nsr = u.totalCap > 0 ? u.totalNoshows / u.totalCap : 0;
      const idea = calcIDEA(u.totalAttended, u.totalNoshows, u.totalCancels, u.totalEmpty, u.totalCap);
      sumOccupancy += occ;
      sumNoshowRate += nsr;
      sumIdeaScore += idea;
    }

    const count = validPeersFull.length;
    const result = {
      specialty,
      peerCount: count,
      avgOccupancy: Math.round((sumOccupancy / count) * 1000) / 1000,
      avgNoshowRate: Math.round((sumNoshowRate / count) * 1000) / 1000,
      avgIdeaScore: Math.round(sumIdeaScore / count),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("calculate-benchmarks error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
