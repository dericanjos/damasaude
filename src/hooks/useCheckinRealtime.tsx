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
          queryClient.invalidateQueries({ queryKey: ['today-checkins'] });
          queryClient.invalidateQueries({ queryKey: ['loss-radar'] });
          queryClient.invalidateQueries({ queryKey: ['insights'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
