import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format, subDays } from 'date-fns';

const ANJOS_NAME = 'Anjos Clinic';
const HSL_NAME = 'Hospital São Lucas';

const ANJOS_FINANCIALS = { ticket_avg: 250, ticket_private: 500, ticket_insurance: 120 };
const HSL_FINANCIALS = { ticket_avg: 300, ticket_private: 700, ticket_insurance: 150 };

const TODAY_ANJOS = {
  appointments_scheduled: 14,
  attended_private: 6,
  attended_insurance: 4,
  noshows_private: 2,
  noshows_insurance: 1,
  cancellations_private: 1,
  cancellations_insurance: 0,
  cancellations: 1,
  empty_slots: 2,
  followup_done: false,
  new_appointments: 2,
  appointments_done: 10,
  no_show: 3,
  extra_appointments: 0,
  rescheduled: 0,
};

const TODAY_HSL = {
  appointments_scheduled: 12,
  attended_private: 3,
  attended_insurance: 6,
  noshows_private: 0,
  noshows_insurance: 2,
  cancellations_private: 1,
  cancellations_insurance: 0,
  cancellations: 1,
  empty_slots: 0,
  followup_done: true,
  new_appointments: 1,
  appointments_done: 9,
  no_show: 2,
  extra_appointments: 0,
  rescheduled: 0,
};

// Week data: 5 past days per location (different patterns)
function buildWeekData(today: Date) {
  const days: { offset: number; anjos: typeof TODAY_ANJOS; hsl: typeof TODAY_HSL }[] = [];

  // Day -6 (Anjos: high no-show, HSL: high cancel)
  days.push({
    offset: 6,
    anjos: {
      appointments_scheduled: 15, attended_private: 5, attended_insurance: 3,
      noshows_private: 3, noshows_insurance: 2, cancellations_private: 1, cancellations_insurance: 0,
      cancellations: 1, empty_slots: 1, followup_done: false, new_appointments: 1,
      appointments_done: 8, no_show: 5, extra_appointments: 0, rescheduled: 0,
    },
    hsl: {
      appointments_scheduled: 12, attended_private: 4, attended_insurance: 4,
      noshows_private: 0, noshows_insurance: 1, cancellations_private: 2, cancellations_insurance: 1,
      cancellations: 3, empty_slots: 0, followup_done: true, new_appointments: 1,
      appointments_done: 8, no_show: 1, extra_appointments: 0, rescheduled: 0,
    },
  });

  // Day -5 (Anjos: high no-show, HSL: moderate)
  days.push({
    offset: 5,
    anjos: {
      appointments_scheduled: 16, attended_private: 6, attended_insurance: 3,
      noshows_private: 3, noshows_insurance: 1, cancellations_private: 1, cancellations_insurance: 0,
      cancellations: 1, empty_slots: 2, followup_done: true, new_appointments: 3,
      appointments_done: 9, no_show: 4, extra_appointments: 0, rescheduled: 0,
    },
    hsl: {
      appointments_scheduled: 11, attended_private: 3, attended_insurance: 5,
      noshows_private: 1, noshows_insurance: 0, cancellations_private: 1, cancellations_insurance: 1,
      cancellations: 2, empty_slots: 0, followup_done: false, new_appointments: 2,
      appointments_done: 8, no_show: 1, extra_appointments: 0, rescheduled: 0,
    },
  });

  // Day -4 (Anjos: buracos high, HSL: high cancel)
  days.push({
    offset: 4,
    anjos: {
      appointments_scheduled: 14, attended_private: 5, attended_insurance: 4,
      noshows_private: 1, noshows_insurance: 0, cancellations_private: 0, cancellations_insurance: 0,
      cancellations: 0, empty_slots: 4, followup_done: false, new_appointments: 1,
      appointments_done: 9, no_show: 1, extra_appointments: 0, rescheduled: 0,
    },
    hsl: {
      appointments_scheduled: 12, attended_private: 2, attended_insurance: 5,
      noshows_private: 0, noshows_insurance: 1, cancellations_private: 2, cancellations_insurance: 1,
      cancellations: 3, empty_slots: 1, followup_done: true, new_appointments: 0,
      appointments_done: 7, no_show: 1, extra_appointments: 0, rescheduled: 0,
    },
  });

  // Day -3 (Anjos: high no-show, HSL: ok)
  days.push({
    offset: 3,
    anjos: {
      appointments_scheduled: 16, attended_private: 5, attended_insurance: 4,
      noshows_private: 2, noshows_insurance: 2, cancellations_private: 1, cancellations_insurance: 0,
      cancellations: 1, empty_slots: 2, followup_done: true, new_appointments: 2,
      appointments_done: 9, no_show: 4, extra_appointments: 0, rescheduled: 0,
    },
    hsl: {
      appointments_scheduled: 10, attended_private: 4, attended_insurance: 4,
      noshows_private: 0, noshows_insurance: 0, cancellations_private: 1, cancellations_insurance: 0,
      cancellations: 1, empty_slots: 1, followup_done: true, new_appointments: 1,
      appointments_done: 8, no_show: 0, extra_appointments: 0, rescheduled: 0,
    },
  });

  // Day -2 (Anjos: buracos, HSL: cancel)
  days.push({
    offset: 2,
    anjos: {
      appointments_scheduled: 15, attended_private: 6, attended_insurance: 3,
      noshows_private: 1, noshows_insurance: 0, cancellations_private: 1, cancellations_insurance: 0,
      cancellations: 1, empty_slots: 4, followup_done: false, new_appointments: 2,
      appointments_done: 9, no_show: 1, extra_appointments: 0, rescheduled: 0,
    },
    hsl: {
      appointments_scheduled: 12, attended_private: 3, attended_insurance: 5,
      noshows_private: 1, noshows_insurance: 0, cancellations_private: 2, cancellations_insurance: 0,
      cancellations: 2, empty_slots: 1, followup_done: false, new_appointments: 1,
      appointments_done: 8, no_show: 1, extra_appointments: 0, rescheduled: 0,
    },
  });

  return days.map(d => ({
    date: format(subDays(today, d.offset), 'yyyy-MM-dd'),
    anjos: d.anjos,
    hsl: d.hsl,
  }));
}

export function useQASeed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  const seed = useMutation({
    mutationFn: async () => {
      if (!user || !clinic) throw new Error('Não autenticado');
      const clinicId = clinic.id;
      const userId = user.id;
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayWeekday = today.getDay();

      // 1. Upsert targets on clinic
      await supabase
        .from('clinics')
        .update({ target_fill_rate: 0.90, target_noshow_rate: 0.05 } as any)
        .eq('id', clinicId);

      // 2. Ensure 2 locations exist
      const { data: existingLocs } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', userId);

      let anjosLoc = existingLocs?.find((l: any) => l.name === ANJOS_NAME);
      let hslLoc = existingLocs?.find((l: any) => l.name === HSL_NAME);

      if (!anjosLoc) {
        const { data } = await supabase
          .from('locations')
          .insert({ user_id: userId, clinic_id: clinicId, name: ANJOS_NAME, address: 'Rua dos Anjos, 100', is_active: true } as any)
          .select()
          .single();
        anjosLoc = data;
      } else if (!anjosLoc.is_active) {
        await supabase.from('locations').update({ is_active: true } as any).eq('id', anjosLoc.id);
      }

      if (!hslLoc) {
        const { data } = await supabase
          .from('locations')
          .insert({ user_id: userId, clinic_id: clinicId, name: HSL_NAME, address: 'Av. São Lucas, 500', is_active: true } as any)
          .select()
          .single();
        hslLoc = data;
      } else if (!hslLoc.is_active) {
        await supabase.from('locations').update({ is_active: true } as any).eq('id', hslLoc.id);
      }

      if (!anjosLoc || !hslLoc) throw new Error('Falha ao criar locais');

      // 3. Upsert financials
      for (const [loc, fin] of [[anjosLoc, ANJOS_FINANCIALS], [hslLoc, HSL_FINANCIALS]] as const) {
        const { data: existingFin } = await supabase
          .from('location_financials')
          .select('id')
          .eq('location_id', loc.id)
          .maybeSingle();

        if (existingFin) {
          await supabase
            .from('location_financials')
            .update({ ...fin } as any)
            .eq('id', existingFin.id);
        } else {
          await supabase
            .from('location_financials')
            .insert({ user_id: userId, location_id: loc.id, ...fin } as any);
        }
      }

      // 4. Upsert schedules for today (and all weekdays for completeness)
      for (const [loc, cap] of [[anjosLoc, 16], [hslLoc, 12]] as const) {
        // Delete existing schedules for this location
        await supabase.from('location_schedules').delete().eq('location_id', loc.id);

        // Create schedules for Mon-Sat (1-6) and today's weekday
        const weekdays = new Set([1, 2, 3, 4, 5, todayWeekday]);
        const schedRows = Array.from(weekdays).map(wd => ({
          user_id: userId,
          location_id: loc.id,
          weekday: wd,
          start_time: '08:00',
          end_time: '18:00',
          daily_capacity: cap,
          is_active: true,
        }));

        await supabase.from('location_schedules').insert(schedRows as any);
      }

      // 5. Upsert today's checkins
      for (const [loc, checkinData] of [[anjosLoc, TODAY_ANJOS], [hslLoc, TODAY_HSL]] as const) {
        await supabase
          .from('daily_checkins')
          .upsert({
            clinic_id: clinicId,
            user_id: userId,
            date: todayStr,
            location_id: loc.id,
            ...checkinData,
          } as any, { onConflict: 'clinic_id,date,location_id' });
      }

      // 6. Upsert week data (past 5 days)
      const weekData = buildWeekData(today);
      for (const day of weekData) {
        for (const [loc, data] of [[anjosLoc, day.anjos], [hslLoc, day.hsl]] as const) {
          await supabase
            .from('daily_checkins')
            .upsert({
              clinic_id: clinicId,
              user_id: userId,
              date: day.date,
              location_id: loc.id,
              ...data,
            } as any, { onConflict: 'clinic_id,date,location_id' });
        }
      }

      return { anjosId: anjosLoc.id, hslId: hslLoc.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const cleanup = useMutation({
    mutationFn: async () => {
      if (!user || !clinic) throw new Error('Não autenticado');
      const clinicId = clinic.id;
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Find test locations
      const { data: locs } = await supabase
        .from('locations')
        .select('id, name')
        .eq('user_id', user.id)
        .in('name', [ANJOS_NAME, HSL_NAME]);

      if (!locs || locs.length === 0) return;

      const locIds = locs.map(l => l.id);

      // Delete checkins for these locations (last 7 days)
      const startDate = format(subDays(today, 7), 'yyyy-MM-dd');
      await supabase
        .from('daily_checkins')
        .delete()
        .eq('clinic_id', clinicId)
        .in('location_id', locIds)
        .gte('date', startDate)
        .lte('date', todayStr);

      // Delete actions for these locations
      await supabase
        .from('daily_actions')
        .delete()
        .eq('clinic_id', clinicId)
        .in('location_id', locIds);

      // Delete schedules, financials, then locations
      for (const id of locIds) {
        await supabase.from('location_schedules').delete().eq('location_id', id);
        await supabase.from('location_financials').delete().eq('location_id', id);
      }
      await supabase.from('locations').delete().in('id', locIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  return { seed, cleanup };
}
