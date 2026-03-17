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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthDate = prevMonth.toISOString().split("T")[0]; // e.g. "2026-02-01"
    const monthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // Fetch all clinics
    const { data: clinics, error: clinicsError } = await supabase
      .from("clinics")
      .select("id, user_id, daily_capacity, target_fill_rate, target_noshow_rate, ticket_private, ticket_insurance, has_secretary, working_days");

    if (clinicsError) throw clinicsError;
    if (!clinics || clinics.length === 0) {
      return new Response(JSON.stringify({ message: "No clinics found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { clinic_id: string; status: string; error?: string }[] = [];

    for (const clinic of clinics) {
      try {
        // Check if report already exists
        const { data: existing } = await supabase
          .from("monthly_reports")
          .select("id")
          .eq("clinic_id", clinic.id)
          .eq("month_date", monthDate)
          .maybeSingle();

        if (existing) {
          results.push({ clinic_id: clinic.id, status: "already_exists" });
          continue;
        }

        // Fetch checkins for the month
        const { data: checkins, error: checkinsError } = await supabase
          .from("daily_checkins")
          .select("*")
          .eq("clinic_id", clinic.id)
          .gte("date", monthDate)
          .lte("date", monthEnd)
          .order("date", { ascending: true });

        if (checkinsError) throw checkinsError;
        if (!checkins || checkins.length === 0) {
          results.push({ clinic_id: clinic.id, status: "no_data" });
          continue;
        }

        // Fetch per-location financials
        const { data: locationFinancials } = await supabase
          .from("location_financials")
          .select("location_id, ticket_private, ticket_insurance, ticket_avg")
          .eq("user_id", clinic.user_id);

        const { data: locationsData } = await supabase
          .from("locations")
          .select("id, name")
          .eq("user_id", clinic.user_id)
          .eq("is_active", true);

        const clinicTicketPriv = clinic.ticket_private ?? 250;
        const clinicTicketIns = clinic.ticket_insurance ?? 100;
        const capacity = clinic.daily_capacity ?? 16;

        const locFinMap: Record<string, { ticketPriv: number; ticketIns: number; ticketAvg: number }> = {};
        for (const f of locationFinancials || []) {
          locFinMap[(f as any).location_id] = {
            ticketPriv: (f as any).ticket_private ?? clinicTicketPriv,
            ticketIns: (f as any).ticket_insurance ?? clinicTicketIns,
            ticketAvg: (f as any).ticket_avg ?? 250,
          };
        }

        const locNameMap: Record<string, string> = {};
        for (const l of locationsData || []) {
          locNameMap[l.id] = l.name;
        }

        // Aggregate
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
          meta_ocupacao: `${Math.round((clinic.target_fill_rate ?? 0.85) * 100)}%`,
          meta_noshow: `${Math.round((clinic.target_noshow_rate ?? 0.05) * 100)}%`,
          multi_local: isMultiLocation,
          locais: isMultiLocation
            ? Object.entries(perLocation).map(([id, d]) => ({
                nome: locNameMap[id] || id,
                atendidos: d.attended,
                perdido: Math.round(d.lost),
                noshows: d.noshows,
              }))
            : undefined,
        };

        const hasSecretary = clinic.has_secretary ?? false;
        const secretaryContext = hasSecretary
          ? "O médico TEM secretária. Nas prioridades, sugira delegação de tarefas operacionais à secretária."
          : "O médico NÃO tem secretária. Nas prioridades, sugira automação, uso de WhatsApp Business e ações diretas.";

        const monthNum = prevMonth.getMonth();
        const ctaVariations = [
          "Se quiser, a DAMA pode implementar essa rotina para você com uma equipe dedicada.",
          "Essa é uma área onde a DAMA pode atuar com secretária remota e rotina montada.",
          "Que tal delegar isso para a DAMA? Agende uma conversa e veja como funciona.",
          "A DAMA entrega isso pronto — secretária, rotina e acompanhamento. Saiba mais.",
          "Quer ajuda prática? A DAMA monta essa operação para você.",
        ];
        const ctaForThisMonth = ctaVariations[monthNum % ctaVariations.length];

        const multiLocRules = isMultiLocation
          ? `\nEste relatório é CONSOLIDADO de ${uniqueLocations.length} locais. Inclua um bloco COMPARATIVO ENTRE LOCAIS.`
          : "";

        const systemPrompt = `Você é o sistema de diagnóstico da DAMA, especializado em gestão de clínicas médicas. ${secretaryContext}${multiLocRules}

Analise os dados consolidados deste mês e gere um relatório executivo em 4 seções:

1. **📈 Diagnóstico do Mês:** Qual foi o principal ponto forte e o principal ponto fraco do mês?
2. **📊 Análise de Tendências:** Analise a performance dos KPIs principais e identifique tendências.
3. **🔮 Previsão para o Próximo Mês:** Com base nos dados atuais, projete cenários: se manter a taxa atual de no-show/cancelamentos, quanto será perdido? Se reduzir em X%, quanto pode recuperar?
4. **🎯 Prioridades para o Próximo Mês:** 2-3 prioridades estratégicas com impacto estimado em R$.

REGRAS:
- Os dados diferenciam pacientes particulares e de convênio. Use isso para insights de mix de receita.
- Tom direto, médico-friendly, realista.
- Se o resultado for crítico, use EXATAMENTE esta frase como CTA no final: "${ctaForThisMonth}" — use apenas UMA VEZ.
- PROIBIDO: mencionar "IA", "inteligência artificial", "consultor" ou referências a ajuda externa.
- Máximo 500 palavras.
- Responda APENAS em português brasileiro.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Dados consolidados do mês (${monthDate}): ${JSON.stringify(summary)}` },
            ],
            stream: false,
          }),
        });

        if (!aiResponse.ok) {
          const t = await aiResponse.text();
          console.error(`AI error for clinic ${clinic.id}:`, aiResponse.status, t);
          results.push({ clinic_id: clinic.id, status: "ai_error", error: `${aiResponse.status}` });
          continue;
        }

        const aiResult = await aiResponse.json();
        const reportText = aiResult.choices?.[0]?.message?.content || "";

        const { error: saveError } = await supabase
          .from("monthly_reports")
          .insert({
            user_id: clinic.user_id,
            clinic_id: clinic.id,
            report_text: reportText,
            month_date: monthDate,
          });

        if (saveError) {
          results.push({ clinic_id: clinic.id, status: "save_error", error: saveError.message });
        } else {
          results.push({ clinic_id: clinic.id, status: "generated" });
        }
      } catch (clinicErr) {
        console.error(`Error for clinic ${clinic.id}:`, clinicErr);
        results.push({
          clinic_id: clinic.id,
          status: "error",
          error: clinicErr instanceof Error ? clinicErr.message : "Unknown",
        });
      }
    }

    console.log("Scheduled monthly report results:", JSON.stringify(results));
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduled-monthly-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
