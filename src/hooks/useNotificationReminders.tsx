import { useEffect, useCallback } from 'react';
import { useTodayLocations, useLocationSchedules } from '@/hooks/useLocations';

/**
 * Schedules browser notifications for check-in reminders based on
 * the doctor's start_time (morning reminder) and end_time (evening reminder)
 * from location_schedules.
 */
export function useNotificationReminders() {
  const { todayLocations } = useTodayLocations();
  const firstLocation = todayLocations[0];
  const { data: schedules = [] } = useLocationSchedules(firstLocation?.id);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      // Will request on first interaction via the settings or automatically
      return;
    }
    if (Notification.permission !== 'granted') return;
    if (schedules.length === 0) return;

    const todayWeekday = new Date().getDay();
    const todaySchedule = schedules.find(s => s.weekday === todayWeekday && s.is_active);
    if (!todaySchedule) return;

    const now = new Date();
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Parse time string "HH:MM:SS" or "HH:MM" to Date today
    const parseTime = (timeStr: string): Date => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const startTime = parseTime(todaySchedule.start_time);
    const endTime = parseTime(todaySchedule.end_time);

    const locationName = firstLocation?.name || 'seu consultório';

    // Morning reminder: at start_time
    const msToStart = startTime.getTime() - now.getTime();
    if (msToStart > 0) {
      timers.push(setTimeout(() => {
        new Notification('☀️ Bom dia! Hora do check-in', {
          body: `Registre os agendamentos do dia em ${locationName}.`,
          icon: '/favicon.ico',
          tag: 'checkin-morning',
        });
      }, msToStart));
    }

    // Evening reminder: at end_time
    const msToEnd = endTime.getTime() - now.getTime();
    if (msToEnd > 0) {
      timers.push(setTimeout(() => {
        new Notification('🌙 Fim do expediente', {
          body: `Atualize os resultados do dia em ${locationName}: no-shows, cancelamentos e follow-up.`,
          icon: '/favicon.ico',
          tag: 'checkin-evening',
        });
      }, msToEnd));
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [schedules, firstLocation]);

  return { requestPermission };
}
