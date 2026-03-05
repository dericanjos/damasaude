import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useOnboardingStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user) return true; // assume completed if no user
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.onboarding_completed ?? false;
    },
    enabled: !!user,
  });
}
