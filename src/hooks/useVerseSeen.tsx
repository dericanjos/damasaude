import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export function useHasSeenVerseToday() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: hasSeen, isLoading } = useQuery({
    queryKey: ['verse-seen', user?.id, today],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('verse_views' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('seen_date', today)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });

  return { hasSeen: hasSeen ?? false, isLoading };
}

export function useMarkVerseSeen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('verse_views' as any)
        .upsert(
          { user_id: user.id, seen_date: today } as any,
          { onConflict: 'user_id,seen_date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse-seen'] });
    },
  });
}
