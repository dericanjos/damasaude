import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Protocol {
  id: string;
  user_id: string;
  name: string;
  description: string;
  default_value: number;
  is_active: boolean;
  created_at: string;
}

export interface CheckinProtocol {
  id: string;
  checkin_id: string;
  protocol_id: string | null;
  name: string;
  description: string;
  value: number;
  created_at: string;
}

export interface ProtocolEntry {
  protocol_id: string | null;
  name: string;
  description: string;
  value: number;
}

export function useProtocols() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['protocols', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('protocols')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return (data || []) as Protocol[];
    },
    enabled: !!user,
  });
}

export function useActiveProtocols() {
  const { data: all = [] } = useProtocols();
  return all.filter(p => p.is_active);
}

export function useCreateProtocol() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (protocol: { name: string; description?: string; default_value: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('protocols')
        .insert({
          user_id: user.id,
          name: protocol.name,
          description: protocol.description || '',
          default_value: protocol.default_value,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
    },
  });
}

export function useUpdateProtocol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; default_value?: number; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('protocols')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
    },
  });
}

export function useCheckinProtocols(checkinId?: string) {
  return useQuery({
    queryKey: ['checkin-protocols', checkinId],
    queryFn: async () => {
      if (!checkinId) return [];
      const { data, error } = await supabase
        .from('checkin_protocols')
        .select('*')
        .eq('checkin_id', checkinId);
      if (error) throw error;
      return (data || []) as CheckinProtocol[];
    },
    enabled: !!checkinId,
  });
}

export function useSaveCheckinProtocols() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ checkinId, protocols }: { checkinId: string; protocols: ProtocolEntry[] }) => {
      // Delete existing protocols for this checkin
      await supabase.from('checkin_protocols').delete().eq('checkin_id', checkinId);

      if (protocols.length === 0) return [];

      const rows = protocols.map(p => ({
        checkin_id: checkinId,
        protocol_id: p.protocol_id,
        name: p.name,
        description: p.description || '',
        value: p.value,
      }));

      const { data, error } = await supabase
        .from('checkin_protocols')
        .insert(rows as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checkin-protocols', variables.checkinId] });
      queryClient.invalidateQueries({ queryKey: ['checkin-protocols-today'] });
    },
  });
}

/** Fetch total protocol revenue for today's checkins */
export function useTodayProtocolRevenue(checkinIds: string[]) {
  return useQuery({
    queryKey: ['checkin-protocols-today', checkinIds],
    queryFn: async () => {
      if (checkinIds.length === 0) return 0;
      const { data, error } = await supabase
        .from('checkin_protocols')
        .select('value')
        .in('checkin_id', checkinIds);
      if (error) throw error;
      return (data || []).reduce((sum, p) => sum + Number(p.value), 0);
    },
    enabled: checkinIds.length > 0,
  });
}
