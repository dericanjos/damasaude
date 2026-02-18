import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodayCheckin, useSaveCheckin } from '@/hooks/useCheckin';
import { useGenerateActions } from '@/hooks/useActions';
import { calculateIDEA, getIdeaStatus, getIdeaLabel } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent } from '@/lib/revenue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ClipboardCheck, CheckCircle2, TrendingDown, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type FormData = {
  appointments_scheduled: number;
  appointments_done: number;
  no_show: number;
  cancellations: number;
  new_appointments: number;
  empty_slots: number;
  followup_done: boolean;
  notes: string;
};

type RewardData = {
  score: number;
  estimated: number;
  lost: number;
  occupancyRate: number;
};

export default function CheckinPage() {
  const navigate = useNavigate();
  const { data: existing } = useTodayCheckin();
  const saveCheckin = useSaveCheckin();
  const generateActions = useGenerateActions();

  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);

  const [form, setForm] = useState<FormData>({
    appointments_scheduled: 0,
    appointments_done: 0,
    no_show: 0,
    cancellations: 0,
    new_appointments: 0,
    empty_slots: 0,
    followup_done: false,
    notes: '',
  });

  useEffect(() => {
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
  }, [existing?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveCheckin.mutateAsync(form);
      await generateActions.mutateAsync(form);

      // Calculate reward data
      const score = calculateIDEA(form);
      const rev = calculateRevenue(form);
      setReward({ score, estimated: rev.estimated, lost: rev.lost, occupancyRate: rev.occupancyRate });
      setShowReward(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const numField = (key: keyof FormData, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input
        id={key}
        type="number"
        min={0}
        value={form[key] as number}
        onChange={(e) => setForm(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
        className="text-center text-lg font-bold h-12 rounded-xl border-border/70 bg-background"
      />
    </div>
  );

  // ── REWARD SCREEN ──
  if (showReward && reward) {
    const status = getIdeaStatus(reward.score);
    return (
      <div className="mx-auto max-w-lg px-4 py-8 flex flex-col items-center space-y-6 min-h-[70vh] justify-center">
        {/* Big score */}
        <div className={cn(
          'w-full rounded-3xl p-8 text-center shadow-elevated',
          status === 'critical' && 'idea-critical',
          status === 'attention' && 'idea-attention',
          status === 'stable' && 'idea-stable',
        )}>
          <CheckCircle2 className="mx-auto h-10 w-10 text-white/80 mb-3" />
          <p className="text-sm font-bold text-white/75 uppercase tracking-widest">Check-in salvo!</p>
          <p className="text-7xl font-extrabold text-white tracking-tight mt-2">{reward.score}</p>
          <p className="text-base font-semibold text-white/90 mt-1">Performance {getIdeaLabel(status)}</p>
          <p className="text-sm text-white/65 mt-1">
            {status === 'stable' && 'Excelente! Continue assim.'}
            {status === 'attention' && 'Atenção aos cancelamentos e buracos.'}
            {status === 'critical' && 'Foco em confirmações e lista de espera.'}
          </p>
        </div>

        {/* Revenue summary */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border/60 p-4 text-center shadow-card">
            <TrendingUp className="mx-auto h-5 w-5 text-emerald-600 mb-1.5" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Receita estimada</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatBRL(reward.estimated)}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 p-4 text-center shadow-card">
            <TrendingDown className="mx-auto h-5 w-5 text-destructive mb-1.5" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Receita perdida</p>
            <p className={cn('text-2xl font-bold mt-1', reward.lost > 0 ? 'text-destructive' : 'text-foreground')}>
              {formatBRL(reward.lost)}
            </p>
          </div>
        </div>

        {/* Occupancy */}
        <div className="w-full rounded-2xl bg-card border border-border/60 p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Ocupação da agenda</p>
            <p className="text-sm font-bold text-foreground">{formatPercent(reward.occupancyRate)}</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', reward.occupancyRate >= 0.85 ? 'bg-emerald-500' : 'bg-amber-500')}
              style={{ width: `${Math.min(100, reward.occupancyRate * 100)}%` }}
            />
          </div>
        </div>

        <Button className="w-full h-12 rounded-xl text-sm font-semibold" onClick={() => navigate('/')}>
          Ver painel
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }

  // ── FORM SCREEN ──
  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-premium">
          <ClipboardCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Check-in Diário</h1>
          <p className="text-xs text-muted-foreground">Menos de 1 minuto • Clareza total</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Grid inputs */}
        <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Agenda de hoje</p>
          <div className="grid grid-cols-2 gap-3">
            {numField('appointments_scheduled', 'Agendados')}
            {numField('appointments_done', 'Atendidos')}
            {numField('no_show', 'No-show')}
            {numField('cancellations', 'Cancelamentos')}
            {numField('new_appointments', 'Novos agend.')}
            {numField('empty_slots', 'Buracos')}
          </div>
        </div>

        {/* Follow-up toggle */}
        <div className="flex items-center justify-between rounded-2xl bg-card border border-border/60 p-4 shadow-card">
          <div>
            <p className="text-sm font-semibold text-foreground">Follow-up executado</p>
            <p className="text-xs text-muted-foreground">Confirmações e reativações feitas hoje?</p>
          </div>
          <Switch
            id="followup"
            checked={form.followup_done}
            onCheckedChange={(checked) => setForm(prev => ({ ...prev, followup_done: checked }))}
          />
        </div>

        {/* Notes */}
        <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-2">
          <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Observações (opcional)
          </Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Alguma observação sobre o dia..."
            rows={2}
            className="border-border/50 rounded-xl resize-none"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-sm font-semibold shadow-premium"
          disabled={saveCheckin.isPending}
        >
          {saveCheckin.isPending ? 'Salvando...' : 'Salvar check-in'}
        </Button>
      </form>
    </div>
  );
}
