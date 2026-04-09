import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';

export interface Location {
  id: string;
  user_id: string;
  clinic_id: string | null;
  name: string;
  address: string;
  timezone: string;
  is_active: boolean;
  has_secretary: boolean;
  num_doctors: number;
  created_at: string;
}

export interface LocationSchedule {
  id: string;
  user_id: string;
  location_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  daily_capacity: number;
  is_active: boolean;
}

export interface LocationFinancial {
  id: string;
  user_id: string;
  location_id: string;
  ticket_avg: number;
  ticket_private: number;
  ticket_insurance: number;
  notes: string | null;
}

export function useLocations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['locations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Location[];
    },
    enabled: !!user,
  });
}

export function useActiveLocations() {
  const { data: locations = [] } = useLocations();
  return locations.filter(l => l.is_active);
}

export function useLocationSchedules(locationId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['location-schedules', locationId],
    queryFn: async () => {
      if (!user || !locationId) return [];
      const { data, error } = await supabase
        .from('location_schedules')
        .select('*')
        .eq('location_id', locationId)
        .order('weekday', { ascending: true });
      if (error) throw error;
      return (data || []) as LocationSchedule[];
    },
    enabled: !!user && !!locationId,
  });
}

export function useAllLocationSchedules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['location-schedules-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('location_schedules')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as LocationSchedule[];
    },
    enabled: !!user,
  });
}

export function useLocationFinancial(locationId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['location-financial', locationId],
    queryFn: async () => {
      if (!user || !locationId) return null;
      const { data, error } = await supabase
        .from('location_financials')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      return data as LocationFinancial | null;
    },
    enabled: !!user && !!locationId,
  });
}

export function useAllLocationFinancials() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['location-financials-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('location_financials')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as LocationFinancial[];
    },
    enabled: !!user,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      address: string;
      timezone?: string;
      ticket_avg?: number;
      ticket_private?: number;
      ticket_insurance?: number;
      has_secretary?: boolean;
      schedules?: { weekday: number; start_time: string; end_time: string; daily_capacity: number }[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Create location
      const { data: loc, error: locError } = await supabase
        .from('locations')
        .insert({
          user_id: user.id,
          clinic_id: clinic?.id || null,
          name: input.name,
          address: input.address,
          timezone: input.timezone || 'America/Sao_Paulo',
          has_secretary: input.has_secretary ?? false,
        } as any)
        .select()
        .single();
      if (locError) throw locError;

      try {
        // Create financial
        const { error: finError } = await supabase
          .from('location_financials')
          .insert({
            user_id: user.id,
            location_id: loc.id,
            ticket_avg: input.ticket_avg || 250,
            ticket_private: input.ticket_private || 250,
            ticket_insurance: input.ticket_insurance || 100,
          } as any);
        if (finError) throw finError;

        // Create schedules
        if (input.schedules && input.schedules.length > 0) {
          const { error: schedError } = await supabase
            .from('location_schedules')
            .insert(input.schedules.map(s => ({
              user_id: user.id,
              location_id: loc.id,
              weekday: s.weekday,
              start_time: s.start_time,
              end_time: s.end_time,
              daily_capacity: s.daily_capacity,
            })) as any);
          if (schedError) throw schedError;
        }
      } catch (err) {
        // Rollback: delete the orphan location
        await supabase.from('locations').delete().eq('id', loc.id);
        throw err;
      }

      return loc as Location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['location-financial'] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      address?: string;
      timezone?: string;
      is_active?: boolean;
      has_secretary?: boolean;
      ticket_avg?: number;
      ticket_private?: number;
      ticket_insurance?: number;
      schedules?: { weekday: number; start_time: string; end_time: string; daily_capacity: number }[];
    }) => {
      const { id, ticket_avg, ticket_private, ticket_insurance, schedules, ...updates } = input;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('locations')
          .update(updates as any)
          .eq('id', id);
        if (error) throw error;
      }

      if (ticket_avg !== undefined || ticket_private !== undefined || ticket_insurance !== undefined) {
        const finUpdate: any = {};
        if (ticket_avg !== undefined) finUpdate.ticket_avg = ticket_avg;
        if (ticket_private !== undefined) finUpdate.ticket_private = ticket_private;
        if (ticket_insurance !== undefined) finUpdate.ticket_insurance = ticket_insurance;
        const { error } = await supabase
          .from('location_financials')
          .update(finUpdate)
          .eq('location_id', id);
        if (error) throw error;
      }

      if (schedules) {
        // Get user_id from the location
        const { data: loc } = await supabase
          .from('locations')
          .select('user_id')
          .eq('id', id)
          .single();
        if (!loc) throw new Error('Location not found');

        // Delete existing schedules
        await supabase
          .from('location_schedules')
          .delete()
          .eq('location_id', id);

        if (schedules.length > 0) {
          const { error } = await supabase
            .from('location_schedules')
            .insert(schedules.map(s => ({
              user_id: (loc as any).user_id,
              location_id: id,
              weekday: s.weekday,
              start_time: s.start_time,
              end_time: s.end_time,
              daily_capacity: s.daily_capacity,
            })) as any);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['location-financial'] });
    },
  });
}

/** Get today's locations based on schedules */
export function useTodayLocations() {
  const { data: locations = [] } = useLocations();
  const { data: allSchedules = [] } = useAllLocationSchedules();
  const todayWeekday = new Date().getDay(); // 0=Sunday

  const activeLocations = locations.filter(l => l.is_active);
  const todayLocationIds = allSchedules
    .filter(s => s.weekday === todayWeekday && s.is_active)
    .map(s => s.location_id);

  const todayLocs = activeLocations.filter(l => todayLocationIds.includes(l.id));
  return { todayLocations: todayLocs, allLocations: activeLocations };
}

/** Get capacity for a location on a specific weekday */
export function getLocationCapacity(schedules: LocationSchedule[], weekday: number): number {
  const sched = schedules.find(s => s.weekday === weekday && s.is_active);
  return sched?.daily_capacity ?? 16;
}
