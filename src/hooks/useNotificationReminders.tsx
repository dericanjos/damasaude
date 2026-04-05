import { useEffect, useCallback } from 'react';
import { useCheckinStreak } from '@/hooks/useChecklist';

/**
 * Schedules browser notifications for check-in reminders at fixed times:
 * 1. 08:00 — Bom dia, hora do check-in
 * 2. 12:30 — Meio do dia, atualize seus números
 * 3. 18:00 — Fim do dia, finalize o check-in
 * + Streak risk at 17:00 if no check-in done
 */

const REMINDERS = [
  {
    hour: 8, minute: 0,
    title: '☀️ Bom dia, Doutor(a)!',
    body: 'Comece o dia registrando seus agendamentos no DAMA Clínica.',
    tag: 'checkin-morning',
  },
  {
    hour: 12, minute: 30,
    title: '📊 Meio do dia — como está a agenda?',
    body: 'Atualize seus atendimentos e encaixes. Leva menos de 1 minuto!',
    tag: 'checkin-midday',
  },
  {
    hour: 18, minute: 0,
    title: '🌙 Hora de fechar o dia!',
    body: 'Finalize seu check-in: registre no-shows, cancelamentos e resultados.',
    tag: 'checkin-evening',
  },
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

    const now = new Date();
    const timers: ReturnType<typeof setTimeout>[] = [];

    const makeTime = (hour: number, minute: number): Date => {
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
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

    REMINDERS.forEach(r => {
      scheduleNotification(makeTime(r.hour, r.minute), r.title, r.body, r.tag);
    });

    if (streak > 0) {
      scheduleNotification(
        makeTime(17, 0),
        `🔥 Seu streak de ${streak} dias está em risco!`,
        'Falta 1 hora para as 18h. Faça o check-in para manter sua sequência!',
        'checkin-streak-risk'
      );
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [streak]);

  return { requestPermission };
}
