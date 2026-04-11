import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Subscribes to realtime changes on daily_checkins (scoped to current user)
 * and invalidates all related queries so the Dashboard updates automatically.
 */
export function useCheckinRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`checkin-realtime-${user.id}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_checkins',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['checkin'] });
          queryClient.invalidateQueries({ queryKey: ['checkins-today-all'] });
          queryClient.invalidateQueries({ queryKey: ['checkin-last'] });
          queryClient.invalidateQueries({ queryKey: ['checkins-week'] });
          queryClient.invalidateQueries({ queryKey: ['checkins-all'] });
          queryClient.invalidateQueries({ queryKey: ['checkins-range'] });
          queryClient.invalidateQueries({ queryKey: ['loss-radar'] });
          queryClient.invalidateQueries({ queryKey: ['last7-checkins'] });
          queryClient.invalidateQueries({ queryKey: ['monthly-checkins'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);
}
