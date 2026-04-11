import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export function useTodayCheckin(locationId?: string) {
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['checkin', clinic?.id, today, locationId || 'any'],
    queryFn: async () => {
      if (!clinic || !locationId) return null;

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', today)
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinic,
  });
}

export function useTodayCheckins() {
  const { data: clinic } = useClinic();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['checkins-today-all', clinic?.id, today],
    queryFn: async () => {
      if (!clinic) return [];
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinic,
  });
}

export function useYesterdayCheckin(locationId?: string) {
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['checkin', clinic?.id, yesterday, locationId || 'any'],
    queryFn: async () => {
      if (!clinic || !locationId) return null;

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', yesterday)
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinic,
  });
}

export function useLastCheckin(locationId?: string) {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ['checkin-last', clinic?.id, locationId || 'any'],
    queryFn: async () => {
      if (!clinic) return null;
      let query = supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('date', { ascending: false })
        .limit(1);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinic,
  });
}

export function useWeekCheckins(weekStart?: Date, locationId?: string | null) {
  const { data: clinic } = useClinic();
  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ['checkins-week', clinic?.id, format(start, 'yyyy-MM-dd'), locationId || 'all'],
    queryFn: async () => {
      if (!clinic) return [];
      let query = supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinic,
  });
}

export function useCheckinRange(startDate: string, endDate: string, locationId?: string | null) {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ['checkins-range', clinic?.id, startDate, endDate, locationId || 'all'],
    queryFn: async () => {
      if (!clinic) return [];
      let query = supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinic && !!startDate && !!endDate,
  });
}

export function useAllCheckins(locationId?: string | null) {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ['checkins-all', clinic?.id, locationId || 'all'],
    queryFn: async () => {
      if (!clinic) return [];
      let query = supabase
        .from('daily_checkins')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
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
      location_id: string;
      appointments_scheduled: number;
      attended_private: number;
      attended_insurance: number;
      noshows_private: number;
      noshows_insurance: number;
      appointments_done: number;
      no_show: number;
      cancellations: number;
      cancellations_private?: number;
      cancellations_insurance?: number;
      new_appointments: number;
      empty_slots: number;
      extra_appointments?: number;
      rescheduled?: number;
      followup_done: boolean;
      notes?: string;
      insight_text?: string;
    }) => {
      if (!user || !clinic) throw new Error('Not authenticated');
      if (!checkin.location_id) {
        throw new Error('Location ID é obrigatório para salvar o check-in.');
      }
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('daily_checkins')
        .upsert({
          clinic_id: clinic.id,
          user_id: user.id,
          date: today,
          ...checkin,
        } as any, { onConflict: 'clinic_id,date,location_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-week'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-today-all'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-all'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-range'] });
      queryClient.invalidateQueries({ queryKey: ['checkin-last'] });
      queryClient.invalidateQueries({ queryKey: ['last7-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['loss-radar'] });
    },
  });
}
