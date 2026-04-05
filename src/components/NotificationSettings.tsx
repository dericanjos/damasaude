import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  getNotificationTimes,
  saveNotificationTimes,
  getNotificationsEnabled,
  setNotificationsEnabled,
  useNotificationReminders,
  type NotificationTimes,
} from '@/hooks/useNotificationReminders';

const ROWS: { key: keyof NotificationTimes; emoji: string; label: string; desc: string }[] = [
  { key: 'morning', emoji: '☀️', label: 'Manhã', desc: 'Registre os agendamentos do dia' },
  { key: 'midday', emoji: '📊', label: 'Meio do dia', desc: 'Atualize atendimentos e encaixes' },
  { key: 'evening', emoji: '🌙', label: 'Fim do dia', desc: 'Finalize no-shows e cancelamentos' },
];

export default function NotificationSettings() {
  const [times, setTimes] = useState<NotificationTimes>(getNotificationTimes);
  const [editing, setEditing] = useState(false);
  const [enabled, setEnabled] = useState(getNotificationsEnabled);
  const { requestPermission, permissionState, scheduleNative, cancelAll, isNative } = useNotificationReminders();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestPermission();
      if (!granted) {
        toast.error(
          isNative
            ? 'Permissão negada. Ative as notificações em Ajustes > DAMA Clínica.'
            : 'Permissão negada. Ative nas configurações do navegador.'
        );
        return;
      }
      setNotificationsEnabled(true);
      setEnabled(true);
      await scheduleNative();
      toast.success('Lembretes ativados! 🔔');
    } else {
      setNotificationsEnabled(false);
      setEnabled(false);
      await cancelAll();
      toast.info('Lembretes desativados.');
    }
  };

  const handleSave = async () => {
    saveNotificationTimes(times);
    setEditing(false);
    if (enabled) {
      await scheduleNative();
    }
    toast.success('Horários salvos!');
  };

  const isDenied = permissionState === 'denied';

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Lembretes de check-in</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isDenied}
        />
      </div>

      {isDenied && (
        <p className="text-[11px] text-destructive">
          ⚠️ Notificações bloqueadas. {isNative ? 'Vá em Ajustes > DAMA Clínica para desbloquear.' : 'Ative nas configurações do navegador.'}
        </p>
      )}

      {enabled && (
        <>
          <p className="text-xs text-muted-foreground">
            Receba 3 lembretes diários nos seus dias de atendimento:
          </p>

          <div className="space-y-2">
            {ROWS.map(row => (
              <div key={row.key} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">{row.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{row.label}</p>
                  <p className="text-[11px] text-muted-foreground">{row.desc}</p>
                </div>
                {editing ? (
                  <Input
                    type="time"
                    value={times[row.key]}
                    onChange={e => setTimes(prev => ({ ...prev, [row.key]: e.target.value }))}
                    className="w-[90px] h-7 text-xs px-2"
                  />
                ) : (
                  <span className="text-xs font-mono text-foreground/80">{times[row.key]}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            {editing ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setTimes(getNotificationTimes()); setEditing(false); }}>
                  Cancelar
                </Button>
                <Button size="sm" className="text-xs" onClick={handleSave}>
                  Salvar horários
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setEditing(true)}>
                ✏️ Editar horários
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
