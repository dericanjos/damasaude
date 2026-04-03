import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeekCheckins, useAllCheckins } from '@/hooks/useCheckin';
import { calculateIDEA, getIdeaStatus, getIdeaLabel, type CheckinData } from '@/lib/idea';
import { formatBRL, formatPercent, DEFAULT_DAILY_CAPACITY } from '@/lib/revenue';
import { useClinic } from '@/hooks/useClinic';
import { useLocationFilter } from '@/hooks/useLocationFilter';
import { useActiveLocations, useAllLocationFinancials, useAllLocationSchedules } from '@/hooks/useLocations';
import LocationSelector from '@/components/LocationSelector';
import { supabase } from '@/integrations/supabase/client';
import { getCapacityForDate, parseDailyCapacities } from '@/lib/days';
import { Button } from '@/components/ui/button';
import { startOfWeek, subWeeks, addWeeks, format, getDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Loader2, Sparkles, Mail, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { aggregateCheckins, getWorstLeaker, getMostEfficient } from '@/lib/aggregation';

/** Helper to convert a DB checkin row to CheckinData */
function toCheckinData(c: any): CheckinData {
  return {
    appointments_scheduled: c.appointments_scheduled,
    attended_private: c.attended_private ?? c.appointments_done ?? 0,
    attended_insurance: c.attended_insurance ?? 0,
    noshows_private: c.noshows_private ?? c.no_show ?? 0,
    noshows_insurance: c.noshows_insurance ?? 0,
    cancellations: c.cancellations,
    new_appointments: c.new_appointments,
    empty_slots: c.empty_slots,
    followup_done: c.followup_done,
  };
}

export default function WeeklyReportPage() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: clinic } = useClinic();
  const { selectedLocationId } = useLocationFilter();
  const locations = useActiveLocations();
  const { data: allCheckins = [] } = useAllCheckins(selectedLocationId);
  const { data: allFinancials = [] } = useAllLocationFinancials();
  const { data: allSchedules = [] } = useAllLocationSchedules();
  const caps = parseDailyCapacities((clinic as any)?.daily_capacities);
  const dailyCapacity = (clinic as any)?.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
  const workingDays: string[] = Array.isArray((clinic as any)?.working_days) ? (clinic as any).working_days : ['seg', 'ter', 'qua', 'qui', 'sex'];

  // Per-location working days count based on active schedules
  const locationWorkingDaysCount = useMemo(() => {
    if (selectedLocationId) {
      const activeSchedules = allSchedules.filter(s => s.location_id === selectedLocationId && s.is_active);
      return activeSchedules.length || workingDays.length;
    }
    return workingDays.length;
  }, [selectedLocationId, allSchedules, workingDays.length]);

  const targetFillRate = clinic?.target_fill_rate ?? 0.85;
  const targetNoShowRate = clinic?.target_noshow_rate ?? 0.05;

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset < 0 ? subWeeks(base, Math.abs(weekOffset)) : addWeeks(base, weekOffset);
  }, [weekOffset]);

  const { data: checkins = [] } = useWeekCheckins(weekStart, selectedLocationId);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekLabel = format(weekStart, "'Semana de' dd 'de' MMMM", { locale: ptBR });

  // AI Report state
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [reportFetched, setReportFetched] = useState(false);

  useEffect(() => {
    if (!clinic?.id || checkins.length === 0) {
      setAiReport(null);
      setReportFetched(true);
      return;
    }
    let cancelled = false;
    setReportFetched(false);
    setAiReport(null);
    setAiError(null);

    const fetchOrGenerate = async () => {
      setAiLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
          body: { week_start: weekStartStr, clinic_id: clinic.id },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.error === 'no_data') {
          setAiReport(null);
        } else if (data?.report?.report_text) {
          setAiReport(data.report.report_text);
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (e: any) {
        if (!cancelled) setAiError(e?.message || 'Erro ao gerar relatório');
      } finally {
        if (!cancelled) {
          setAiLoading(false);
          setReportFetched(true);
        }
      }
    };
    fetchOrGenerate();
    return () => { cancelled = true; };
  }, [clinic?.id, weekStartStr, checkins.length]);

  // Stats - use per-location aggregation
  const isConsolidated = !selectedLocationId;
  const locationNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of locations) map[l.id] = l.name;
    return map;
  }, [locations]);

  const agg = useMemo(() => {
    if (checkins.length === 0) return null;
    return aggregateCheckins(checkins, allFinancials, (c) => {
      const weekday = getDay(parseISO(c.date));
      const sched = allSchedules.find(s => s.location_id === c.location_id && s.weekday === weekday && s.is_active);
      return sched?.daily_capacity ?? (getCapacityForDate(c.date, caps) || dailyCapacity);
    });
  }, [checkins, allFinancials, allSchedules, caps, dailyCapacity]);

  const worstLeaker = useMemo(() => {
    if (!agg || !isConsolidated) return null;
    return getWorstLeaker(agg.lostByLocation, locationNamesMap);
  }, [agg, isConsolidated, locationNamesMap]);

  const scores = checkins.map(c => {
    const data = toCheckinData(c);
    const dayCap = getCapacityForDate(c.date, caps) || dailyCapacity;
    // For IDEA we still use clinic-level tickets as it's a composite score
    const ticketP = (clinic as any)?.ticket_private ?? 250;
    const ticketI = (clinic as any)?.ticket_insurance ?? 100;
    return { date: c.date, score: calculateIDEA(data, dayCap, ticketP, ticketI), data };
  });

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length) : null;
  const avgStatus = avgScore != null ? getIdeaStatus(avgScore) : null;

  const totalRevenueEstimated = agg?.totalRevenueEstimated ?? 0;
  const totalRevenueLost = agg?.totalRevenueLost ?? 0;
  const totalDone = agg?.totalAttended ?? 0;
  const totalNoShow = agg?.totalNoshows ?? 0;
  const totalCancellations = agg?.totalCancellations ?? 0;
  const totalEmptySlots = agg?.totalEmptySlots ?? 0;
  const avgOccupancy = agg?.occupancyRate ?? 0;
  const avgNoShow = agg?.noShowRate ?? 0;

  // For consolidated view: require all locations to have enough data individually
  const hasEnoughData = useMemo(() => {
    if (isConsolidated && locations.length > 1) {
      // Each location must have enough check-ins based on its own schedule
      return locations.every(loc => {
        const locSchedules = allSchedules.filter(s => s.location_id === loc.id && s.is_active);
        const locWorkingDays = locSchedules.length || workingDays.length;
        const locCheckins = allCheckins.filter((c: any) => c.location_id === loc.id);
        return locCheckins.length >= locWorkingDays;
      });
    }
    return allCheckins.length >= locationWorkingDaysCount;
  }, [isConsolidated, locations, allSchedules, allCheckins, locationWorkingDaysCount, workingDays.length]);

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-premium">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Relatório Semanal</h1>
          <p className="text-xs text-muted-foreground capitalize">{weekLabel}</p>
        </div>
      </div>

      {/* Location selector */}
      {locations.length > 1 && <LocationSelector />}

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-2 py-1 shadow-card">
        <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {format(weekStart, "dd MMM", { locale: ptBR })}
        </span>
        <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}>
          Próxima <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {!hasEnoughData ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card py-12 text-center px-6">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">
            {isConsolidated && locations.length > 1
              ? 'Relatório consolidado requer dados de todas as clínicas'
              : 'Seu primeiro relatório semanal está quase pronto'}
          </p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {isConsolidated && locations.length > 1
              ? 'O relatório consolidado será gerado quando cada clínica tiver completado seus check-ins mínimos da semana.'
              : `Seu primeiro relatório semanal será gerado após ${locationWorkingDaysCount} dias de dados. Continue fazendo seus check-ins diários!`}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            {isConsolidated && locations.length > 1 ? (
              <span className="flex flex-col gap-1 items-center">
                {locations.map(loc => {
                  const locSchedules = allSchedules.filter(s => s.location_id === loc.id && s.is_active);
                  const locWorkingDays = locSchedules.length || workingDays.length;
                  const locCheckins = allCheckins.filter((c: any) => c.location_id === loc.id);
                  const done = locCheckins.length >= locWorkingDays;
                  return (
                    <span key={loc.id} className={cn('text-xs', done ? 'text-revenue-gain' : 'text-muted-foreground')}>
                      {loc.name}: <span className="font-bold">{locCheckins.length}/{locWorkingDays}</span> {done ? '✓' : ''}
                    </span>
                  );
                })}
              </span>
            ) : (
              <>Check-ins realizados: <span className="font-bold text-foreground">{allCheckins.length}/{locationWorkingDaysCount}</span></>
            )}
          </p>
        </div>
      ) : checkins.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum check-in nesta semana.</p>
          <p className="text-xs text-muted-foreground mt-1">Faça o check-in diário para ver seu relatório.</p>
        </div>
      ) : (
        <>
          {/* AI Diagnosis */}
          <div className="rounded-2xl bg-card border border-primary/30 shadow-card overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Diagnóstico Semanal</p>
            </div>
            <div className="px-4 pb-4">
              {aiLoading ? (
                <div className="flex items-center gap-2 py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Gerando seu diagnóstico semanal... Isso pode levar até 60 segundos.</p>
                </div>
              ) : aiError ? (
                <div className="py-3">
                  <p className="text-xs text-muted-foreground">{aiError}</p>
                  <Button variant="outline" size="sm" className="mt-2 rounded-xl text-xs" onClick={() => setReportFetched(false)}>
                    Tentar novamente
                  </Button>
                </div>
              ) : aiReport ? (
                <div className="prose prose-sm prose-invert max-w-none text-foreground">
                  <ReactMarkdown>{aiReport}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-3">Nenhum dado disponível para gerar o diagnóstico desta semana.</p>
              )}
            </div>
          </div>

          {/* IDEA avg */}
          {avgScore != null && (
            <button
              onClick={() => navigate('/idea')}
              className={cn(
                'w-full rounded-2xl p-5 shadow-elevated text-center cursor-pointer transition-transform active:scale-[0.98]',
                avgStatus === 'critical' && 'idea-critical',
                avgStatus === 'attention' && 'idea-attention',
                avgStatus === 'stable' && 'idea-stable',
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest">IDEA Médio Semanal</p>
                <Info className="h-3 w-3 text-white/50" />
              </div>
              <p className="text-5xl font-extrabold text-white tracking-tight mt-1">{avgScore}</p>
              <p className="text-sm font-semibold text-white/90 mt-0.5">{getIdeaLabel(avgStatus!)}</p>
              <p className="text-[10px] text-white/50 mt-0.5">Índice DAMA de Eficiência do Atendimento</p>
            </button>
          )}

          {/* Revenue */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-revenue-gain" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Receita total</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatBRL(totalRevenueEstimated)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{totalDone} consultas</p>
            </div>
            <div className="rounded-2xl bg-card border border-revenue-loss/40 p-4 shadow-card">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="h-3.5 w-3.5 text-revenue-loss" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Receita perdida</span>
              </div>
              <p className="text-xl font-bold text-revenue-loss">{formatBRL(totalRevenueLost)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ineficiências operacionais</p>
            </div>
          </div>

          {/* Worst leaker - consolidated mode */}
          {worstLeaker && isConsolidated && (
            <div className="rounded-xl bg-card border border-revenue-loss/30 p-3.5 flex items-start gap-3 shadow-card">
              <AlertCircle className="h-4 w-4 shrink-0 text-revenue-loss mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-revenue-loss uppercase tracking-wider mb-0.5">Maior vazamento da semana</p>
                <p className="text-sm font-medium text-foreground">
                  {worstLeaker.name}: <span className="text-revenue-loss font-bold">{formatBRL(worstLeaker.lost)}</span> perdidos
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Indicadores da semana</p>
            </div>
            <div className="divide-y divide-border/50">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">Ocupação média</span>
                <span className={cn('text-sm font-bold', avgOccupancy >= targetFillRate ? 'text-revenue-gain' : 'text-idea-attention')}>
                  {formatPercent(avgOccupancy)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">Taxa de no-show</span>
                <span className={cn('text-sm font-bold', avgNoShow <= targetNoShowRate ? 'text-revenue-gain' : 'text-destructive')}>
                  {formatPercent(avgNoShow)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">No-show total</span>
                <span className="text-sm font-bold text-foreground">{totalNoShow}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">Cancelamentos</span>
                <span className="text-sm font-bold text-foreground">{totalCancellations}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">Buracos na agenda</span>
                <span className="text-sm font-bold text-foreground">{totalEmptySlots}</span>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full rounded-xl" onClick={() => toast.success('Relatório enviado! (simulação)')}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar relatório por email
          </Button>
        </>
      )}
    </div>
  );
}
