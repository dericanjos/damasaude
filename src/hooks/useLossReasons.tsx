import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export function useWeekLossReasons(weekStart?: Date) {
  const { data: clinic } = useClinic();
  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ['loss-reasons', clinic?.id, format(start, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!clinic) return [];
      const { data, error } = await supabase
        .from('loss_reasons')
        .select('*')
        .eq('clinic_id', clinic.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinic,
  });
}

export function useAddLossReason() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  return useMutation({
    mutationFn: async (reason: { type: string; reason: string; count?: number }) => {
      if (!user || !clinic) throw new Error('Not authenticated');
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('loss_reasons')
        .insert({
          clinic_id: clinic.id,
          user_id: user.id,
          date: today,
          type: reason.type,
          reason: reason.reason,
          count: reason.count || 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loss-reasons'] });
    },
  });
}
