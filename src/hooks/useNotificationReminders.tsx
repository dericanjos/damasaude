import { useEffect, useCallback, useState } from 'react';
import { useCheckinStreak } from '@/hooks/useChecklist';
import { useClinic } from '@/hooks/useClinic';
import { toast } from 'sonner';

const STORAGE_KEY = 'dama-notification-times';
const ENABLED_KEY = 'dama-notifications-enabled';

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

export function getNotificationsEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export function setNotificationsEnabled(val: boolean) {
  localStorage.setItem(ENABLED_KEY, val ? 'true' : 'false');
}

// ── Capacitor detection ──
function isNativePlatform(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform?.() === true;
}

// ── Lazy load Capacitor LocalNotifications ──
async function getLocalNotifications() {
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

const WEEKDAY_MAP: Record<string, number> = {
  dom: 1, seg: 2, ter: 3, qua: 4, qui: 5, sex: 6, sab: 7,
};

const REMINDER_META = [
  { key: 'morning' as const, id: 1001, title: '☀️ Bom dia, Doutor(a)!', body: 'Sua agenda de hoje está pronta. Faça seu check-in no DAMA Clinic.', tag: 'checkin-morning' },
  { key: 'midday' as const, id: 1002, title: '📊 Meio do dia — como está a agenda?', body: 'Atualize seus atendimentos e encaixes. Leva menos de 1 minuto!', tag: 'checkin-midday' },
  { key: 'evening' as const, id: 1003, title: '🌙 Hora de fechar o dia!', body: 'Finalize seu check-in: registre no-shows, cancelamentos e veja seu IDEA Score.', tag: 'checkin-evening' },
];

export const TREND_NOTIFICATION_ID = 2001;

/** Schedule a one-off trend alert notification via Capacitor */
export async function scheduleTrendAlert(message: string) {
  if (!isNativePlatform()) return;
  const LN = await getLocalNotifications();
  if (!LN) return;

  const triggerAt = new Date();
  triggerAt.setMinutes(triggerAt.getMinutes() + 1); // 1 minute from now

  await LN.schedule({
    notifications: [{
      id: TREND_NOTIFICATION_ID,
      title: '📊 Alerta de Tendência',
      body: message,
      schedule: { at: triggerAt },
      sound: undefined,
      smallIcon: 'ic_stat_icon',
      iconColor: '#3b82f6',
    }],
  });
}

export function useNotificationReminders() {
  const { data: streak = 0 } = useCheckinStreak();
  const { data: clinic } = useClinic();
  const [permissionState, setPermissionState] = useState<string>('unknown');

  // Check current permission state on mount
  useEffect(() => {
    (async () => {
      if (isNativePlatform()) {
        const LN = await getLocalNotifications();
        if (LN) {
          const result = await LN.checkPermissions();
          setPermissionState(result.display);
        }
      } else if ('Notification' in window) {
        setPermissionState(Notification.permission);
      }
    })();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isNativePlatform()) {
      const LN = await getLocalNotifications();
      if (!LN) return false;
      const check = await LN.checkPermissions();
      if (check.display === 'granted') {
        setPermissionState('granted');
        return true;
      }
      const result = await LN.requestPermissions();
      setPermissionState(result.display);
      if (result.display !== 'granted') {
        toast.error('Permissão negada. Ative as notificações em Ajustes > DAMA Clinic.');
        return false;
      }
      return true;
    }

    // Web fallback
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setPermissionState('granted');
      return true;
    }
    if (Notification.permission === 'denied') {
      setPermissionState('denied');
      return false;
    }
    const result = await Notification.requestPermission();
    setPermissionState(result);
    return result === 'granted';
  }, []);

  const cancelAll = useCallback(async () => {
    if (isNativePlatform()) {
      const LN = await getLocalNotifications();
      if (LN) {
        const pending = await LN.getPending();
        if (pending.notifications.length > 0) {
          await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
        }
      }
    }
  }, []);

  const scheduleNative = useCallback(async () => {
    if (!isNativePlatform()) return;
    const LN = await getLocalNotifications();
    if (!LN) return;

    // Cancel existing before rescheduling
    await cancelAll();

    if (!getNotificationsEnabled()) return;

    const times = getNotificationTimes();
    const workingDays: string[] = Array.isArray((clinic as any)?.working_days)
      ? (clinic as any).working_days
      : ['seg', 'ter', 'qua', 'qui', 'sex'];

    const weekdays = workingDays
      .map(d => WEEKDAY_MAP[d])
      .filter(Boolean);

    const doctorName = (clinic as any)?.doctor_name;
    const notifications: any[] = [];

    for (const reminder of REMINDER_META) {
      const [h, m] = times[reminder.key].split(':').map(Number);
      let body = reminder.body;
      let title = reminder.title;

      if (reminder.key === 'morning' && doctorName) {
        title = `☀️ Bom dia, Dr. ${doctorName}!`;
      }

      notifications.push({
        id: reminder.id,
        title,
        body,
        schedule: {
          on: { hour: h, minute: m },
          every: 'week',
          allowWhileIdle: true,
        },
        // Capacitor local notifications support weekday filtering via `on` with repeating
        // We schedule one per weekday for precise control
        sound: undefined,
        smallIcon: 'ic_stat_icon',
        iconColor: '#3b82f6',
      });
    }

    // Streak risk: 1h before evening
    if (streak > 0) {
      const [eh, em] = times.evening.split(':').map(Number);
      let riskH = eh - 1;
      let riskM = em;
      if (riskH < 0) { riskH = 23; }

      notifications.push({
        id: 1004,
        title: `🔥 Seu streak de ${streak} dias está em risco!`,
        body: `Falta 1 hora para as ${times.evening}. Faça o check-in para manter sua sequência!`,
        schedule: {
          on: { hour: riskH, minute: riskM },
          every: 'week',
          allowWhileIdle: true,
        },
        sound: undefined,
        smallIcon: 'ic_stat_icon',
        iconColor: '#D4AF37',
      });
    }

    try {
      await LN.schedule({ notifications });
    } catch (e) {
      console.error('Failed to schedule notifications:', e);
    }
  }, [clinic, streak, cancelAll]);

  // Auto-schedule when enabled + native
  useEffect(() => {
    if (isNativePlatform() && getNotificationsEnabled()) {
      scheduleNative();
    }
  }, [scheduleNative]);

  // Web fallback: setTimeout-based (existing behavior)
  useEffect(() => {
    if (isNativePlatform()) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!getNotificationsEnabled()) return;

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

  return {
    requestPermission,
    permissionState,
    scheduleNative,
    cancelAll,
    isNative: isNativePlatform(),
  };
}
