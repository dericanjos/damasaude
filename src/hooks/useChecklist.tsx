import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format } from 'date-fns';
import { getTodayCategory, calculateChecklistPoints } from '@/lib/checklist';

export function useTodayChecklist() {
  const { data: clinic } = useClinic();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['checklist', clinic?.id, today],
    queryFn: async () => {
      if (!clinic) return null;
      const { data, error } = await supabase
        .from('daily_checklist_answers' as any)
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clinic,
  });
}

export function useSaveChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  return useMutation({
    mutationFn: async (answers: boolean[]) => {
      if (!user || !clinic) throw new Error('Not authenticated');
      const today = format(new Date(), 'yyyy-MM-dd');
      const category = getTodayCategory();
      if (!category) throw new Error('No checklist for today');

      const { points, completed } = calculateChecklistPoints(answers);
      const dayOfWeek = category.dayOfWeek;

      const answersJson = category.items.map((item, i) => ({
        question: item.question,
        answered: answers[i] ?? false,
      }));

      const { data, error } = await supabase
        .from('daily_checklist_answers' as any)
        .upsert({
          clinic_id: clinic.id,
          user_id: user.id,
          date: today,
          day_of_week: dayOfWeek,
          answers: answersJson,
          completed,
          points_earned: points,
        } as any, { onConflict: 'clinic_id,date' })
        .select()
        .single();

      if (error) throw error;
      return { data, points, completed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
    },
  });
}

export function useCheckinStreak() {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ['checkin-streak', clinic?.id],
    queryFn: async () => {
      if (!clinic) return 0;
      // Fetch last 30 checkins ordered by date desc
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date')
        .eq('clinic_id', clinic.id)
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      if (!data || data.length === 0) return 0;

      // Count consecutive days from today backwards
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < data.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedStr = format(expectedDate, 'yyyy-MM-dd');

        if (data[i].date === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    },
    enabled: !!clinic,
  });
}
