import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { format, subDays } from 'date-fns';

/**
 * Generates realistic check-in data based on the user's actual
 * locations, schedules, and financial configuration from onboarding.
 */
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

      // 1. Get user's real locations
      const { data: locations, error: locErr } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (locErr) throw locErr;
      if (!locations || locations.length === 0) throw new Error('Nenhum local cadastrado');

      // 2. Get schedules for all locations
      const { data: allSchedules } = await supabase
        .from('location_schedules')
        .select('*')
        .eq('user_id', userId);

      // 3. Get financials for all locations
      const { data: allFinancials } = await supabase
        .from('location_financials')
        .select('*')
        .eq('user_id', userId);

      // 4. Generate 7 past days of check-ins (skipping days without schedule)
      const checkinRows: any[] = [];

      for (let offset = 1; offset <= 7; offset++) {
        const date = subDays(today, offset);
        const dateStr = format(date, 'yyyy-MM-dd');
        const weekday = date.getDay(); // 0=Sun

        for (const loc of locations) {
          // Find schedule for this location on this weekday
          const sched = allSchedules?.find(
            s => s.location_id === loc.id && s.weekday === weekday && s.is_active
          );
          if (!sched) continue; // No schedule for this day — skip

          const capacity = sched.daily_capacity || 16;
          const fin = allFinancials?.find(f => f.location_id === loc.id);

          // Generate realistic random data based on capacity
          const checkin = generateCheckinData(capacity, fin);

          checkinRows.push({
            clinic_id: clinicId,
            user_id: userId,
            date: dateStr,
            location_id: loc.id,
            ...checkin,
          });
        }
      }

      // 5. Delete existing checkins for these dates and locations
      if (checkinRows.length > 0) {
        const dates = [...new Set(checkinRows.map(r => r.date))];
        const locIds = locations.map(l => l.id);

        for (const dateStr of dates) {
          await supabase
            .from('daily_checkins')
            .delete()
            .eq('clinic_id', clinicId)
            .eq('date', dateStr)
            .in('location_id', locIds);
        }

        // 6. Insert new checkins
        await supabase.from('daily_checkins').insert(checkinRows);
      }

      return { count: checkinRows.length, locations: locations.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const cleanup = useMutation({
    mutationFn: async () => {
      if (!user || !clinic) throw new Error('Não autenticado');
      const today = new Date();
      const startDate = format(subDays(today, 7), 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');

      await supabase
        .from('daily_checkins')
        .delete()
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', todayStr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  return { seed, cleanup };
}

/** Generate realistic check-in numbers based on daily capacity */
function generateCheckinData(capacity: number, fin: any) {
  // Occupancy between 65-95%
  const occupancyRate = 0.65 + Math.random() * 0.30;
  const scheduled = Math.round(capacity * (0.85 + Math.random() * 0.15));

  // Split attended into private/insurance (roughly 40-60% split)
  const privatePct = 0.3 + Math.random() * 0.4;
  const totalAttended = Math.round(scheduled * occupancyRate);
  const attendedPrivate = Math.round(totalAttended * privatePct);
  const attendedInsurance = totalAttended - attendedPrivate;

  // No-shows: 0-15% of scheduled
  const noshowRate = Math.random() * 0.15;
  const totalNoshows = Math.round(scheduled * noshowRate);
  const noshowsPrivate = Math.round(totalNoshows * (0.3 + Math.random() * 0.4));
  const noshowsInsurance = totalNoshows - noshowsPrivate;

  // Cancellations: 0-10% of scheduled
  const cancelRate = Math.random() * 0.10;
  const totalCancellations = Math.round(scheduled * cancelRate);
  const cancellationsPrivate = Math.round(totalCancellations * (0.3 + Math.random() * 0.4));
  const cancellationsInsurance = totalCancellations - cancellationsPrivate;

  // Empty slots: remaining
  const emptySlots = Math.max(0, capacity - totalAttended - totalNoshows - totalCancellations);

  // Extra appointments & rescheduled: occasional
  const extraAppointments = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
  const rescheduled = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
  const newAppointments = Math.floor(Math.random() * 4);
  const followupDone = Math.random() > 0.4;

  return {
    appointments_scheduled: scheduled,
    appointments_done: totalAttended,
    attended_private: attendedPrivate,
    attended_insurance: attendedInsurance,
    no_show: totalNoshows,
    noshows_private: noshowsPrivate,
    noshows_insurance: noshowsInsurance,
    cancellations: totalCancellations,
    cancellations_private: cancellationsPrivate,
    cancellations_insurance: cancellationsInsurance,
    empty_slots: emptySlots,
    extra_appointments: extraAppointments,
    rescheduled,
    new_appointments: newAppointments,
    followup_done: followupDone,
  };
}
