import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTodayCheckin, useSaveCheckin, useTodayCheckins } from '@/hooks/useCheckin';
import { useLastCheckin } from '@/hooks/useCheckin';
import { useGenerateActions } from '@/hooks/useActions';
import { useClinic } from '@/hooks/useClinic';
import { useCheckinStreak } from '@/hooks/useChecklist';
import { useGenerateInsight } from '@/hooks/useInsights';
import { useTodayLocations, useLocationSchedules, useLocationFinancial, type Location } from '@/hooks/useLocations';
import { calculateIDEA, generateInsightText, getIdeaStatus, getIdeaLabel, getTopLossSources, totalAttended, totalNoshows, calculateLossMap } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent, DEFAULT_DAILY_CAPACITY, DEFAULT_TICKET_PRIVATE, DEFAULT_TICKET_INSURANCE } from '@/lib/revenue';
import { getCapacityForDate, parseDailyCapacities } from '@/lib/days';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ClipboardCheck, CheckCircle2, TrendingDown, TrendingUp, ChevronRight,
  Minus, Plus, Zap, Flame, Info, MapPin, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FormData = {
  appointments_scheduled: number;
  attended_private: number;
  attended_insurance: number;
  noshows_private: number;
  noshows_insurance: number;
  cancellations: number;
  cancellations_private: number;
  cancellations_insurance: number;
  new_appointments: number;
  empty_slots: number;
  extra_appointments: number;
  rescheduled: number;
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
  lossNoshow: number;
  lossCancel: number;
  lossBuracos: number;
  lossBiggest: 'noshow' | 'cancel' | 'buracos' | null;
};

const EMPTY_FORM: FormData = {
  appointments_scheduled: 0,
  attended_private: 0,
  attended_insurance: 0,
  noshows_private: 0,
  noshows_insurance: 0,
  cancellations: 0,
  cancellations_private: 0,
  cancellations_insurance: 0,
  new_appointments: 0,
  empty_slots: 0,
  extra_appointments: 0,
  rescheduled: 0,
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
        value={value === 0 ? value : (value || '')}
        onChange={e => onChange(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
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
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  hint?: string;
}) {
  const atMax = max !== undefined && value >= max;
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <Label className="whitespace-normal text-left text-xs font-medium leading-snug text-muted-foreground">
          {label}
        </Label>
      </div>
      <Stepper value={value} onChange={v => onChange(max !== undefined ? Math.min(v, max) : v)} />
      {hint && (
        <p className="text-[10px] text-idea-attention flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}


export default function CheckinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { todayLocations, allLocations } = useTodayLocations();
  const { data: clinic } = useClinic();
  const { data: streak = 0 } = useCheckinStreak();
  const saveCheckin = useSaveCheckin();
  const generateActions = useGenerateActions();
  const { generate: generateMicroInsight } = useGenerateInsight();

  // Location selection
  const paramLocationId = searchParams.get('location');
  const paramSection = searchParams.get('section') as 'encaixes' | 'perdas' | null;
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [manuallyCleared, setManuallyCleared] = useState(false);

  const handleClearLocation = () => {
    setSelectedLocationId('');
    setManuallyCleared(true);
  };

  // Auto-select location (only if not manually cleared)
  useEffect(() => {
    if (manuallyCleared) return;
    if (paramLocationId) {
      setSelectedLocationId(paramLocationId);
    } else if (todayLocations.length === 1) {
      setSelectedLocationId(todayLocations[0].id);
    } else if (allLocations.length === 1) {
      setSelectedLocationId(allLocations[0].id);
    }
  }, [todayLocations, allLocations, paramLocationId, manuallyCleared]);

  const selectedLocation = allLocations.find(l => l.id === selectedLocationId) || null;

  const { data: existing } = useTodayCheckin(selectedLocationId || undefined);
  const { data: lastCheckin } = useLastCheckin(selectedLocationId || undefined);
  const { data: schedules = [] } = useLocationSchedules(selectedLocationId || undefined);
  const { data: financial } = useLocationFinancial(selectedLocationId || undefined);
  const { data: allTodayCheckins = [] } = useTodayCheckins();

  const paymentType = (clinic as any)?.payment_type ?? 'ambos';
  const [quickMode, setQuickMode] = useState(false);
  const [quickHasBuracos, setQuickHasBuracos] = useState(false);
  const [quickHasNoShow, setQuickHasNoShow] = useState(false);
  const [quickFollowup, setQuickFollowup] = useState(false);

  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState<'encaixes' | 'perdas' | null>(null);

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
        cancellations_private: e.cancellations_private ?? e.cancellations ?? 0,
        cancellations_insurance: e.cancellations_insurance ?? 0,
        new_appointments: e.new_appointments,
        empty_slots: e.empty_slots,
        extra_appointments: e.extra_appointments ?? 0,
        rescheduled: e.rescheduled ?? 0,
        followup_done: e.followup_done,
        notes: e.notes ?? '',
      });
    } else {
      // New checkin: only pre-fill scheduling info, losses start at zero
      setForm(EMPTY_FORM);
    }
  }, [existing?.id]);

  // Auto-open section from URL param (e.g. /checkin?section=encaixes)
  useEffect(() => {
    if (paramSection && existing && !activeSection) {
      setActiveSection(paramSection);
    }
  }, [paramSection, existing?.id]);

  // Get capacity from location schedule
  const todayWeekday = new Date().getDay();
  const todaySchedule = schedules.find(s => s.weekday === todayWeekday);
  const dailyCapacity = todaySchedule?.daily_capacity || getCapacityForDate(new Date(), parseDailyCapacities((clinic as any)?.daily_capacities));
  const ticketAvg = financial?.ticket_avg ?? 250;
  const ticketPrivate = (clinic as any)?.ticket_private ?? DEFAULT_TICKET_PRIVATE;
  const ticketInsurance = (clinic as any)?.ticket_insurance ?? DEFAULT_TICKET_INSURANCE;

  // Locations already checked in today
  const checkedInLocationIds = allTodayCheckins.map((c: any) => c.location_id).filter(Boolean);

  // Effective capacity = scheduled slots + extra (encaixes)
  const effectiveCapacity = form.appointments_scheduled + form.extra_appointments;

  // ── Category-based limits ──
  const totalAttendedNow = form.attended_private + form.attended_insurance;
  const totalNoshowsNow = form.noshows_private + form.noshows_insurance;
  const totalCancellationsNow = form.cancellations_private + form.cancellations_insurance;

  // Attended per category limited by effectiveCapacity
  const maxAttendedPrivate = Math.max(0, effectiveCapacity - form.attended_insurance);
  const maxAttendedInsurance = Math.max(0, effectiveCapacity - form.attended_private);

  // Losses per category limited by what was scheduled in that category
  const maxNoshowPrivate = Math.max(0, form.attended_private - form.cancellations_private);
  const maxNoshowInsurance = Math.max(0, form.attended_insurance - form.cancellations_insurance);
  const maxCancelPrivate = Math.max(0, form.attended_private - form.noshows_private);
  const maxCancelInsurance = Math.max(0, form.attended_insurance - form.noshows_insurance);

  // For single payment type modes
  const maxNoshowsTotal = paymentType === 'particular' ? maxNoshowPrivate : maxNoshowInsurance;
  const maxCancellationsTotal = paymentType === 'particular' ? maxCancelPrivate : maxCancelInsurance;

  const totalLossesPrivate = form.noshows_private + form.cancellations_private;
  const totalLossesInsurance = form.noshows_insurance + form.cancellations_insurance;
  const totalOutcomes = totalAttendedNow + totalNoshowsNow + totalCancellationsNow;

  // Auto-calculate empty_slots = scheduled - outcomes (buracos are only from scheduled slots)
  const autoEmptySlots = Math.max(0, form.appointments_scheduled - totalOutcomes);

  // Keep empty_slots in sync automatically
  useEffect(() => {
    if (!quickMode) {
      setForm(prev => ({ ...prev, empty_slots: autoEmptySlots }));
    }
  }, [autoEmptySlots, quickMode]);
  const hasValidationError = !quickMode && effectiveCapacity > 0 && (
    totalAttendedNow > effectiveCapacity ||
    totalLossesPrivate > form.attended_private ||
    totalLossesInsurance > form.attended_insurance
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocationId) {
      toast.error('Selecione um local de atendimento');
      return;
    }

    if (hasValidationError) {
      toast.error('Corrija os valores inconsistentes antes de salvar.');
      return;
    }

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
        cancellations: submitData.cancellations_private + submitData.cancellations_insurance,
        new_appointments: submitData.new_appointments,
        empty_slots: submitData.empty_slots,
        followup_done: submitData.followup_done,
      };

      const ideaScore = calculateIDEA(checkinData, dailyCapacity, ticketPrivate, ticketInsurance);
      const insightText = generateInsightText(checkinData, ideaScore);
      const lossSources = getTopLossSources(checkinData);

      await saveCheckin.mutateAsync({
        ...submitData,
        cancellations: submitData.cancellations_private + submitData.cancellations_insurance,
        location_id: selectedLocationId,
        appointments_done: submitData.attended_private + submitData.attended_insurance,
        no_show: submitData.noshows_private + submitData.noshows_insurance,
        insight_text: insightText,
      });
      await generateActions.mutateAsync({ checkinData, locationId: selectedLocationId });

      const rev = calculateRevenue({
        ...checkinData,
        daily_capacity: dailyCapacity,
        ticket_private: ticketPrivate,
        ticket_insurance: ticketInsurance,
      });
      const lossMap = calculateLossMap(checkinData, ticketAvg);
      setReward({
        score: ideaScore,
        estimated: rev.estimated,
        lost: rev.lost,
        occupancyRate: rev.occupancyRate,
        insightText,
        lossSources,
        lossNoshow: lossMap.noshow,
        lossCancel: lossMap.cancel,
        lossBuracos: lossMap.buracos,
        lossBiggest: lossMap.biggest,
      });
      setShowReward(true);

      const hasSecretary = selectedLocation?.has_secretary ?? (clinic as any)?.has_secretary ?? false;
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
    setForm(prev => {
      const next = { ...prev, [key]: value };

      // When changing a loss field, clamp it to the category limit
      if (typeof value === 'number') {
        if (key === 'noshows_private') {
          next.noshows_private = Math.min(value, Math.max(0, next.attended_private - next.cancellations_private));
        } else if (key === 'noshows_insurance') {
          next.noshows_insurance = Math.min(value, Math.max(0, next.attended_insurance - next.cancellations_insurance));
        } else if (key === 'cancellations_private') {
          next.cancellations_private = Math.min(value, Math.max(0, next.attended_private - next.noshows_private));
        } else if (key === 'cancellations_insurance') {
          next.cancellations_insurance = Math.min(value, Math.max(0, next.attended_insurance - next.noshows_insurance));
        }

        // When reducing attended, also clamp any losses that now exceed it
        if (key === 'attended_private') {
          const maxLossPrivate = Math.max(0, next.attended_private);
          if (next.noshows_private + next.cancellations_private > maxLossPrivate) {
            next.noshows_private = Math.min(next.noshows_private, maxLossPrivate);
            next.cancellations_private = Math.min(next.cancellations_private, maxLossPrivate - next.noshows_private);
          }
        }
        if (key === 'attended_insurance') {
          const maxLossInsurance = Math.max(0, next.attended_insurance);
          if (next.noshows_insurance + next.cancellations_insurance > maxLossInsurance) {
            next.noshows_insurance = Math.min(next.noshows_insurance, maxLossInsurance);
            next.cancellations_insurance = Math.min(next.cancellations_insurance, maxLossInsurance - next.noshows_insurance);
          }
        }
      }

      return next;
    });

  // ── LOCATION SELECTOR (if no location selected yet) ──
  if (!selectedLocationId && allLocations.length > 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-premium">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Check-in Operacional</h1>
            <p className="text-xs text-muted-foreground">Escolha o local do check-in</p>
          </div>
        </div>

        {todayLocations.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">📅 Locais de hoje</p>
            <div className="space-y-2">
              {todayLocations.map(loc => {
                const alreadyDone = checkedInLocationIds.includes(loc.id);
                return (
                  <button
                    key={loc.id}
                    onClick={() => { setSelectedLocationId(loc.id); setManuallyCleared(false); }}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition-all',
                      alreadyDone
                        ? 'bg-card border-revenue-gain/30'
                        : 'bg-card border-border/60 hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {loc.name}
                        </p>
                        {loc.address && (
                          <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                        )}
                      </div>
                      {alreadyDone && (
                        <CheckCircle2 className="h-4 w-4 text-revenue-gain shrink-0" />
                      )}
                    </div>
                    {alreadyDone && (
                      <p className="text-[11px] text-revenue-gain mt-1">✓ Check-in já feito • Toque para editar</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {allLocations.filter(l => !todayLocations.some(tl => tl.id === l.id)).length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Outros locais</p>
            <div className="space-y-2">
              {allLocations.filter(l => !todayLocations.some(tl => tl.id === l.id)).map(loc => (
                <button
                  key={loc.id}
                  onClick={() => { setSelectedLocationId(loc.id); setManuallyCleared(false); }}
                  className="w-full rounded-2xl bg-card border border-border/60 p-4 text-left hover:border-primary/50 transition-all"
                >
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {loc.name}
                  </p>
                  {loc.address && (
                    <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                  )}
                  <p className="text-[10px] text-idea-attention mt-1">Sem agenda cadastrada para hoje</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── REWARD SCREEN ──
  if (showReward && reward) {
    const status = getIdeaStatus(reward.score);
    const newStreak = streak + (existing ? 0 : 1);
    return (
      <div className="mx-auto max-w-lg px-4 py-8 flex flex-col items-center space-y-5 min-h-[80vh] justify-center">
        {/* Location badge */}
        {selectedLocation && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-foreground">{selectedLocation.name}</span>
          </div>
        )}
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">🗺️ Mapa do vazamento do dia</p>
            <div className="space-y-2.5">
              {[
                { label: 'No-shows', value: reward.lossNoshow, key: 'noshow' as const, emoji: '⚠️' },
                { label: 'Cancelamentos', value: reward.lossCancel, key: 'cancel' as const, emoji: '🚫' },
                { label: 'Buracos', value: reward.lossBuracos, key: 'buracos' as const, emoji: '📊' },
              ].map(item => (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2.5 transition-all',
                    item.key === reward.lossBiggest
                      ? 'bg-destructive/10 border border-destructive/30'
                      : 'bg-muted/30'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium',
                    item.key === reward.lossBiggest ? 'text-destructive font-bold' : 'text-foreground'
                  )}>
                    {item.emoji} {item.label}
                    {item.key === reward.lossBiggest && <span className="ml-1.5 text-[10px] font-bold uppercase">maior perda</span>}
                  </span>
                  <span className={cn(
                    'text-sm font-bold',
                    item.key === reward.lossBiggest ? 'text-destructive' : 'text-foreground'
                  )}>
                    {formatBRL(item.value)}
                  </span>
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

        {/* Check other locations */}
        {todayLocations.filter(l => l.id !== selectedLocationId && !checkedInLocationIds.includes(l.id)).length > 0 && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
              handleClearLocation();
              setShowReward(false);
              setEditMode(false);
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Fazer check-in em outro local
          </Button>
        )}

        <Button className="w-full h-12 rounded-xl text-sm font-semibold" onClick={() => navigate('/')}>
          Ver painel
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }

  const handleSaveSection = async (sectionName: string) => {
    if (!selectedLocationId) return;
    try {
      await saveCheckin.mutateAsync({
        ...form,
        cancellations: form.cancellations_private + form.cancellations_insurance,
        location_id: selectedLocationId,
        appointments_done: form.attended_private + form.attended_insurance,
        no_show: form.noshows_private + form.noshows_insurance,
      });
      toast.success(sectionName === 'encaixes' ? 'Encaixes salvos!' : 'Perdas salvas!');
      setActiveSection(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  // ── FOCUSED ENCAIXES SECTION ──
  if (activeSection === 'encaixes' && existing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSection(null)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card border border-border/60">
            <ChevronRight className="h-5 w-5 text-foreground rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Encaixes</h1>
            <p className="text-xs text-muted-foreground">Registre consultas extras do dia</p>
          </div>
        </div>

        {selectedLocation && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {selectedLocation.name}
          </div>
        )}

        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card space-y-4">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Consultas extras (fora da agenda)
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pacientes atendidos além dos agendados</p>
          </div>
          <CheckinField
            label="Quantos encaixes hoje?"
            value={form.extra_appointments}
            onChange={v => setField('extra_appointments', v)}
          />
          {form.extra_appointments > 0 && (
            <p className="text-[10px] text-primary font-medium">
              ✨ Capacidade efetiva: {effectiveCapacity} ({form.appointments_scheduled} agendadas + {form.extra_appointments} encaixes)
            </p>
          )}
        </div>

        <Button
          className="w-full h-12 rounded-xl text-sm font-semibold shadow-premium"
          onClick={() => handleSaveSection('encaixes')}
          disabled={saveCheckin.isPending}
        >
          {saveCheckin.isPending ? 'Salvando...' : 'Salvar encaixes'}
        </Button>
      </div>
    );
  }

  // ── FOCUSED PERDAS SECTION ──
  if (activeSection === 'perdas' && existing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSection(null)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card border border-border/60">
            <ChevronRight className="h-5 w-5 text-foreground rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Consultas não realizadas</h1>
            <p className="text-xs text-muted-foreground">Registre no-shows e cancelamentos</p>
          </div>
        </div>

        {selectedLocation && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {selectedLocation.name}
          </div>
        )}

        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-card space-y-5">
          {hasValidationError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-xs text-destructive flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Total de desfechos ({totalOutcomes}) excede a capacidade efetiva ({effectiveCapacity}).
              </p>
            </div>
          )}
          <p className="text-sm font-extrabold text-foreground uppercase tracking-wider">⚠️ No-shows</p>
          {paymentType === 'ambos' ? (
            <>
              <CheckinField
                label="No-shows Particular"
                value={form.noshows_private}
                onChange={v => setField('noshows_private', v)}
                max={maxNoshowPrivate}
              />
              <CheckinField
                label="No-shows Convênio"
                value={form.noshows_insurance}
                onChange={v => setField('noshows_insurance', v)}
                max={maxNoshowInsurance}
              />
            </>
          ) : (
            <CheckinField
              label="No-show"
              value={paymentType === 'particular' ? form.noshows_private : form.noshows_insurance}
              onChange={v => setField(paymentType === 'particular' ? 'noshows_private' : 'noshows_insurance', v)}
              max={Math.max(0, maxNoshowsTotal)}
            />
          )}
          <p className="text-sm font-extrabold text-foreground uppercase tracking-wider mt-4 pt-4 border-t border-border/40">🚫 Cancelamentos</p>
          {paymentType === 'ambos' ? (
            <>
              <CheckinField
                label="Cancelamentos Particular"
                value={form.cancellations_private}
                onChange={v => setField('cancellations_private', v)}
                max={maxCancelPrivate}
              />
              <CheckinField
                label="Cancelamentos Convênio"
                value={form.cancellations_insurance}
                onChange={v => setField('cancellations_insurance', v)}
                max={maxCancelInsurance}
              />
            </>
          ) : (
            <CheckinField
              label="Cancelamentos"
              value={paymentType === 'particular' ? form.cancellations_private : form.cancellations_insurance}
              onChange={v => setField(paymentType === 'particular' ? 'cancellations_private' : 'cancellations_insurance', v)}
              max={Math.max(0, maxCancellationsTotal)}
            />
          )}
          {/* Buracos auto */}
          <div className="flex w-full flex-col gap-2.5 border-t border-border/40 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-foreground uppercase tracking-wider">📊 Buracos na Agenda</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                auto
              </span>
            </div>
            <p className="text-center text-2xl font-bold text-foreground">{form.empty_slots}</p>
            <p className="text-[10px] text-muted-foreground text-center">
              Calculado: {form.appointments_scheduled} agendados − {totalOutcomes} desfechos
            </p>
          </div>

          <p className="text-sm font-extrabold text-foreground uppercase tracking-wider mt-4 pt-4 border-t border-border/40">🔄 Remarcações</p>
          <CheckinField
            label="Consultas remarcadas"
            value={form.rescheduled}
            onChange={v => setField('rescheduled', v)}
            max={form.appointments_scheduled}
          />
        </div>

        <Button
          className="w-full h-12 rounded-xl text-sm font-semibold shadow-premium"
          onClick={() => handleSaveSection('perdas')}
          disabled={saveCheckin.isPending || hasValidationError}
        >
          {saveCheckin.isPending ? 'Salvando...' : hasValidationError ? 'Corrija os valores acima' : 'Salvar consultas não realizadas'}
        </Button>
      </div>
    );
  }

  // ── SUMMARY SCREEN (checkin already done today) ──
  if (existing && !editMode && !showReward) {
    const e = existing as any;
    const attended = (e.attended_private ?? 0) + (e.attended_insurance ?? 0);
    const noshows = (e.noshows_private ?? 0) + (e.noshows_insurance ?? 0);
    const checkinData = {
      appointments_scheduled: e.appointments_scheduled,
      attended_private: e.attended_private ?? 0,
      attended_insurance: e.attended_insurance ?? 0,
      noshows_private: e.noshows_private ?? 0,
      noshows_insurance: e.noshows_insurance ?? 0,
      cancellations: e.cancellations,
      new_appointments: e.new_appointments,
      empty_slots: e.empty_slots,
      followup_done: e.followup_done,
    };
    const ideaScore = calculateIDEA(checkinData, dailyCapacity, ticketPrivate, ticketInsurance);
    const status = getIdeaStatus(ideaScore);

    const extraAppts = e.extra_appointments ?? 0;

    // Action items for the day (always shown as quick-access buttons)
    const actionItems: { label: string; description: string; section: 'encaixes' | 'perdas'; icon: string }[] = [
      { label: 'Encaixes', description: 'Consultas extras do dia', section: 'encaixes', icon: '⚡' },
      { label: 'Consultas não realizadas', description: 'No-shows e cancelamentos', section: 'perdas', icon: '📋' },
    ];

    return (
      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-premium">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Check-in Concluído</h1>
            <p className="text-xs text-muted-foreground">
              {selectedLocation ? selectedLocation.name : 'Seu check-in de hoje já foi registrado.'}
            </p>
          </div>
        </div>

        {/* Location badge */}
        {selectedLocation?.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {selectedLocation.address}
          </div>
        )}

        {/* IDEA Score mini */}
        <div className={cn(
          'rounded-2xl p-5 text-center',
          status === 'critical' && 'idea-critical',
          status === 'attention' && 'idea-attention',
          status === 'stable' && 'idea-stable',
        )}>
          <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Índice DAMA</p>
          <p className="text-5xl font-extrabold text-white mt-1">{ideaScore}</p>
          <p className="text-sm font-semibold text-white/90 mt-1">{getIdeaLabel(status)}</p>
        </div>

        {/* Quick action buttons for updating throughout the day */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">🔄 Atualize durante o dia</p>
          <div className="grid grid-cols-2 gap-2">
            {actionItems.map(item => (
              <button
                key={item.section}
                onClick={() => setActiveSection(item.section)}
                className="rounded-2xl bg-card border border-border/60 p-4 text-left transition-all hover:border-primary/40 active:scale-[0.98] shadow-card"
              >
                <p className="text-base mb-1">{item.icon}</p>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resumo do dia</p>
          {[
            { label: 'Agendados', value: e.appointments_scheduled },
            ...(extraAppts > 0 ? [{ label: 'Encaixes', value: extraAppts }] : []),
            { label: 'Atendidos', value: attended },
            { label: 'No-shows', value: noshows },
            { label: 'Cancelamentos', value: (e.cancellations_private ?? 0) + (e.cancellations_insurance ?? 0) || e.cancellations },
            { label: 'Remarcações', value: e.rescheduled ?? 0 },
            { label: 'Buracos', value: e.empty_slots },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-bold text-foreground">{item.value}</span>
            </div>
          ))}
          {e.notes && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm text-foreground mt-1">{e.notes}</p>
            </div>
          )}
        </div>

        {/* Edit full check-in */}
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => setEditMode(true)}
        >
          Editar check-in completo
        </Button>

        {/* Check other locations */}
        {todayLocations.filter(l => l.id !== selectedLocationId && !checkedInLocationIds.includes(l.id)).length > 0 && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
              handleClearLocation();
              setEditMode(false);
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Check-in em outro local
          </Button>
        )}

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
          <p className="text-xs text-muted-foreground">Tenha clareza da sua agenda em apenas 60 segundos.</p>
        </div>
      </div>

      {/* Location indicator */}
      {selectedLocation && (
        <div className="mb-4 rounded-2xl bg-card border border-primary/20 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedLocation.name}</p>
              {selectedLocation.address && (
                <p className="text-[11px] text-muted-foreground">{selectedLocation.address}</p>
              )}
            </div>
          </div>
          {allLocations.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={() => handleClearLocation()}
            >
              Trocar
            </Button>
          )}
        </div>
      )}

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

      {/* Validation warnings removed from here – shown inside losses section only */}

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
            {/* ── SEÇÃO 1: AGENDA DO DIA (manhã) ── */}
            <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">📅 Agenda do dia</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Preencha pela manhã</p>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Capacidade: {dailyCapacity} vagas
                </span>
              </div>
              <CheckinField
                label="Agendados"
                value={form.appointments_scheduled}
                onChange={v => setField('appointments_scheduled', v)}
                max={dailyCapacity}
                hint={form.appointments_scheduled >= dailyCapacity ? 'Agenda lotada! Use "Encaixes" para consultas extras.' : undefined}
              />
            </div>

            {/* ── SEÇÃO 2: ATENDIMENTOS (sempre visível no planejamento) ── */}
            {form.appointments_scheduled > 0 && (
            <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-5">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  📋 Atendimentos previstos para hoje
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Quantos pacientes você espera atender?
                </p>
              </div>
              {paymentType === 'ambos' ? (
                <>
                  <CheckinField
                    label="Atendimentos Particular"
                    value={form.attended_private}
                    onChange={v => setField('attended_private', v)}
                    max={maxAttendedPrivate}
                  />
                  <CheckinField
                    label="Atendimentos Convênio"
                    value={form.attended_insurance}
                    onChange={v => setField('attended_insurance', v)}
                    max={maxAttendedInsurance}
                  />
                </>
              ) : (
                <CheckinField
                  label="Atendimentos previstos"
                  value={paymentType === 'particular' ? form.attended_private : form.attended_insurance}
                  onChange={v => setField(paymentType === 'particular' ? 'attended_private' : 'attended_insurance', v)}
                  max={effectiveCapacity}
                />
              )}
            </div>
            )}

            {/* ── ENCAIXES (só após save) ── */}
            {form.appointments_scheduled > 0 && (existing || editMode) && (
            <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-4">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Encaixes (consultas extras)
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pacientes atendidos fora da agenda original</p>
              </div>
              <CheckinField
                label="Quantos encaixes hoje?"
                value={form.extra_appointments}
                onChange={v => setField('extra_appointments', v)}
              />
              {form.extra_appointments > 0 && (
                <p className="text-[10px] text-primary font-medium">
                  ✨ Capacidade efetiva: {effectiveCapacity} ({dailyCapacity} agendadas + {form.extra_appointments} encaixes)
                </p>
              )}
            </div>
            )}

            {/* ── SEÇÃO 3: PERDAS (só aparece depois do primeiro save) ── */}
            {form.appointments_scheduled > 0 && (existing || editMode) && (
            <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card space-y-5">
              {hasValidationError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                  <p className="text-xs text-destructive flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Total de desfechos ({totalOutcomes}) excede a capacidade efetiva ({effectiveCapacity}). Reduza os valores ou adicione encaixes.
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-extrabold text-foreground uppercase tracking-wider">⚠️ No-shows</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Registre conforme ocorrerem ou ao final do dia</p>
              </div>
              {paymentType === 'ambos' ? (
                <>
                  <CheckinField
                    label="No-shows Particular"
                    value={form.noshows_private}
                    onChange={v => setField('noshows_private', v)}
                    max={maxNoshowPrivate}
                  />
                  <CheckinField
                    label="No-shows Convênio"
                    value={form.noshows_insurance}
                    onChange={v => setField('noshows_insurance', v)}
                    max={maxNoshowInsurance}
                  />
                </>
              ) : (
                <CheckinField
                  label="No-show"
                  value={paymentType === 'particular' ? form.noshows_private : form.noshows_insurance}
                  onChange={v => setField(paymentType === 'particular' ? 'noshows_private' : 'noshows_insurance', v)}
                  max={Math.max(0, maxNoshowsTotal)}
                />
              )}
              <p className="text-sm font-extrabold text-foreground uppercase tracking-wider mt-4 pt-4 border-t border-border/40">🚫 Cancelamentos</p>
              {paymentType === 'ambos' ? (
                <>
                  <CheckinField
                    label="Cancelamentos Particular"
                    value={form.cancellations_private}
                    onChange={v => setField('cancellations_private', v)}
                    max={maxCancelPrivate}
                  />
                  <CheckinField
                    label="Cancelamentos Convênio"
                    value={form.cancellations_insurance}
                    onChange={v => setField('cancellations_insurance', v)}
                    max={maxCancelInsurance}
                  />
                </>
              ) : (
                <CheckinField
                  label="Cancelamentos"
                  value={paymentType === 'particular' ? form.cancellations_private : form.cancellations_insurance}
                  onChange={v => setField(paymentType === 'particular' ? 'cancellations_private' : 'cancellations_insurance', v)}
                  max={Math.max(0, maxCancellationsTotal)}
                />
              )}
              {/* Buracos auto */}
              <div className="flex w-full flex-col gap-2.5 border-t border-border/40 pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-foreground uppercase tracking-wider">📊 Buracos na Agenda</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    auto
                  </span>
                </div>
                <p className="text-center text-2xl font-bold text-foreground">{form.empty_slots}</p>
                <p className="text-[10px] text-muted-foreground text-center">
                  Calculado automaticamente: {form.appointments_scheduled} agendados − {totalOutcomes} desfechos
                </p>
              </div>
              <p className="text-sm font-extrabold text-foreground uppercase tracking-wider mt-4 pt-4 border-t border-border/40">🔄 Remarcações</p>
              <CheckinField label="Consultas remarcadas" value={form.rescheduled} onChange={v => setField('rescheduled', v)} max={form.appointments_scheduled} />
            </div>
            )}


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
          disabled={
            saveCheckin.isPending ||
            generateActions.isPending ||
            !selectedLocationId ||
            hasValidationError ||
            (!quickMode && form.appointments_scheduled === 0 && totalAttendedNow === 0 && totalNoshowsNow === 0 && totalCancellationsNow === 0 && form.extra_appointments === 0)
          }
        >
          {saveCheckin.isPending ? 'Salvando...' : hasValidationError ? 'Corrija os valores acima' : existing ? 'Atualizar check-in' : 'Salvar agenda do dia'}
        </Button>
      </form>
    </div>
  );
}
