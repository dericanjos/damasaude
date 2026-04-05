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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

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

    // Fetch clinic info
    const { data: clinic } = await supabase
      .from("clinics")
      .select("ticket_private, ticket_insurance, daily_capacity, target_fill_rate, target_noshow_rate, working_days, has_secretary, monthly_revenue_target")
      .eq("id", clinic_id)
      .single();

    // Fetch per-location financials
    const { data: locationFinancials } = await supabase
      .from("location_financials")
      .select("location_id, ticket_private, ticket_insurance, ticket_avg")
      .eq("user_id", userId);

    // Fetch locations for names
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name")
      .eq("user_id", userId)
      .eq("is_active", true);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const workingDays: string[] = Array.isArray(clinic?.working_days) ? clinic.working_days : ["seg", "ter", "qua", "qui", "sex"];
    const workingDaysCount = workingDays.length;

    const clinicTicketPriv = clinic?.ticket_private ?? 250;
    const clinicTicketIns = clinic?.ticket_insurance ?? 100;
    const capacity = clinic?.daily_capacity ?? 16;

    // Build per-location ticket maps
    const locFinMap: Record<string, { ticketPriv: number; ticketIns: number; ticketAvg: number }> = {};
    for (const f of (locationFinancials || [])) {
      locFinMap[(f as any).location_id] = {
        ticketPriv: (f as any).ticket_private ?? clinicTicketPriv,
        ticketIns: (f as any).ticket_insurance ?? clinicTicketIns,
        ticketAvg: (f as any).ticket_avg ?? 250,
      };
    }

    const locNameMap: Record<string, string> = {};
    for (const l of (locations || [])) {
      locNameMap[l.id] = l.name;
    }

    // Aggregate using split tickets
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
      const lost = lostNs + lostGen;

      revenueEstimated += est;
      revenueLost += lost;

      if (!perLocation[locId]) perLocation[locId] = { attended: 0, lost: 0, noshows: 0, capacity: 0 };
      perLocation[locId].attended += (attP + attI);
      perLocation[locId].lost += lost;
      perLocation[locId].noshows += (nsP + nsI);
      perLocation[locId].capacity += capacity;
    }

    const totalDone = totalAttPrivate + totalAttInsurance;
    const totalNoShow = totalNoshowPriv + totalNoshowIns;

    const isPartial = checkins.length < workingDaysCount;
    const partialNote = isPartial
      ? `\n\n---\n*Relatório parcial — ${checkins.length} de ${workingDaysCount} dias de atendimento.*`
      : "";

    // Determine if multi-location
    const uniqueLocations = [...new Set(checkins.map((c: any) => c.location_id).filter(Boolean))];
    const isMultiLocation = uniqueLocations.length > 1;

    // Build comparison block for multi-location
    let comparisonBlock = "";
    if (isMultiLocation) {
      let worstLeakerName = "", worstLeakerLost = 0;
      let bestOccName = "", bestOcc = -1;
      let worstNoshowName = "", worstNoshowRate = -1;

      for (const [locId, data] of Object.entries(perLocation)) {
        const name = locNameMap[locId] || "Local";
        if (data.lost > worstLeakerLost) { worstLeakerLost = data.lost; worstLeakerName = name; }
        const occ = data.capacity > 0 ? data.attended / data.capacity : 0;
        if (occ > bestOcc) { bestOcc = occ; bestOccName = name; }
        const nsRate = data.attended + data.noshows > 0 ? data.noshows / (data.attended + data.noshows) : 0;
        if (nsRate > worstNoshowRate) { worstNoshowRate = nsRate; worstNoshowName = name; }
      }

      comparisonBlock = `\n\n**Comparativo entre locais:**\n• Maior vazamento (R$): ${worstLeakerName} — R$${Math.round(worstLeakerLost)}\n• Maior no-show: ${worstNoshowName} — ${Math.round(worstNoshowRate * 100)}%\n• Melhor ocupação: ${bestOccName} — ${Math.round(bestOcc * 100)}%`;
    }

    const summary = {
      dias_com_checkin: checkins.length,
      dias_de_atendimento: workingDaysCount,
      relatorio_parcial: isPartial,
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
      ? "O médico TEM secretária. No plano de ação, sugira delegação de tarefas operacionais à secretária."
      : "O médico NÃO tem secretária. No plano de ação, sugira automação, uso de WhatsApp Business e ações diretas.";

    // (multiLocInstructions moved inline into systemPrompt below)

    // Determine week number for rotation seed
    const weekDate = new Date(week_start);
    const weekNum = Math.floor(weekDate.getTime() / (7 * 24 * 60 * 60 * 1000));

    const rotationHints: Record<string, string[]> = {
      noshow: [
        "confirmação em etapas (D-2 + D-1)",
        "lista de espera preventiva com pacientes flexíveis",
        "revisão de perfil de agendamento (horários/tipo de consulta)",
        "canal alternativo de confirmação (ex: ligação vs mensagem)",
        "política de reserva com pré-triagem",
      ],
      buracos: [
        "lista de espera ativa com acionamento rápido",
        "antecipação de retornos de outros dias",
        "redistribuição de horários ociosos",
        "encaixes programados em blocos fixos",
        "ajuste de grade nos horários com mais ociosidade",
      ],
      cancel: [
        "reagendamento rápido com 2 opções de data",
        "janela de reposição no fim do expediente",
        "mapeamento de motivos de cancelamento",
        "política de aviso com antecedência",
      ],
      followup: [
        "contato pós-consulta até 18h",
        "reativação de pacientes que não retornaram",
        "mensagem de prevenção de evasão",
        "follow-up segmentado por tipo de consulta",
      ],
    };

    // Pick rotation hints based on week number
    const pickHint = (type: string) => {
      const pool = rotationHints[type] || [];
      return pool[weekNum % pool.length] || pool[0];
    };

    const rotationContext = `
ROTAÇÃO DE ABORDAGENS (use a abordagem indicada para cada tipo de problema nesta semana — NÃO repita fórmulas anteriores):
- No-show: foque em "${pickHint('noshow')}"
- Buracos: foque em "${pickHint('buracos')}"
- Cancelamentos: foque em "${pickHint('cancel')}"
- Follow-up: foque em "${pickHint('followup')}"
`;

    // CTA rotation — never repeat the same phrase across sections
    const ctaVariations = [
      "A DAMA pode auxiliar você a estruturar essa rotina com uma equipe dedicada. Vale conhecer.",
      "Essa é uma área onde a DAMA pode oferecer suporte com secretária remota e acompanhamento contínuo.",
      "Se fizer sentido para você, a DAMA disponibiliza essa operação de forma estruturada. Saiba mais.",
      "A DAMA pode implementar esse processo para você — com acompanhamento e equipe de apoio.",
      "Caso queira, a DAMA pode apresentar uma solução prática para essa questão.",
    ];
    const ctaForThisWeek = ctaVariations[weekNum % ctaVariations.length];

    const multiLocReportRules = isMultiLocation
      ? `\nEste relatório é CONSOLIDADO de ${uniqueLocations.length} locais. OBRIGATÓRIO:
1. Parágrafo de VISÃO GERAL DA REDE: receita total, receita perdida, ocupação média, no-show médio.
2. COMPARATIVO ENTRE LOCAIS em bullets:
   • Maior vazamento (R$): [local] — R$[valor]
   • Maior no-show (%): [local] — [valor]%
   • Melhor ocupação (%): [local] — [valor]%
3. PLANO DE AÇÃO com 3 tarefas focadas no local com maior vazamento (prioridade).
O relatório deve ter tom de GESTÃO DE REDE, não de clínica individual.`
      : `\nEste relatório é de um LOCAL ESPECÍFICO. Foque no que mais puxou o resultado DESTE local. Use os números da tela (receita, perdida, ocupação, no-show) e conclua com plano coerente com o principal problema deste local.`;

    const systemPrompt = `Você é o sistema de diagnóstico da DAMA, especializado em gestão de clínicas médicas. ${secretaryContext}${multiLocReportRules}

Analise os dados da última semana e gere um relatório estratégico conciso em 3 seções:
1. **👍 O que foi bem:** Destaque 1 ou 2 pontos positivos com números.
2. **⚠️ Pontos de atenção:** Identifique o maior problema da semana com impacto em R$.
3. **🎯 Plano de Ação (3 tarefas):** Ações práticas, adaptáveis e variadas. Para cada ação: o que fazer, tempo estimado e impacto esperado em R$.

${rotationContext}

${isPartial ? "IMPORTANTE: Este é um relatório PARCIAL (" + checkins.length + " de " + workingDaysCount + " dias). Module afirmações — evite conclusões absolutas com dados incompletos. Sinalize a parcialidade no topo." : ""}

REGRAS DE TEXTO:
- Use sempre "você" em vez de "te" (ex: "ajudá-lo" ou "para você", nunca "te ajudar").
- Tom consultivo e profissional, como um conselho de especialista. Nada professoral ou de "curso".
- Prefira verbos como: oferecer, disponibilizar, estruturar, auxiliar, apresentar, implementar.
- Evite gírias e expressões coloquiais como "blindada", "pronto", "montada", "na mão".
- Use expressões como "Uma prática recomendada é…", "Se fizer sentido no seu fluxo…", "Exemplo (adapte):…", "Opção 1 / Opção 2".
- PROIBIDO: repetir fórmulas fixas toda semana. Varie as abordagens.
- Sempre justifique com impacto (R$ ou agenda).
- Se o resultado for crítico (muita perda), use EXATAMENTE esta frase como CTA no final: "${ctaForThisWeek}" — use apenas UMA VEZ no relatório todo, nunca repita CTAs. A menção à DAMA deve ser contextual e sutil, como um convite para conhecer mais.
- Os dados diferenciam pacientes particulares e de convênio. Use isso para insights de mix de receita.
- PROIBIDO: mencionar "IA", "inteligência artificial", "consultor", "script", "roteiro", "copie e cole" ou "mensagem pronta". Tudo é funcionalidade nativa DAMA.
- PROIBIDO: sugerir "cobrança antecipada", "cobrança pré-consulta", "pendências financeiras" ou qualquer forma de cobrança antes do atendimento — isso é vedado pelo CFM e gera mal-entendidos. Substitua por boas práticas de confirmação e organização de agenda.
- O mais importante é consistência; ajuste ao seu fluxo.
- Máximo 400 palavras.
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
          { role: "user", content: `Dados resumidos da semana (${week_start}): ${JSON.stringify(summary)}${comparisonBlock}` },
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro ao gerar relatório");
    }

    const result = await response.json();
    const reportText = (result.choices?.[0]?.message?.content || "") + partialNote;

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
