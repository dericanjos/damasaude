import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useOnboardingStatus() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { error: createProfileError } = await supabase.from('profiles').upsert(
          {
            user_id: user.id,
            onboarding_completed: false,
          } as any,
          { onConflict: 'user_id' }
        );

        if (createProfileError) throw createProfileError;
        return false;
      }

      return (data as any).onboarding_completed ?? false;
    },
    enabled: !loading && !!user,
  });
}
