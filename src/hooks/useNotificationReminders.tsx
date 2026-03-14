import { useEffect, useCallback } from 'react';
import { useTodayLocations, useLocationSchedules } from '@/hooks/useLocations';

/**
 * Schedules browser notifications for check-in reminders:
 * 1. Start of shift → register today's appointments
 * 2. Mid-shift → update attended/losses so far
 * 3. End of shift → finalize the day's results
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
    if (Notification.permission !== 'granted') return;
    if (schedules.length === 0) return;

    const todayWeekday = new Date().getDay();
    const todaySchedule = schedules.find(s => s.weekday === todayWeekday && s.is_active);
    if (!todaySchedule) return;

    const now = new Date();
    const timers: ReturnType<typeof setTimeout>[] = [];

    const parseTime = (timeStr: string): Date => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const startTime = parseTime(todaySchedule.start_time);
    const endTime = parseTime(todaySchedule.end_time);
    const midTime = new Date((startTime.getTime() + endTime.getTime()) / 2);

    const locationName = firstLocation?.name || 'seu consultório';

    const scheduleNotification = (time: Date, title: string, body: string, tag: string) => {
      const ms = time.getTime() - now.getTime();
      if (ms > 0) {
        timers.push(setTimeout(() => {
          new Notification(title, { body, icon: '/favicon.ico', tag });
        }, ms));
      }
    };

    // 1. Morning: start of shift
    scheduleNotification(
      startTime,
      '☀️ Bom dia! Hora do check-in',
      `Registre os agendamentos e atendimentos previstos em ${locationName}.`,
      'checkin-morning'
    );

    // 2. Mid-shift: update progress
    scheduleNotification(
      midTime,
      '📊 Meio do expediente',
      `Atualize os atendimentos e encaixes do dia em ${locationName}.`,
      'checkin-midshift'
    );

    // 3. Evening: end of shift
    scheduleNotification(
      endTime,
      '🌙 Fim do expediente',
      `Finalize o check-in em ${locationName}: no-shows, cancelamentos e follow-up.`,
      'checkin-evening'
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [schedules, firstLocation]);

  return { requestPermission };
}
