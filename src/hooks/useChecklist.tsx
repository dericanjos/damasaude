import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { calculateChecklistPoints, isTodayWorkingDay, type ChecklistRecord, CHECKLISTS_TO_UNLOCK_NEXT } from '@/lib/checklist';

/** Get all checklists from DB */
export function useAllChecklists() {
  return useQuery({
    queryKey: ['checklists-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as ChecklistRecord[];
    },
  });
}

/** Get completed checklist IDs in the last 14 days */
function useRecentCompletedIds() {
  const { data: clinic } = useClinic();
  return useQuery({
    queryKey: ['checklist-recent', clinic?.id],
    queryFn: async () => {
      if (!clinic) return [];
      const twoWeeksAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_checklist_answers')
        .select('answers')
        .eq('clinic_id', clinic.id)
        .gte('date', twoWeeksAgo);
      if (error) throw error;
      // Extract checklist_id from answers JSON
      return (data || []).map((d: any) => d.answers?.checklist_id).filter(Boolean) as number[];
    },
    enabled: !!clinic,
  });
}

/** Count total completed checklists per level */
function useCompletedCountByLevel() {
  const { data: clinic } = useClinic();
  return useQuery({
    queryKey: ['checklist-level-counts', clinic?.id],
    queryFn: async () => {
      if (!clinic) return { 1: 0, 2: 0, 3: 0 };
      const { data, error } = await supabase
        .from('daily_checklist_answers')
        .select('answers')
        .eq('clinic_id', clinic.id)
        .eq('completed', true);
      if (error) throw error;
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      (data || []).forEach((d: any) => {
        const level = d.answers?.level;
        if (level && counts[level] !== undefined) counts[level]++;
      });
      return counts;
    },
    enabled: !!clinic,
  });
}

/** Get the max unlocked level */
export function useUnlockedLevel() {
  const { data: counts } = useCompletedCountByLevel();
  const { data: clinic } = useClinic();

  // Also check profile-based level
  const profileLevel = useProfileChecklistLevel();

  if (!counts) return profileLevel;
  
  let calculatedLevel = 1;
  if (counts[2] >= CHECKLISTS_TO_UNLOCK_NEXT) calculatedLevel = 3;
  else if (counts[1] >= CHECKLISTS_TO_UNLOCK_NEXT) calculatedLevel = 2;
  
  return Math.max(calculatedLevel, profileLevel);
}

/** Get checklist_level from profiles table */
function useProfileChecklistLevel(): number {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['profile-checklist-level', user?.id],
    queryFn: async () => {
      if (!user) return 1;
      const { data, error } = await supabase
        .from('profiles')
        .select('checklist_level')
        .eq('user_id', user.id)
        .single();
      if (error) return 1;
      return (data as any)?.checklist_level ?? 1;
    },
    enabled: !!user,
  });
  return data ?? 1;
}

/** Select today's checklist using card-deck logic */
export function useTodayChecklist() {
  const { data: clinic } = useClinic();
  const { data: allChecklists } = useAllChecklists();
  const { data: recentIds } = useRecentCompletedIds();
  const unlockedLevel = useUnlockedLevel();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: existingAnswer } = useQuery({
    queryKey: ['checklist-answer-today', clinic?.id, today],
    queryFn: async () => {
      if (!clinic) return null;
      const { data, error } = await supabase
        .from('daily_checklist_answers')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clinic,
  });

  // Determine if today is a working day
  const workingDays = (clinic as any)?.working_days ?? ['seg', 'ter', 'qua', 'qui', 'sex'];
  const isWorkDay = isTodayWorkingDay(workingDays as string[]);

  // Pick today's checklist
  let todayChecklist: ChecklistRecord | null = null;
  
  if (existingAnswer?.answers?.checklist_id && allChecklists) {
    // Already answered today - find the checklist used
    todayChecklist = allChecklists.find(c => c.id === existingAnswer.answers.checklist_id) || null;
  } else if (allChecklists) {
    // Pick a random one not done in last 2 weeks, at the right level
    const eligible = allChecklists.filter(c => 
      c.level <= unlockedLevel && 
      !(recentIds || []).includes(c.id)
    );
    
    // Separate "Visão Estratégica" — only include if all others at same level have been shown
    const LOW_PRIORITY_CATEGORY = 'Visão Estratégica';
    const filterLowPriority = (pool: ChecklistRecord[]) => {
      const nonStrategic = pool.filter(c => c.category !== LOW_PRIORITY_CATEGORY);
      if (nonStrategic.length > 0) return nonStrategic;
      return pool; // all others shown, allow strategic
    };

    if (eligible.length > 0) {
      const byLevel = eligible.filter(c => c.level === unlockedLevel);
      const pool = byLevel.length > 0 ? byLevel : eligible;
      const finalPool = filterLowPriority(pool);
      const dateHash = today.split('-').reduce((a, b) => a + parseInt(b), 0);
      todayChecklist = finalPool[dateHash % finalPool.length];
    } else {
      const fallback = allChecklists.filter(c => c.level <= unlockedLevel);
      const finalPool = filterLowPriority(fallback);
      const dateHash = today.split('-').reduce((a, b) => a + parseInt(b), 0);
      todayChecklist = finalPool.length > 0 ? finalPool[dateHash % finalPool.length] : null;
    }
  }

  return {
    checklist: todayChecklist,
    existingAnswer,
    isWorkDay,
    unlockedLevel,
  };
}

/** Count checklists completed this week */
export function useWeeklyChecklistCount() {
  const { data: clinic } = useClinic();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['checklist-week-count', clinic?.id, weekStart],
    queryFn: async () => {
      if (!clinic) return 0;
      const { data, error } = await supabase
        .from('daily_checklist_answers')
        .select('id')
        .eq('clinic_id', clinic.id)
        .gte('date', weekStart)
        .lte('date', weekEnd);
      if (error) throw error;
      return data?.length ?? 0;
    },
    enabled: !!clinic,
  });
}

export function useSaveChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  return useMutation({
    mutationFn: async ({ answers, checklist }: { answers: boolean[]; checklist: ChecklistRecord }) => {
      if (!user || !clinic) throw new Error('Not authenticated');
      const today = format(new Date(), 'yyyy-MM-dd');
      const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();

      const { points, completed } = calculateChecklistPoints(answers);

      const items: any[] = [
        { question: checklist.task_1, answered: answers[0] ?? false },
        { question: checklist.task_2, answered: answers[1] ?? false },
        { question: checklist.task_3, answered: answers[2] ?? false },
      ];
      if (checklist.task_4) {
        items.push({ question: checklist.task_4, answered: answers[3] ?? false });
      }

      const answersJson = {
        checklist_id: checklist.id,
        category: checklist.category,
        level: checklist.level,
        items,
      };

      const { data, error } = await supabase
        .from('daily_checklist_answers')
        .upsert({
          clinic_id: clinic.id,
          user_id: user.id,
          date: today,
          day_of_week: dayOfWeek,
          answers: answersJson as any,
          completed,
          points_earned: points,
        }, { onConflict: 'clinic_id,date' })
        .select()
        .single();

      if (error) throw error;

      // Check level progression
      let leveledUp = false;
      if (completed) {
        const currentLevel = checklist.level;
        const { data: completedData } = await supabase
          .from('daily_checklist_answers')
          .select('answers')
          .eq('clinic_id', clinic.id)
          .eq('completed', true);

        const uniqueIds = new Set<number>();
        (completedData || []).forEach((d: any) => {
          const lvl = d.answers?.level;
          const cid = d.answers?.checklist_id;
          if (lvl === currentLevel && cid) uniqueIds.add(cid);
        });

        const threshold = currentLevel === 1 ? 5 : currentLevel === 2 ? 6 : 999;
        if (uniqueIds.size >= threshold && currentLevel < 3) {
          await supabase
            .from('profiles')
            .update({ checklist_level: currentLevel + 1 } as any)
            .eq('user_id', user.id);
          leveledUp = true;
        }
      }

      return { data, points, completed, leveledUp, newLevel: checklist.level + 1 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-answer-today'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-week-count'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-recent'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-level-counts'] });
      queryClient.invalidateQueries({ queryKey: ['profile-checklist-level'] });
    },
  });
}

export function useCheckinStreak() {
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: ['checkin-streak', clinic?.id],
    queryFn: async () => {
      if (!clinic) return 0;

      const dayMap: Record<string, number> = {
        dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
      };
      const workingDays = (clinic as any)?.working_days ?? ['seg', 'ter', 'qua', 'qui', 'sex'];
      const workingDaysSet = new Set<number>();
      for (const day of workingDays) {
        const num = dayMap[day];
        if (num !== undefined) workingDaysSet.add(num);
      }

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date')
        .eq('clinic_id', clinic.id)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      if (!data || data.length === 0) return 0;

      const checkinDates = new Set(data.map(c => c.date));

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      while (true) {
        const weekday = currentDate.getDay();
        if (workingDaysSet.has(weekday)) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          if (checkinDates.has(dateStr)) {
            streak++;
          } else {
            break;
          }
        }
        currentDate.setDate(currentDate.getDate() - 1);
        if (streak > 30) break;
      }

      return streak;
    },
    enabled: !!clinic,
  });
}
