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

    const { week_start, clinic_id } = await req.json();

    // Check if report already exists
    const { data: existing } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("clinic_id", clinic_id)
      .eq("week_start_date", week_start)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ report: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch 7 days of checkins
    const weekEnd = new Date(week_start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const { data: checkins, error: checkinsError } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("clinic_id", clinic_id)
      .gte("date", week_start)
      .lte("date", weekEndStr)
      .order("date", { ascending: true });

    if (checkinsError) throw checkinsError;

    if (!checkins || checkins.length === 0) {
      return new Response(JSON.stringify({ error: "no_data", message: "Sem dados para gerar relatório." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch clinic info for context
    const { data: clinic } = await supabase
      .from("clinics")
      .select("ticket_medio, daily_capacity, target_fill_rate, target_noshow_rate")
      .eq("id", clinic_id)
      .single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const totalDone = checkins.reduce((s: number, c: any) => s + c.appointments_done, 0);
    const totalScheduled = checkins.reduce((s: number, c: any) => s + c.appointments_scheduled, 0);
    const totalNoShow = checkins.reduce((s: number, c: any) => s + c.no_show, 0);
    const totalCancel = checkins.reduce((s: number, c: any) => s + c.cancellations, 0);
    const totalEmpty = checkins.reduce((s: number, c: any) => s + c.empty_slots, 0);
    const ticket = clinic?.ticket_medio ?? 250;
    const capacity = clinic?.daily_capacity ?? 16;

    const summary = {
      dias_com_checkin: checkins.length,
      total_atendidos: totalDone,
      total_agendados: totalScheduled,
      total_no_show: totalNoShow,
      total_cancelamentos: totalCancel,
      total_buracos: totalEmpty,
      receita_estimada: totalDone * ticket,
      receita_perdida: (totalNoShow + totalCancel + totalEmpty) * ticket,
      taxa_ocupacao_media: `${Math.round((totalDone / (checkins.length * capacity)) * 100)}%`,
      taxa_noshow: `${totalScheduled > 0 ? Math.round((totalNoShow / totalScheduled) * 100) : 0}%`,
      meta_ocupacao: `${Math.round((clinic?.target_fill_rate ?? 0.85) * 100)}%`,
      meta_noshow: `${Math.round((clinic?.target_noshow_rate ?? 0.05) * 100)}%`,
    };

    const systemPrompt = `Você é um consultor de negócios especialista em clínicas médicas. Analise os dados da última semana e gere um relatório estratégico conciso em 3 seções:
1. **👍 O que foi bem:** Destaque 1 ou 2 pontos positivos (ex: baixa taxa de no-show, alta ocupação).
2. **⚠️ Pontos de atenção:** Identifique o maior problema da semana (ex: muitos buracos na agenda, queda no faturamento).
3. **🎯 Plano de Ação para a próxima semana:** Sugira 2 a 3 ações práticas e específicas para resolver os pontos de atenção.

Use um tom profissional, direto e encorajador. Responda APENAS em português brasileiro. Máximo 300 palavras.`;

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
          { role: "user", content: `Dados resumidos da semana (${week_start}): ${JSON.stringify(summary)}` },
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
      throw new Error("Erro ao gerar relatório com IA");
    }

    const result = await response.json();
    const reportText = result.choices?.[0]?.message?.content || "";

    // Save report
    const { data: saved, error: saveError } = await supabase
      .from("weekly_reports")
      .insert({
        user_id: userId,
        clinic_id,
        report_text: reportText,
        week_start_date: week_start,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ report: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-weekly-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
