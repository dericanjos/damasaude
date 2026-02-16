import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodayCheckin, useSaveCheckin } from '@/hooks/useCheckin';
import { useGenerateActions } from '@/hooks/useActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ClipboardCheck } from 'lucide-react';

export default function CheckinPage() {
  const navigate = useNavigate();
  const { data: existing } = useTodayCheckin();
  const saveCheckin = useSaveCheckin();
  const generateActions = useGenerateActions();

  const [form, setForm] = useState({
    appointments_scheduled: existing?.appointments_scheduled ?? 0,
    appointments_done: existing?.appointments_done ?? 0,
    no_show: existing?.no_show ?? 0,
    cancellations: existing?.cancellations ?? 0,
    new_appointments: existing?.new_appointments ?? 0,
    empty_slots: existing?.empty_slots ?? 0,
    followup_done: existing?.followup_done ?? false,
    notes: existing?.notes ?? '',
  });

  // Update form when existing data loads
  useState(() => {
    if (existing) {
      setForm({
        appointments_scheduled: existing.appointments_scheduled,
        appointments_done: existing.appointments_done,
        no_show: existing.no_show,
        cancellations: existing.cancellations,
        new_appointments: existing.new_appointments,
        empty_slots: existing.empty_slots,
        followup_done: existing.followup_done,
        notes: existing.notes ?? '',
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await saveCheckin.mutateAsync(form);
      // Generate actions based on checkin data
      await generateActions.mutateAsync(form);
      toast.success('Check-in salvo. IDEA atualizado! ✅');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const numField = (key: keyof typeof form, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-sm">{label}</Label>
      <Input
        id={key}
        type="number"
        min={0}
        value={form[key] as number}
        onChange={(e) => setForm(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Check-in Diário</h1>
          <p className="text-xs text-muted-foreground">Leva menos de 1 minuto</p>
        </div>
      </div>

      <Card className="shadow-card border-border/50">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {numField('appointments_scheduled', 'Agendados hoje')}
              {numField('appointments_done', 'Atendidos hoje')}
              {numField('no_show', 'No-show')}
              {numField('cancellations', 'Cancelamentos')}
              {numField('new_appointments', 'Novos agendamentos')}
              {numField('empty_slots', 'Buracos na agenda')}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <Label htmlFor="followup" className="text-sm">Follow-up executado hoje?</Label>
              <Switch
                id="followup"
                checked={form.followup_done}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, followup_done: checked }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Alguma observação sobre o dia..."
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" disabled={saveCheckin.isPending}>
              {saveCheckin.isPending ? 'Salvando...' : 'Salvar check-in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
