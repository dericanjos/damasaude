import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { format, subDays } from 'date-fns';

interface TrendData {
  type: 'no_show' | 'cancellations' | 'empty_slots';
  label: string;
  current: number;
  previous: number;
  percentChange: number;
}

interface LossRadarResult {
  totalLosses7d: number;
  revenueLost7d: number;
  trends: TrendData[];
  worstTrend: TrendData | null;
}

export function useLossRadar() {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ['loss-radar', clinic?.id],
    queryFn: async (): Promise<LossRadarResult | null> => {
      if (!clinic) return null;

      const today = new Date();
      const d7 = format(subDays(today, 7), 'yyyy-MM-dd');
      const d14 = format(subDays(today, 14), 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch last 14 days of checkins
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date, no_show, cancellations, empty_slots')
        .eq('clinic_id', clinic.id)
        .gte('date', d14)
        .lte('date', todayStr)
        .order('date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const current = data.filter(d => d.date >= d7);
      const previous = data.filter(d => d.date < d7);

      const sum = (arr: typeof data, key: 'no_show' | 'cancellations' | 'empty_slots') =>
        arr.reduce((acc, r) => acc + (r[key] ?? 0), 0);

      const ticket = (clinic as any).ticket_medio ?? 250;

      const noShowCurr = sum(current, 'no_show');
      const noShowPrev = sum(previous, 'no_show');
      const cancCurr = sum(current, 'cancellations');
      const cancPrev = sum(previous, 'cancellations');
      const emptyCurr = sum(current, 'empty_slots');
      const emptyPrev = sum(previous, 'empty_slots');

      const totalLosses7d = noShowCurr + cancCurr + emptyCurr;
      const revenueLost7d = totalLosses7d * ticket;

      const calcChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
      };

      const trends: TrendData[] = [
        { type: 'no_show', label: 'No-shows', current: noShowCurr, previous: noShowPrev, percentChange: calcChange(noShowCurr, noShowPrev) },
        { type: 'cancellations', label: 'Cancelamentos', current: cancCurr, previous: cancPrev, percentChange: calcChange(cancCurr, cancPrev) },
        { type: 'empty_slots', label: 'Buracos na agenda', current: emptyCurr, previous: emptyPrev, percentChange: calcChange(emptyCurr, emptyPrev) },
      ];

      // Worst trend = biggest increase of 30%+ 
      const negativeTrends = trends
        .filter(t => t.percentChange >= 30 && t.current > 0)
        .sort((a, b) => b.percentChange - a.percentChange);

      return {
        totalLosses7d,
        revenueLost7d,
        trends,
        worstTrend: negativeTrends[0] ?? null,
      };
    },
    enabled: !!clinic,
    staleTime: 5 * 60 * 1000,
  });
}
