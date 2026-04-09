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
    // ── Auth check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if we already have news for today (avoid duplicates)
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("medical_news")
      .select("*", { count: "exact", head: true })
      .gte("published_at", `${today}T00:00:00`)
      .lte("published_at", `${today}T23:59:59`);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ message: "News already generated for today", count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Gere 3 notícias médicas REAIS e ATUAIS do Brasil com data de hoje (${today}). Cada notícia deve ter:
- title: manchete concisa (máximo 80 caracteres)
- summary: resumo informativo (máximo 150 caracteres)  
- source: fonte real (ex: CFM, CRM, Ministério da Saúde, Anvisa, ANS, CBHPM)
- category: uma dessas categorias EXATAS: "Legislação", "Tecnologia", "Mercado", "Telemedicina", "Pesquisa"
- external_url: URL plausível da fonte (pode ser genérico como https://portal.cfm.org.br)

Foque em temas relevantes para médicos brasileiros:
- Novas resoluções do CFM ou CRM
- Regulamentação de telemedicina
- Mudanças em planos de saúde e tabelas
- Tecnologia médica e prontuário eletrônico
- Gestão de clínicas e consultórios

Retorne APENAS um JSON válido, sem markdown, sem explicações. Formato:
[{"title":"...","summary":"...","source":"...","category":"...","external_url":"..."}]`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um jornalista especializado em saúde e medicina no Brasil. Gere notícias verossímeis, baseadas em tendências reais do setor médico brasileiro. Responda APENAS com JSON válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    let rawContent = aiResult.choices?.[0]?.message?.content || "";

    // Clean markdown fences if present
    rawContent = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let newsItems: Array<{
      title: string;
      summary: string;
      source: string;
      category: string;
      external_url: string;
    }>;

    try {
      newsItems = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("AI returned invalid JSON");
    }

    if (!Array.isArray(newsItems) || newsItems.length === 0) {
      throw new Error("AI returned empty or non-array result");
    }

    // Insert news items
    const toInsert = newsItems.slice(0, 3).map((item) => ({
      title: (item.title || "").slice(0, 120),
      summary: (item.summary || "").slice(0, 200),
      source: item.source || "Fonte médica",
      category: item.category || "Mercado",
      external_url: item.external_url || "https://portal.cfm.org.br",
      is_active: true,
      published_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("medical_news")
      .insert(toInsert);

    if (insertError) throw insertError;

    // Deactivate news older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase
      .from("medical_news")
      .update({ is_active: false })
      .lt("published_at", thirtyDaysAgo.toISOString());

    console.log(`Successfully generated ${toInsert.length} medical news items`);

    return new Response(
      JSON.stringify({ success: true, count: toInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-medical-news error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
