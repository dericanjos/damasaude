import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const ticketPrivate = clinic?.ticket_private ?? 250;
    const ticketInsurance = clinic?.ticket_insurance ?? 100;
    const avgTicket = (ticketPrivate + ticketInsurance) / 2;
    const capacity = clinic?.daily_capacity ?? 16;

    const totalAttPrivate = checkins.reduce((s: number, c: any) => s + (c.attended_private ?? c.appointments_done ?? 0), 0);
    const totalAttInsurance = checkins.reduce((s: number, c: any) => s + (c.attended_insurance ?? 0), 0);
    const totalDone = totalAttPrivate + totalAttInsurance;
    const totalScheduled = checkins.reduce((s: number, c: any) => s + c.appointments_scheduled, 0);
    const totalNoshowPriv = checkins.reduce((s: number, c: any) => s + (c.noshows_private ?? c.no_show ?? 0), 0);
    const totalNoshowIns = checkins.reduce((s: number, c: any) => s + (c.noshows_insurance ?? 0), 0);
    const totalNoShow = totalNoshowPriv + totalNoshowIns;
    const totalCancel = checkins.reduce((s: number, c: any) => s + c.cancellations, 0);
    const totalEmpty = checkins.reduce((s: number, c: any) => s + c.empty_slots, 0);

    const revenueEstimated = (totalAttPrivate * ticketPrivate) + (totalAttInsurance * ticketInsurance);
    const revenueLost = (totalNoshowPriv * ticketPrivate) + (totalNoshowIns * ticketInsurance) + ((totalCancel + totalEmpty) * avgTicket);

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
      ticket_particular: ticketPrivate,
      ticket_convenio: ticketInsurance,
      taxa_ocupacao_media: `${Math.round((totalDone / (checkins.length * capacity)) * 100)}%`,
      taxa_noshow: `${totalScheduled > 0 ? Math.round((totalNoShow / totalScheduled) * 100) : 0}%`,
      meta_ocupacao: `${Math.round((clinic?.target_fill_rate ?? 0.85) * 100)}%`,
      meta_noshow: `${Math.round((clinic?.target_noshow_rate ?? 0.05) * 100)}%`,
    };

    const hasSecretary = clinic?.has_secretary ?? false;
    const secretaryContext = hasSecretary
      ? "O médico TEM secretária. Nas prioridades, sugira delegação de tarefas operacionais à secretária."
      : "O médico NÃO tem secretária. Nas prioridades, sugira automação, uso de WhatsApp Business e ações diretas.";

    const systemPrompt = `Você é um consultor de negócios sênior especialista em gestão de clínicas médicas. ${secretaryContext}

Analise os dados consolidados deste mês e gere um relatório executivo em 3 seções:

1. **📈 Diagnóstico do Mês:** Qual foi o principal ponto forte e o principal ponto fraco do mês? (ex: "O faturamento cresceu, mas a taxa de no-show de convênio aumentou").
2. **📊 Análise de Tendências:** Analise a performance dos KPIs principais e identifique tendências de melhora ou piora ao longo do mês.
3. **🎯 Prioridades para o Próximo Mês:** Sugira 2 a 3 prioridades estratégicas para o médico focar no próximo mês.

IMPORTANTE: Os dados diferenciam pacientes particulares e de convênio. Use essa informação para dar insights mais precisos sobre mix de receita e estratégia de precificação.

Use um tom profissional, direto e encorajador. Responda APENAS em português brasileiro. Máximo 400 palavras.`;

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
