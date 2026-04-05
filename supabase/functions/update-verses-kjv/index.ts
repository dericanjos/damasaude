import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify user is authenticated and is a founder
    const authHeader = req.headers.get("Authorization");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Check founder tier
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("tier")
        .eq("user_id", user.id)
        .single();
      if (profile?.tier !== "founder") {
        return new Response(JSON.stringify({ error: "Apenas founders podem executar esta ação" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all verses ordered by day_of_year
    const { data: verses, error: fetchError } = await adminClient
      .from("daily_verses")
      .select("*")
      .order("day_of_year", { ascending: true });

    if (fetchError) throw fetchError;
    if (!verses || verses.length === 0) {
      return new Response(JSON.stringify({ updated: 0, replaced: 0, errors: ["Nenhum versículo encontrado"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let replaced = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (verse) => {
        try {
          const prompt = `Você é um especialista em Bíblia e no universo médico. Dado o versículo "${verse.verse_reference}", forneça o texto na tradução Almeida King James Atualizada (KJA) em português. SE esse versículo NÃO tiver relação clara com o universo médico (cuidado, cura, saúde, compaixão, liderança, sabedoria, excelência, propósito, trabalho, servir ao próximo, descanso, perseverança, renovação de forças), SUBSTITUA por outro versículo do MESMO LIVRO bíblico que tenha essa conexão, usando a tradução KJA. Retorne APENAS o JSON, sem markdown: { "text": "texto do versículo", "reference": "Livro X:Y" }`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: "Você retorna APENAS JSON válido, sem blocos de código markdown. Formato: {\"text\": \"...\", \"reference\": \"...\"}",
                },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            errors.push(`Dia ${verse.day_of_year}: AI error ${aiResponse.status} - ${errText.slice(0, 100)}`);
            return;
          }

          const aiData = await aiResponse.json();
          const rawContent = aiData.choices?.[0]?.message?.content?.trim();
          if (!rawContent) {
            errors.push(`Dia ${verse.day_of_year}: resposta vazia da IA`);
            return;
          }

          // Clean markdown code blocks if present
          let jsonStr = rawContent;
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
          }

          let parsed: { text: string; reference: string };
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            errors.push(`Dia ${verse.day_of_year}: JSON inválido - ${jsonStr.slice(0, 80)}`);
            return;
          }

          if (!parsed.text || !parsed.reference) {
            errors.push(`Dia ${verse.day_of_year}: campos faltando`);
            return;
          }

          const referenceChanged = parsed.reference.trim() !== verse.verse_reference.trim();

          const { error: updateError } = await adminClient
            .from("daily_verses")
            .update({
              verse_text: parsed.text,
              verse_reference: parsed.reference,
            })
            .eq("day_of_year", verse.day_of_year);

          if (updateError) {
            errors.push(`Dia ${verse.day_of_year}: update error - ${updateError.message}`);
            return;
          }

          updated++;
          if (referenceChanged) replaced++;
        } catch (err: any) {
          errors.push(`Dia ${verse.day_of_year}: ${err.message}`);
        }
      });

      await Promise.all(promises);

      // Delay between batches (except last)
      if (i + BATCH_SIZE < verses.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return new Response(
      JSON.stringify({ updated, replaced, errors, total: verses.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("update-verses error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
