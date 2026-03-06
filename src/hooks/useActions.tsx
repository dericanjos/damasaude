import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format } from 'date-fns';
import { generateActions, calculateIDEA, type CheckinData } from '@/lib/idea';

export function useTodayActions() {
  const { data: clinic } = useClinic();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['actions', clinic?.id, today],
    queryFn: async () => {
      if (!clinic) return [];
      const { data, error } = await supabase
        .from('daily_actions')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', today)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinic,
  });
}

export function useGenerateActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  return useMutation({
    mutationFn: async (checkinData: CheckinData) => {
      if (!user || !clinic) throw new Error('Not authenticated');
      const today = format(new Date(), 'yyyy-MM-dd');

      // Delete existing actions for today
      await supabase
        .from('daily_actions')
        .delete()
        .eq('clinic_id', clinic.id)
        .eq('date', today);

      const ideaScore = calculateIDEA(checkinData);
      const hasSecretary = (clinic as any)?.has_secretary ?? false;
      const actions = generateActions(checkinData, clinic.target_noshow_rate, ideaScore, hasSecretary);

      const { data, error } = await supabase
        .from('daily_actions')
        .insert(actions.map(a => ({
          clinic_id: clinic.id,
          user_id: user.id,
          date: today,
          action_type: a.action_type,
          title: a.title,
          description: a.description,
          status: 'pending' as const,
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useCompleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('daily_actions')
        .update({ status: 'done' as const, done_at: new Date().toISOString() })
        .eq('id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}
