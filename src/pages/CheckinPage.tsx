import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodayCheckin, useSaveCheckin } from '@/hooks/useCheckin';
import { useLastCheckin } from '@/hooks/useCheckin';
import { useGenerateActions } from '@/hooks/useActions';
import { useClinic } from '@/hooks/useClinic';
import { useCheckinStreak } from '@/hooks/useChecklist';
import { calculateIDEA, generateInsightText, getIdeaStatus, getIdeaLabel, getTopLossSources } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent, DEFAULT_DAILY_CAPACITY } from '@/lib/revenue';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ClipboardCheck, CheckCircle2, TrendingDown, TrendingUp, ChevronRight,
  Minus, Plus, Zap, Flame
} from 'lucide-react';
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
  insightText: string;
  lossSources: string[];
};

const EMPTY_FORM: FormData = {
  appointments_scheduled: 0,
  appointments_done: 0,
  no_show: 0,
  cancellations: 0,
  new_appointments: 0,
  empty_slots: 0,
  followup_done: false,
  notes: '',
};

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">{label}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent transition-colors active:scale-95"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-14 text-center text-2xl font-bold bg-transparent border-none outline-none text-foreground"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent transition-colors active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  const navigate = useNavigate();
  const { data: existing } = useTodayCheckin();
  const { data: lastCheckin } = useLastCheckin();
  const { data: clinic } = useClinic();
  const { data: streak = 0 } = useCheckinStreak();
  const saveCheckin = useSaveCheckin();
  const generateActions = useGenerateActions();

  const [quickMode, setQuickMode] = useState(false);
  const [quickHasBuracos, setQuickHasBuracos] = useState(false);
  const [quickHasNoShow, setQuickHasNoShow] = useState(false);
  const [quickFollowup, setQuickFollowup] = useState(false);

  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);

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
    } else if (lastCheckin) {
      setForm({
        appointments_scheduled: lastCheckin.appointments_scheduled,
        appointments_done: lastCheckin.appointments_done,
        no_show: lastCheckin.no_show,
        cancellations: lastCheckin.cancellations,
        new_appointments: lastCheckin.new_appointments,
        empty_slots: lastCheckin.empty_slots,
        followup_done: false,
        notes: '',
      });
    }
  }, [existing?.id, lastCheckin?.id]);

  const dailyCapacity = (clinic as any)?.daily_capacity ?? DEFAULT_DAILY_CAPACITY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let submitData = { ...form };

    if (quickMode) {
      submitData = {
        ...form,
        no_show: quickHasNoShow ? (lastCheckin?.no_show || 1) : 0,
        empty_slots: quickHasBuracos ? (lastCheckin?.empty_slots || 1) : 0,
        followup_done: quickFollowup,
      };
    }

    try {
      const ideaScore = calculateIDEA(submitData, dailyCapacity);
      const insightText = generateInsightText(submitData, ideaScore);
      const lossSources = getTopLossSources(submitData);

      await saveCheckin.mutateAsync({ ...submitData, insight_text: insightText });
      await generateActions.mutateAsync(submitData);

      const rev = calculateRevenue({
        ...submitData,
        daily_capacity: dailyCapacity,
      });
      setReward({
        score: ideaScore,
        estimated: rev.estimated,
        lost: rev.lost,
        occupancyRate: rev.occupancyRate,
        insightText,
        lossSources,
      });
      setShowReward(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const setField = (key: keyof FormData, value: number | boolean | string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── REWARD SCREEN ──
  if (showReward && reward) {
    const status = getIdeaStatus(reward.score);
    const newStreak = streak + (existing ? 0 : 1);
    return (
      <div className="mx-auto max-w-lg px-4 py-8 flex flex-col items-center space-y-5 min-h-[80vh] justify-center">
        {/* Big score */}
        <div className={cn(
          'w-full rounded-3xl p-8 text-center shadow-elevated',
          status === 'critical' && 'idea-critical',
          status === 'attention' && 'idea-attention',
          status === 'stable' && 'idea-stable',
        )}>
          <CheckCircle2 className="mx-auto h-9 w-9 text-white/80 mb-2" />
          <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Diagnóstico do Dia Concluído!</p>
          <p className="text-7xl font-extrabold text-white tracking-tight mt-1">{reward.score}</p>
          <p className="text-base font-semibold text-white/90 mt-1">Performance {getIdeaLabel(status)}</p>
          <p className="text-sm text-white/80 mt-3 font-medium italic">"{reward.insightText}"</p>
        </div>

        {/* Streak */}
        {newStreak > 1 && (
          <div className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 p-3">
            <Flame className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Você está há <span className="text-primary font-bold">{newStreak} dias</span> seguidos fazendo o check-in.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Você acaba de transformar dados em inteligência. Consistência é a chave para a previsibilidade.
        </p>

        {/* Top loss sources */}
        {reward.lossSources.length > 0 && (
          <div className="w-full rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">O que puxou o score hoje</p>
            <div className="space-y-1.5">
              {reward.lossSources.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="text-destructive font-bold">↓</span> {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue summary */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border/60 p-4 text-center shadow-card">
            <TrendingUp className="mx-auto h-5 w-5 text-revenue-gain mb-1.5" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Receita estimada</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatBRL(reward.estimated)}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 p-4 text-center shadow-card">
            <TrendingDown className="mx-auto h-5 w-5 text-revenue-loss mb-1.5" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Receita perdida</p>
            <p className={cn('text-xl font-bold mt-1', reward.lost > 0 ? 'text-revenue-loss' : 'text-foreground')}>
              {formatBRL(reward.lost)}
            </p>
          </div>
        </div>

        {/* Occupancy bar */}
        <div className="w-full rounded-2xl bg-card border border-border/60 p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Ocupação</p>
            <p className="text-sm font-bold text-foreground">{formatPercent(reward.occupancyRate)}</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', reward.occupancyRate >= 0.85 ? 'bg-revenue-gain' : 'bg-idea-attention')}
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
          <h1 className="text-lg font-bold text-foreground">Check-in Operacional</h1>
          <p className="text-xs text-muted-foreground">Dados rápidos para um diagnóstico preciso do seu dia.</p>
        </div>
      </div>

      {/* Quick mode toggle */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-card border border-border/60 p-3.5 shadow-card">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Ativar modo ultra-rápido (10s)</p>
            <p className="text-xs text-muted-foreground">Apenas 3 perguntas</p>
          </div>
        </div>
        <Switch checked={quickMode} onCheckedChange={setQuickMode} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {quickMode ? (
          <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card space-y-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Responda rapidamente</p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Teve buracos hoje?</p>
                <p className="text-xs text-muted-foreground">Horários vazios na agenda</p>
              </div>
              <Switch checked={quickHasBuracos} onCheckedChange={setQuickHasBuracos} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Teve no-show hoje?</p>
                <p className="text-xs text-muted-foreground">Paciente que não compareceu</p>
              </div>
              <Switch checked={quickHasNoShow} onCheckedChange={setQuickHasNoShow} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Follow-up foi feito hoje?</p>
                <p className="text-xs text-muted-foreground">Confirmações e reativações</p>
              </div>
              <Switch checked={quickFollowup} onCheckedChange={setQuickFollowup} />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Agenda de hoje</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                <Stepper label="Agendados" value={form.appointments_scheduled} onChange={v => setField('appointments_scheduled', v)} />
                <Stepper label="Atendidos" value={form.appointments_done} onChange={v => setField('appointments_done', v)} />
                <Stepper label="No-show" value={form.no_show} onChange={v => setField('no_show', v)} />
                <Stepper label="Cancelamentos" value={form.cancellations} onChange={v => setField('cancellations', v)} />
                <Stepper label="Novos agend." value={form.new_appointments} onChange={v => setField('new_appointments', v)} />
                <Stepper label="Buracos" value={form.empty_slots} onChange={v => setField('empty_slots', v)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-card border border-border/60 p-4 shadow-card">
              <div>
                <p className="text-sm font-semibold text-foreground">Follow-up executado</p>
                <p className="text-xs text-muted-foreground">Confirmações e reativações feitas hoje?</p>
              </div>
              <Switch
                checked={form.followup_done}
                onCheckedChange={(c) => setField('followup_done', c)}
              />
            </div>

            <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Observações (opcional)
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Alguma observação sobre o dia..."
                rows={2}
                className="border-border/50 rounded-xl resize-none"
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-sm font-semibold shadow-premium"
          disabled={saveCheckin.isPending || generateActions.isPending}
        >
          {saveCheckin.isPending ? 'Salvando...' : 'Salvar check-in'}
        </Button>
      </form>
    </div>
  );
}
