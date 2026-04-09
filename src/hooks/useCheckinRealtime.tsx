import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on daily_checkins and invalidates
 * all related queries so the Dashboard updates automatically.
 */
export function useCheckinRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('checkin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_checkins' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['checkin'] });
          queryClient.invalidateQueries({ queryKey: ['checkins-today-all'] });
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
  }, [queryClient]);
}
