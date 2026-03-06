import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { checkins, type, has_secretary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const secretaryContext = has_secretary
      ? "O médico TEM secretária. Adapte suas sugestões para incluir delegação de tarefas operacionais à secretária (ex: 'Peça à secretária para...', 'Oriente sua secretária a...')."
      : "O médico NÃO tem secretária. Sugira automação, uso de WhatsApp Business e ações diretas que o próprio médico pode executar rapidamente.";

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "micro") {
      systemPrompt =
        `Você é um consultor de gestão para clínicas médicas. Seja direto e prático. ${secretaryContext} Responda APENAS em português brasileiro.`;
      userPrompt = `Analise este check-in diário e retorne UMA observação rápida e acionável em no máximo 1 frase curta. Dados do check-in: ${JSON.stringify(checkins)}`;
    } else {
      systemPrompt =
        `Você é um consultor de gestão para clínicas médicas. ${secretaryContext} Analise os dados e retorne um resumo em 3 parágrafos (no máximo 150 palavras total) com: 1) Um diagnóstico da semana, 2) O principal ponto de melhoria, e 3) Uma recomendação acionável. Use um tom profissional e direto. Responda APENAS em português brasileiro.`;
      userPrompt = `Dados dos check-ins da semana: ${JSON.stringify(checkins)}`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar insight" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ insight: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
