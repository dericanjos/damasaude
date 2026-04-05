import { useEffect, useCallback } from 'react';
import { useCheckinStreak } from '@/hooks/useChecklist';

const STORAGE_KEY = 'dama-notification-times';

export interface NotificationTimes {
  morning: string;   // "HH:MM"
  midday: string;
  evening: string;
}

const DEFAULT_TIMES: NotificationTimes = {
  morning: '08:00',
  midday: '12:30',
  evening: '18:00',
};

export function getNotificationTimes(): NotificationTimes {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_TIMES, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_TIMES;
}

export function saveNotificationTimes(times: NotificationTimes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
}

const REMINDER_META = [
  { key: 'morning' as const, title: '☀️ Bom dia, Doutor(a)!', body: 'Comece o dia registrando seus agendamentos no DAMA Clínica.', tag: 'checkin-morning' },
  { key: 'midday' as const, title: '📊 Meio do dia — como está a agenda?', body: 'Atualize seus atendimentos e encaixes. Leva menos de 1 minuto!', tag: 'checkin-midday' },
  { key: 'evening' as const, title: '🌙 Hora de fechar o dia!', body: 'Finalize seu check-in: registre no-shows, cancelamentos e resultados.', tag: 'checkin-evening' },
];

export function useNotificationReminders() {
  const { data: streak = 0 } = useCheckinStreak();

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

    const times = getNotificationTimes();
    const now = new Date();
    const timers: ReturnType<typeof setTimeout>[] = [];

    const parseTime = (timeStr: string): Date => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const scheduleNotification = (time: Date, title: string, body: string, tag: string) => {
      const ms = time.getTime() - now.getTime();
      if (ms > 0) {
        timers.push(setTimeout(() => {
          new Notification(title, { body, icon: '/favicon.ico', tag });
        }, ms));
      }
    };

    REMINDER_META.forEach(r => {
      scheduleNotification(parseTime(times[r.key]), r.title, r.body, r.tag);
    });

    // Streak risk 1h before evening
    if (streak > 0) {
      const eveningTime = parseTime(times.evening);
      const riskTime = new Date(eveningTime.getTime() - 60 * 60 * 1000);
      scheduleNotification(
        riskTime,
        `🔥 Seu streak de ${streak} dias está em risco!`,
        `Falta 1 hora para as ${times.evening}. Faça o check-in para manter sua sequência!`,
        'checkin-streak-risk'
      );
    }

    return () => { timers.forEach(clearTimeout); };
  }, [streak]);

  return { requestPermission };
}
