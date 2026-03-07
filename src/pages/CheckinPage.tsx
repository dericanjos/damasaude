import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodayCheckin, useSaveCheckin } from '@/hooks/useCheckin';
import { useLastCheckin } from '@/hooks/useCheckin';
import { useGenerateActions } from '@/hooks/useActions';
import { useClinic } from '@/hooks/useClinic';
import { useCheckinStreak } from '@/hooks/useChecklist';
import { useGenerateInsight } from '@/hooks/useInsights';
import { calculateIDEA, generateInsightText, getIdeaStatus, getIdeaLabel, getTopLossSources, totalAttended, totalNoshows } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent, DEFAULT_DAILY_CAPACITY, DEFAULT_TICKET_PRIVATE, DEFAULT_TICKET_INSURANCE } from '@/lib/revenue';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ClipboardCheck, CheckCircle2, TrendingDown, TrendingUp, ChevronRight,
  Minus, Plus, Zap, Flame, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FormData = {
  appointments_scheduled: number;
  attended_private: number;
  attended_insurance: number;
  noshows_private: number;
  noshows_insurance: number;
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
  attended_private: 0,
  attended_insurance: 0,
  noshows_private: 0,
  noshows_insurance: 0,
  cancellations: 0,
  new_appointments: 0,
  empty_slots: 0,
  followup_done: false,
  notes: '',
};

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent transition-colors active:scale-95"
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent transition-colors active:scale-95"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CheckinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Label className="w-full whitespace-normal text-left text-sm font-semibold leading-snug text-foreground">
        {label}
      </Label>
      <Stepper value={value} onChange={onChange} />
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
  const { generate: generateMicroInsight } = useGenerateInsight();

  const paymentType = (clinic as any)?.payment_type ?? 'ambos';
  const [quickMode, setQuickMode] = useState(false);
  const [quickHasBuracos, setQuickHasBuracos] = useState(false);
  const [quickHasNoShow, setQuickHasNoShow] = useState(false);
  const [quickFollowup, setQuickFollowup] = useState(false);

  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    if (existing) {
      const e = existing as any;
      setForm({
        appointments_scheduled: e.appointments_scheduled,
        attended_private: e.attended_private ?? e.appointments_done ?? 0,
        attended_insurance: e.attended_insurance ?? 0,
        noshows_private: e.noshows_private ?? e.no_show ?? 0,
        noshows_insurance: e.noshows_insurance ?? 0,
        cancellations: e.cancellations,
        new_appointments: e.new_appointments,
        empty_slots: e.empty_slots,
        followup_done: e.followup_done,
        notes: e.notes ?? '',
      });
    } else if (lastCheckin) {
      const l = lastCheckin as any;
      setForm({
        appointments_scheduled: l.appointments_scheduled,
        attended_private: l.attended_private ?? l.appointments_done ?? 0,
        attended_insurance: l.attended_insurance ?? 0,
        noshows_private: l.noshows_private ?? l.no_show ?? 0,
        noshows_insurance: l.noshows_insurance ?? 0,
        cancellations: l.cancellations,
        new_appointments: l.new_appointments,
        empty_slots: l.empty_slots,
        followup_done: false,
        notes: '',
      });
    }
  }, [existing?.id, lastCheckin?.id]);

  const dailyCapacity = (clinic as any)?.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
  const ticketPrivate = (clinic as any)?.ticket_private ?? DEFAULT_TICKET_PRIVATE;
  const ticketInsurance = (clinic as any)?.ticket_insurance ?? DEFAULT_TICKET_INSURANCE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let submitData = { ...form };

    if (quickMode) {
      submitData = {
        ...form,
        noshows_private: quickHasNoShow ? ((lastCheckin as any)?.noshows_private || (lastCheckin as any)?.no_show || 1) : 0,
        noshows_insurance: 0,
        empty_slots: quickHasBuracos ? ((lastCheckin as any)?.empty_slots || 1) : 0,
        followup_done: quickFollowup,
      };
    }

    try {
      const checkinData = {
        appointments_scheduled: submitData.appointments_scheduled,
        attended_private: submitData.attended_private,
        attended_insurance: submitData.attended_insurance,
        noshows_private: submitData.noshows_private,
        noshows_insurance: submitData.noshows_insurance,
        cancellations: submitData.cancellations,
        new_appointments: submitData.new_appointments,
        empty_slots: submitData.empty_slots,
        followup_done: submitData.followup_done,
      };

      const ideaScore = calculateIDEA(checkinData, dailyCapacity, ticketPrivate, ticketInsurance);
      const insightText = generateInsightText(checkinData, ideaScore);
      const lossSources = getTopLossSources(checkinData);

      // Save with legacy fields too
      await saveCheckin.mutateAsync({
        ...submitData,
        appointments_done: submitData.attended_private + submitData.attended_insurance,
        no_show: submitData.noshows_private + submitData.noshows_insurance,
        insight_text: insightText,
      });
      await generateActions.mutateAsync(checkinData);

      const rev = calculateRevenue({
        ...checkinData,
        daily_capacity: dailyCapacity,
        ticket_private: ticketPrivate,
        ticket_insurance: ticketInsurance,
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

      // Fire micro-insight in background
      const hasSecretary = (clinic as any)?.has_secretary ?? false;
      generateMicroInsight([submitData], 'micro', hasSecretary).then((micro) => {
        if (micro) {
          toast.success(`Check-in salvo! ✨ Dica do dia: ${micro}`, { duration: 8000 });
        }
      });
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
          <button onClick={() => navigate('/idea')} className="group">
            <p className="text-7xl font-extrabold text-white tracking-tight mt-1 group-hover:opacity-90 transition-opacity">{reward.score}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-base font-semibold text-white/90">Performance {getIdeaLabel(status)}</p>
              <Info className="h-3 w-3 text-white/50" />
            </div>
            <p className="text-[10px] text-white/50 mt-0.5">Índice DAMA de Eficiência do Atendimento</p>
          </button>
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
              <div className="grid grid-cols-1 gap-y-5">
                <Stepper label="Agendados" value={form.appointments_scheduled} onChange={v => setField('appointments_scheduled', v)} />

                {paymentType === 'ambos' ? (
                  <>
                    <Stepper label="Atendidos Particular" value={form.attended_private} onChange={v => setField('attended_private', v)} />
                    <Stepper label="Atendidos Convênio" value={form.attended_insurance} onChange={v => setField('attended_insurance', v)} />
                  </>
                ) : (
                  <Stepper
                    label="Atendidos"
                    value={paymentType === 'particular' ? form.attended_private : form.attended_insurance}
                    onChange={v => setField(paymentType === 'particular' ? 'attended_private' : 'attended_insurance', v)}
                  />
                )}

                {paymentType === 'ambos' ? (
                  <>
                    <Stepper label="No-shows Particular" value={form.noshows_private} onChange={v => setField('noshows_private', v)} />
                    <Stepper label="No-shows Convênio" value={form.noshows_insurance} onChange={v => setField('noshows_insurance', v)} />
                  </>
                ) : (
                  <Stepper
                    label="No-show"
                    value={paymentType === 'particular' ? form.noshows_private : form.noshows_insurance}
                    onChange={v => setField(paymentType === 'particular' ? 'noshows_private' : 'noshows_insurance', v)}
                  />
                )}

                <Stepper label="Cancelamentos" value={form.cancellations} onChange={v => setField('cancellations', v)} />
                <Stepper label="Novos Agendamentos" value={form.new_appointments} onChange={v => setField('new_appointments', v)} />
                <Stepper label="Buracos na Agenda" value={form.empty_slots} onChange={v => setField('empty_slots', v)} />
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
