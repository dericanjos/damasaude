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
    // ── Auth check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { checkins, type, has_secretary } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const secretaryContext = has_secretary
      ? "O médico TEM secretária. Adapte suas sugestões para incluir delegação de tarefas operacionais à secretária (ex: 'Peça à secretária para...', 'Oriente sua secretária a...')."
      : "O médico NÃO tem secretária. Sugira automação, uso de WhatsApp Business e ações diretas que o próprio médico pode executar rapidamente.";

    const textRules = `REGRAS DE TEXTO OBRIGATÓRIAS:
- PROIBIDO: mencionar "script", "roteiro", "copie e cole", "mensagem pronta", "IA", "inteligência artificial", "consultor".
- PROIBIDO: sugerir "cobrança antecipada", "cobrança pré-consulta" ou "pendências financeiras" — isso é vedado pelo CFM e pode gerar mal-entendidos.
- Substitua por: "comunicação", "abordagem", "rotina", "padrão de atendimento", "boas práticas de confirmação".
- Use sempre "você" em vez de "te". Tom consultivo e profissional.
- Prefira verbos: oferecer, disponibilizar, estruturar, auxiliar, implementar.`;

    let systemPrompt: string;
    let userPrompt: string;
    let model: string;
    let maxTokens: number;

    if (type === "micro") {
      // Insight rápido pós-checkin diário — usa Haiku (rápido e barato)
      model = "claude-haiku-4-5-20251001";
      maxTokens = 200;
      systemPrompt =
        `Você é um especialista em gestão para clínicas médicas. Seja direto e prático. ${secretaryContext} ${textRules} Responda APENAS em português brasileiro.`;
      userPrompt = `Analise este check-in diário e retorne UMA observação rápida e acionável em no máximo 1 frase curta. Dados do check-in: ${JSON.stringify(checkins)}`;
    } else {
      // Análise semanal mais profunda — usa Sonnet (qualidade superior)
      model = "claude-sonnet-4-5-20250929";
      maxTokens = 800;
      systemPrompt =
        `Você é um especialista em gestão para clínicas médicas. ${secretaryContext} ${textRules} Analise os dados e retorne um resumo em 3 parágrafos (no máximo 150 palavras total) com: 1) Um diagnóstico da semana, 2) O principal ponto de melhoria, e 3) Uma recomendação acionável. Use um tom profissional e direto. Responda APENAS em português brasileiro.`;
      userPrompt = `Dados dos check-ins da semana: ${JSON.stringify(checkins)}`;
    }

    // ── Chamada para Anthropic API ──
    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [
            { role: "user", content: userPrompt },
          ],
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
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Configuração de IA inválida. Contate o suporte." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar insight" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    // Anthropic retorna content como array de blocks [{type:"text", text:"..."}]
    const content = result.content?.[0]?.text || "";

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
