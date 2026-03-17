import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !data?.claims?.sub) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: data.claims.sub as string };

    const userId = user.id;
    const deleted: Record<string, number> = {};

    // Delete in FK-safe order: children first, parents last

    // 1. weekly_reports
    const r1 = await supabase.from("weekly_reports").delete().eq("user_id", userId).select("id");
    deleted.weekly_reports = r1.data?.length ?? 0;

    // 2. monthly_reports
    const r2 = await supabase.from("monthly_reports").delete().eq("user_id", userId).select("id");
    deleted.monthly_reports = r2.data?.length ?? 0;

    // 3. daily_actions (references clinics, locations)
    const r3 = await supabase.from("daily_actions").delete().eq("user_id", userId).select("id");
    deleted.daily_actions = r3.data?.length ?? 0;

    // 4. daily_checkins (references clinics, locations)
    const r4 = await supabase.from("daily_checkins").delete().eq("user_id", userId).select("id");
    deleted.daily_checkins = r4.data?.length ?? 0;

    // 5. daily_checklist_answers (references clinics)
    const r5 = await supabase.from("daily_checklist_answers").delete().eq("user_id", userId).select("id");
    deleted.daily_checklist_answers = r5.data?.length ?? 0;

    // 6. loss_reasons (references clinics)
    const r6 = await supabase.from("loss_reasons").delete().eq("user_id", userId).select("id");
    deleted.loss_reasons = r6.data?.length ?? 0;

    // 7. location_financials (references locations)
    const r7 = await supabase.from("location_financials").delete().eq("user_id", userId).select("id");
    deleted.location_financials = r7.data?.length ?? 0;

    // 8. location_schedules (references locations)
    const r8 = await supabase.from("location_schedules").delete().eq("user_id", userId).select("id");
    deleted.location_schedules = r8.data?.length ?? 0;

    // 9. locations (references clinics)
    const r9 = await supabase.from("locations").delete().eq("user_id", userId).select("id");
    deleted.locations = r9.data?.length ?? 0;

    // 10. clinics
    const r10 = await supabase.from("clinics").delete().eq("user_id", userId).select("id");
    deleted.clinics = r10.data?.length ?? 0;

    // 11. profiles
    const r11 = await supabase.from("profiles").delete().eq("user_id", userId).select("user_id");
    deleted.profiles = r11.data?.length ?? 0;

    return new Response(
      JSON.stringify({ ok: true, deleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
