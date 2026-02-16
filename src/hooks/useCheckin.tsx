import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export function useTodayCheckin() {
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['checkin', clinic?.id, today],
    queryFn: async () => {
      if (!clinic) return null;
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinic,
  });
}

export function useYesterdayCheckin() {
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['checkin', clinic?.id, yesterday],
    queryFn: async () => {
      if (!clinic) return null;
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', yesterday)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinic,
  });
}

export function useWeekCheckins(weekStart?: Date) {
  const { data: clinic } = useClinic();
  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ['checkins-week', clinic?.id, format(start, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!clinic) return [];
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinic,
  });
}

export function useSaveCheckin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  return useMutation({
    mutationFn: async (checkin: {
      appointments_scheduled: number;
      appointments_done: number;
      no_show: number;
      cancellations: number;
      new_appointments: number;
      empty_slots: number;
      followup_done: boolean;
      notes?: string;
    }) => {
      if (!user || !clinic) throw new Error('Not authenticated');
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('daily_checkins')
        .upsert({
          clinic_id: clinic.id,
          user_id: user.id,
          date: today,
          ...checkin,
        }, { onConflict: 'clinic_id,date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-week'] });
    },
  });
}
