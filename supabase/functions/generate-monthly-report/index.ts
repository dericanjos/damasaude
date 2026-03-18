import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { month_date, clinic_id } = await req.json();

    // Check if report already exists
    const { data: existing } = await supabase
      .from("monthly_reports")
      .select("*")
      .eq("clinic_id", clinic_id)
      .eq("month_date", month_date)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ report: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all checkins for the month
    const monthStart = month_date; // e.g. "2026-03-01"
    const d = new Date(month_date);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

    const { data: checkins, error: checkinsError } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("clinic_id", clinic_id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true });

    if (checkinsError) throw checkinsError;

    if (!checkins || checkins.length === 0) {
      return new Response(JSON.stringify({ error: "no_data", message: "Sem dados para gerar relatório mensal." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch clinic info
    const { data: clinic } = await supabase
      .from("clinics")
      .select("ticket_private, ticket_insurance, daily_capacity, target_fill_rate, target_noshow_rate, working_days, has_secretary")
      .eq("id", clinic_id)
      .single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch per-location financials and locations for multi-loc support
    const { data: locationFinancials } = await supabase
      .from("location_financials")
      .select("location_id, ticket_private, ticket_insurance, ticket_avg")
      .eq("user_id", userId);

    const { data: locationsData } = await supabase
      .from("locations")
      .select("id, name")
      .eq("user_id", userId)
      .eq("is_active", true);

    const clinicTicketPriv = clinic?.ticket_private ?? 250;
    const clinicTicketIns = clinic?.ticket_insurance ?? 100;
    const capacity = clinic?.daily_capacity ?? 16;

    // Build per-location maps
    const locFinMap: Record<string, { ticketPriv: number; ticketIns: number; ticketAvg: number }> = {};
    for (const f of (locationFinancials || [])) {
      locFinMap[(f as any).location_id] = {
        ticketPriv: (f as any).ticket_private ?? clinicTicketPriv,
        ticketIns: (f as any).ticket_insurance ?? clinicTicketIns,
        ticketAvg: (f as any).ticket_avg ?? 250,
      };
    }

    const locNameMap: Record<string, string> = {};
    for (const l of (locationsData || [])) {
      locNameMap[l.id] = l.name;
    }

    // Aggregate using per-location split tickets
    let totalAttPrivate = 0, totalAttInsurance = 0, totalNoshowPriv = 0, totalNoshowIns = 0;
    let totalCancel = 0, totalEmpty = 0, totalScheduled = 0;
    let revenueEstimated = 0, revenueLost = 0;
    const perLocation: Record<string, { attended: number; lost: number; noshows: number; capacity: number }> = {};

    for (const c of checkins) {
      const locId = c.location_id || "unknown";
      const fin = locFinMap[locId] ?? { ticketPriv: clinicTicketPriv, ticketIns: clinicTicketIns, ticketAvg: 250 };

      const attP = c.attended_private ?? c.appointments_done ?? 0;
      const attI = c.attended_insurance ?? 0;
      const nsP = c.noshows_private ?? c.no_show ?? 0;
      const nsI = c.noshows_insurance ?? 0;
      const cancel = c.cancellations ?? 0;
      const empty = c.empty_slots ?? 0;

      totalAttPrivate += attP;
      totalAttInsurance += attI;
      totalNoshowPriv += nsP;
      totalNoshowIns += nsI;
      totalCancel += cancel;
      totalEmpty += empty;
      totalScheduled += c.appointments_scheduled ?? 0;

      const est = (attP * fin.ticketPriv) + (attI * fin.ticketIns);
      const lostNs = (nsP * fin.ticketPriv) + (nsI * fin.ticketIns);
      const lostGen = (cancel + empty) * fin.ticketAvg;

      revenueEstimated += est;
      revenueLost += lostNs + lostGen;

      if (!perLocation[locId]) perLocation[locId] = { attended: 0, lost: 0, noshows: 0, capacity: 0 };
      perLocation[locId].attended += (attP + attI);
      perLocation[locId].lost += (lostNs + lostGen);
      perLocation[locId].noshows += (nsP + nsI);
      perLocation[locId].capacity += capacity;
    }

    const totalDone = totalAttPrivate + totalAttInsurance;
    const totalNoShow = totalNoshowPriv + totalNoshowIns;

    const uniqueLocations = [...new Set(checkins.map((c: any) => c.location_id).filter(Boolean))];
    const isMultiLocation = uniqueLocations.length > 1;

    const summary = {
      dias_com_checkin: checkins.length,
      total_atendidos: totalDone,
      atendidos_particular: totalAttPrivate,
      atendidos_convenio: totalAttInsurance,
      total_agendados: totalScheduled,
      total_no_show: totalNoShow,
      noshow_particular: totalNoshowPriv,
      noshow_convenio: totalNoshowIns,
      total_cancelamentos: totalCancel,
      total_buracos: totalEmpty,
      receita_estimada: revenueEstimated,
      receita_perdida: revenueLost,
      taxa_ocupacao_media: `${checkins.length > 0 ? Math.round((totalDone / (checkins.length * Math.max(capacity, 1))) * 100) : 0}%`,
      taxa_noshow: `${totalScheduled > 0 ? Math.round((totalNoShow / totalScheduled) * 100) : 0}%`,
      meta_ocupacao: `${Math.round((clinic?.target_fill_rate ?? 0.85) * 100)}%`,
      meta_noshow: `${Math.round((clinic?.target_noshow_rate ?? 0.05) * 100)}%`,
      multi_local: isMultiLocation,
      locais: isMultiLocation ? Object.entries(perLocation).map(([id, d]) => ({
        nome: locNameMap[id] || id,
        atendidos: d.attended,
        perdido: Math.round(d.lost),
        noshows: d.noshows,
      })) : undefined,
    };

    const hasSecretary = clinic?.has_secretary ?? false;
    const secretaryContext = hasSecretary
      ? "O médico TEM secretária. Nas prioridades, sugira delegação de tarefas operacionais à secretária."
      : "O médico NÃO tem secretária. Nas prioridades, sugira automação, uso de WhatsApp Business e ações diretas.";

    // CTA rotation based on month
    const monthNum = d.getMonth();
    const ctaVariations = [
      "A DAMA pode auxiliar você a estruturar essa rotina com uma equipe dedicada. Vale conhecer.",
      "Essa é uma área onde a DAMA pode oferecer suporte com secretária remota e acompanhamento contínuo.",
      "Se fizer sentido para você, a DAMA disponibiliza essa operação de forma estruturada. Saiba mais.",
      "A DAMA pode implementar esse processo para você — com acompanhamento e equipe de apoio.",
      "Caso queira, a DAMA pode apresentar uma solução prática para essa questão.",
    ];
    const ctaForThisMonth = ctaVariations[monthNum % ctaVariations.length];

    const multiLocMonthlyRules = isMultiLocation
      ? `\nEste relatório é CONSOLIDADO de ${uniqueLocations.length} locais. Inclua um bloco COMPARATIVO ENTRE LOCAIS com bullets: maior vazamento (R$), maior no-show (%), melhor ocupação (%).`
      : "";

    const systemPrompt = `Você é o sistema de diagnóstico da DAMA, especializado em gestão de clínicas médicas. ${secretaryContext}${multiLocMonthlyRules}

Analise os dados consolidados deste mês e gere um relatório executivo em 4 seções:

1. **📈 Diagnóstico do Mês:** Qual foi o principal ponto forte e o principal ponto fraco do mês?
2. **📊 Análise de Tendências:** Analise a performance dos KPIs principais e identifique tendências.
3. **🔮 Previsão para o Próximo Mês:** Com base nos dados atuais, projete cenários: se manter a taxa atual de no-show/cancelamentos, quanto será perdido? Se reduzir em X%, quanto pode recuperar?
4. **🎯 Prioridades para o Próximo Mês:** 2-3 prioridades estratégicas com impacto estimado em R$.

REGRAS DE TEXTO:
- Os dados diferenciam pacientes particulares e de convênio. Use isso para insights de mix de receita e precificação.
- Tom direto, médico-friendly, realista. Nada professoral.
- Se o resultado for crítico, use EXATAMENTE esta frase como CTA no final: "${ctaForThisMonth}" — use apenas UMA VEZ, nunca repita CTAs.
- PROIBIDO: mencionar "IA", "inteligência artificial", "consultor" ou referências a ajuda externa. Tudo é funcionalidade nativa DAMA.
- Máximo 500 palavras.
- Responda APENAS em português brasileiro.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados consolidados do mês (${month_date}): ${JSON.stringify(summary)}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro ao gerar relatório mensal com IA");
    }

    const result = await response.json();
    const reportText = result.choices?.[0]?.message?.content || "";

    // Save report
    const { data: saved, error: saveError } = await supabase
      .from("monthly_reports")
      .insert({
        user_id: userId,
        clinic_id,
        report_text: reportText,
        month_date,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ report: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-monthly-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
