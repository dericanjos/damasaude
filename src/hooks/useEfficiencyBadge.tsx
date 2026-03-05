import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useEfficiencyBadge() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['efficiency-badge', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('profiles')
        .select('has_efficiency_badge')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.has_efficiency_badge ?? false;
    },
    enabled: !!user,
  });
}

export function useUpdateEfficiencyBadge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (hasBadge: boolean) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ has_efficiency_badge: hasBadge } as any)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efficiency-badge'] });
    },
  });
}
