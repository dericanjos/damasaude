import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, has_efficiency_badge');
    
    if (profilesError) throw profilesError;

    const results: { userId: string; action: string }[] = [];

    for (const profile of (profiles || [])) {
      // Get user's clinic
      const { data: clinic } = await supabase
        .from('clinics')
        .select('id, daily_capacity, ticket_medio, working_days')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (!clinic) continue;

      const capacity = clinic.daily_capacity ?? 16;
      const ticket = clinic.ticket_medio ?? 250;

      // Get last 30 working-day checkins
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('no_show, cancellations, empty_slots, followup_done')
        .eq('clinic_id', clinic.id)
        .order('date', { ascending: false })
        .limit(30);

      if (!checkins || checkins.length < 5) continue; // Need minimum data

      // Calculate average IDEA score
      const revenuePotential = capacity * ticket;
      let totalScore = 0;
      for (const c of checkins) {
        const lost = ((c.no_show ?? 0) + (c.cancellations ?? 0) + (c.empty_slots ?? 0)) * ticket;
        const penalty = (lost / revenuePotential) * 100;
        const bonus = c.followup_done ? 5 : 0;
        const score = Math.max(0, Math.min(100, Math.round(100 - penalty + bonus)));
        totalScore += score;
      }
      const avgScore = totalScore / checkins.length;

      const hasBadge = profile.has_efficiency_badge ?? false;

      if (!hasBadge && avgScore >= 80) {
        // Award badge
        await supabase
          .from('profiles')
          .update({ has_efficiency_badge: true })
          .eq('user_id', profile.user_id);
        results.push({ userId: profile.user_id, action: 'awarded' });
      } else if (hasBadge && avgScore < 75) {
        // Remove badge
        await supabase
          .from('profiles')
          .update({ has_efficiency_badge: false })
          .eq('user_id', profile.user_id);
        results.push({ userId: profile.user_id, action: 'removed' });
      }
    }

    return new Response(JSON.stringify({ processed: profiles?.length ?? 0, changes: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
