import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useGenerateInsight() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (checkins: any[], type: 'weekly' | 'micro' = 'weekly', hasSecretary = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-insights', {
        body: { checkins, type, has_secretary: hasSecretary },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setInsight(data.insight);
      return data.insight as string;
    } catch (e: any) {
      const msg = e?.message || 'Erro ao gerar insight';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, insight, loading, error };
}
