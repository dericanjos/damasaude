import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronDown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useTodayCheckin, useYesterdayCheckin, useTodayCheckins } from '@/hooks/useCheckin';
import { useTodayActions, useCompleteAction } from '@/hooks/useActions';
import { useClinic } from '@/hooks/useClinic';
import { useSubscription } from '@/hooks/useSubscription';
import { useCheckinStreak } from '@/hooks/useChecklist';
import { useLocationFilter } from '@/hooks/useLocationFilter';
import { useActiveLocations, useAllLocationFinancials, useAllLocationSchedules } from '@/hooks/useLocations';
import { calculateIDEA, getIdeaStatus, getIdeaLabel, totalAttended, totalNoshows, type CheckinData } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent, safePercent, DEFAULT_DAILY_CAPACITY, DEFAULT_TICKET_PRIVATE, DEFAULT_TICKET_INSURANCE } from '@/lib/revenue';
import { getCapacityForDate, parseDailyCapacities } from '@/lib/days';
import { aggregateCheckins, getWorstLeaker, getMostEfficient } from '@/lib/aggregation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import LocationSelector from '@/components/LocationSelector';
import SuccessChecklistCard from '@/components/SuccessChecklistCard';
import {
  TrendingDown, TrendingUp, AlertCircle, CheckCircle2,
  ClipboardCheck, ArrowRight, Bell, HelpCircle, Flame, Newspaper, Zap, FileX
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLatestMedicalNews, useMedicalNewsCount } from '@/hooks/useMedicalNews';
import { useLatestNews } from '@/hooks/useNews';
import { useEfficiencyBadge } from '@/hooks/useEfficiencyBadge';
import { cn } from '@/lib/utils';
import LossRadarCard from '@/components/LossRadarCard';
import EfficiencyBadgeModal from '@/components/EfficiencyBadgeModal';
import { useCheckinRealtime } from '@/hooks/useCheckinRealtime';


/** Helper to convert DB row to CheckinData */
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const { selectedLocationId } = useLocationFilter();
  const locations = useActiveLocations();
  const { data: todayCheckin } = useTodayCheckin(selectedLocationId || undefined);
  const { data: allTodayCheckins = [] } = useTodayCheckins();
  const { data: yesterdayCheckin } = useYesterdayCheckin(selectedLocationId || undefined);
  const { data: actions = [] } = useTodayActions(selectedLocationId);
  const completeAction = useCompleteAction();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const { data: latestMedicalNews } = useLatestMedicalNews();
  const { data: medicalNewsCount = 0 } = useMedicalNewsCount();
  const { data: oldNews } = useLatestNews();
  const { data: streak = 0 } = useCheckinStreak();
  const { data: hasBadge } = useEfficiencyBadge();
  const { data: allFinancials = [] } = useAllLocationFinancials();
  const { data: allSchedules = [] } = useAllLocationSchedules();

  useCheckinRealtime();

  const [checkinCollapsed, setCheckinCollapsed] = useState(true);

  const doctorName = (clinic as any)?.doctor_name || user?.user_metadata?.doctor_name || '';
  const doctorGender = (clinic as any)?.doctor_gender || 'masculino';
  const prefix = doctorGender === 'feminino' ? 'Dra.' : 'Dr.';
  const nameAlreadyHasPrefix = /^(dr\.|dra\.)\s/i.test(doctorName.trim());
  const firstName = nameAlreadyHasPrefix ? doctorName.trim().split(' ').slice(1).join(' ').split(' ')[0] || doctorName.trim() : doctorName.split(' ')[0];

  const targetFillRate = clinic?.target_fill_rate ?? 0.85;
  const targetNoShowRate = clinic?.target_noshow_rate ?? 0.05;
  const caps = parseDailyCapacities((clinic as any)?.daily_capacities);
  const clinicCapacity = getCapacityForDate(new Date(), caps);
  const ticketPrivate = (clinic as any)?.ticket_private ?? DEFAULT_TICKET_PRIVATE;
  const ticketInsurance = (clinic as any)?.ticket_insurance ?? DEFAULT_TICKET_INSURANCE;

  // Use location-specific capacity when a single location is selected
  const todayWeekdayDash = new Date().getDay();

  const { dailyCapacity, capacityIsFallback } = useMemo(() => {
    if (selectedLocationId) {
      const sched = allSchedules.find(
        s => s.location_id === selectedLocationId && s.weekday === todayWeekdayDash && s.is_active
      );
      if (sched) return { dailyCapacity: Math.max(sched.daily_capacity, 1), capacityIsFallback: false };
      // Fallback: use clinic capacity or default 16
      const fallback = Math.max(clinicCapacity, DEFAULT_DAILY_CAPACITY);
      return { dailyCapacity: fallback, capacityIsFallback: true };
    }
    return { dailyCapacity: Math.max(clinicCapacity, 1), capacityIsFallback: false };
  }, [selectedLocationId, allSchedules, todayWeekdayDash, clinicCapacity]);

  // ── Consolidated check-in status (X/Y locais) ──
  const todayWeekday = new Date().getDay();
  const locationsWithScheduleToday = useMemo(() => {
    const ids = new Set(
      allSchedules
        .filter(s => s.weekday === todayWeekday && s.is_active)
        .map(s => s.location_id)
    );
    return locations.filter(l => ids.has(l.id));
  }, [locations, allSchedules, todayWeekday]);

  const totalLocationsToday = locationsWithScheduleToday.length > 0
    ? locationsWithScheduleToday.length
    : locations.length; // fallback: all active

  const checkedInLocationIds = useMemo(() => {
    return new Set(allTodayCheckins.map((c: any) => c.location_id).filter(Boolean));
  }, [allTodayCheckins]);

  const checkedInCount = checkedInLocationIds.size;
  const allCheckedIn = checkedInCount >= totalLocationsToday && totalLocationsToday > 0;

  // Consolidated aggregation for "Todas as clínicas"
  const isConsolidated = !selectedLocationId && allTodayCheckins.length > 0;
  const locationNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of locations) map[l.id] = l.name;
    return map;
  }, [locations]);

  const consolidated = useMemo(() => {
    if (!isConsolidated) return null;
    return aggregateCheckins(allTodayCheckins, allFinancials, (c) => {
      const sched = allSchedules.find(s => s.location_id === c.location_id && s.weekday === todayWeekdayDash && s.is_active);
      return sched?.daily_capacity ?? Math.max(clinicCapacity, DEFAULT_DAILY_CAPACITY);
    });
  }, [isConsolidated, allTodayCheckins, allFinancials, allSchedules, todayWeekdayDash, clinicCapacity]);

  const worstLeaker = useMemo(() => {
    if (!consolidated) return null;
    return getWorstLeaker(consolidated.lostByLocation, locationNamesMap);
  }, [consolidated, locationNamesMap]);

  const mostEfficient = useMemo(() => {
    if (!consolidated) return null;
    return getMostEfficient(consolidated.occupancyByLocation, locationNamesMap);
  }, [consolidated, locationNamesMap]);

  // Renewal warning
  const showRenewalBanner = (() => {
    if (!subscriptionEnd) return false;
    if (subscriptionStatus !== 'testando' && subscriptionStatus !== 'ativo') return false;
    const diffDays = (new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays <= 3 && diffDays >= 0;
  })();

  const renewalDate = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '';

  const checkinData: CheckinData | null = todayCheckin ? toCheckinData(todayCheckin) : null;

  // Compute todayScore: prefer single-location data, fallback to consolidated
  const todayScore = useMemo(() => {
    if (checkinData && todayCheckin) {
      const ec = (todayCheckin as any);
      const effectiveCap = ec.appointments_scheduled + (ec.extra_appointments ?? 0);
      return calculateIDEA(checkinData, effectiveCap || dailyCapacity, ticketPrivate, ticketInsurance);
    }
    // If no single checkin but we have consolidated data (multiple locations, no filter)
    if (consolidated) {
      const syntheticData: CheckinData = {
        appointments_scheduled: consolidated.totalScheduled,
        attended_private: consolidated.totalAttended,
        attended_insurance: 0,
        noshows_private: consolidated.totalNoshows,
        noshows_insurance: 0,
        cancellations: consolidated.totalCancellations,
        new_appointments: 0,
        empty_slots: consolidated.totalEmptySlots,
        followup_done: true,
      };
      const safeCap = Math.max(consolidated.totalCapacity, 1);
      return calculateIDEA(syntheticData, safeCap, ticketPrivate, ticketInsurance);
    }
    return null;
  }, [checkinData, todayCheckin, dailyCapacity, ticketPrivate, ticketInsurance, consolidated]);

  const yesterdayScore = yesterdayCheckin
    ? calculateIDEA(toCheckinData(yesterdayCheckin), (yesterdayCheckin as any).appointments_scheduled + ((yesterdayCheckin as any).extra_appointments ?? 0) || dailyCapacity, ticketPrivate, ticketInsurance)
    : null;

  const revenue = checkinData && todayCheckin
    ? calculateRevenue({
        ...checkinData,
        daily_capacity: (todayCheckin as any).appointments_scheduled + ((todayCheckin as any).extra_appointments ?? 0) || dailyCapacity,
        ticket_private: ticketPrivate,
        ticket_insurance: ticketInsurance,
      })
    : null;

  // Use consolidated metrics when in "Todos" mode, otherwise use single-location revenue
  const displayRevenue = useMemo(() => {
    if (consolidated) {
      return {
        estimated: consolidated.totalRevenueEstimated,
        lost: consolidated.totalRevenueLost,
        occupancyRate: consolidated.totalCapacity > 0 ? consolidated.occupancyRate : null,
        noShowRate: consolidated.noShowRate,
        totalAttended: consolidated.totalAttended,
        totalNoshows: consolidated.totalNoshows,
        totalLosses: consolidated.totalNoshows + consolidated.totalCancellations + consolidated.totalEmptySlots,
      };
    }
    if (revenue && checkinData) {
      return {
        estimated: revenue.estimated,
        lost: revenue.lost,
        occupancyRate: dailyCapacity > 0 ? revenue.occupancyRate : null,
        noShowRate: revenue.noShowRate,
        totalAttended: revenue.totalAttended,
        totalNoshows: revenue.totalNoshows,
        totalLosses: revenue.totalNoshows + checkinData.cancellations + checkinData.empty_slots,
      };
    }
    return null;
  }, [consolidated, revenue, checkinData, dailyCapacity]);

  const ideaStatus = todayScore != null ? getIdeaStatus(todayScore) : null;

  // IDEA status description
  const ideaDescription = (() => {
    if (!ideaStatus) return '';
    switch (ideaStatus) {
      case 'stable': return '🟢 Agenda estável e sob controle. Mantenha a consistência.';
      case 'attention': return '🟡 Sua agenda requer atenção. Existem pontos de melhoria claros.';
      case 'critical': return '🔴 Risco operacional. Sua agenda e receita estão vulneráveis hoje.';
    }
  })();

  // Single priority alert (1 per day, most relevant)
  type Alert = { type: 'warn' | 'ok'; label: string; message: string; action?: string };
  const alert: Alert = useMemo(() => {
    // For consolidated mode, use consolidated metrics
    const rev = displayRevenue;
    const cd = checkinData;

    if (!rev) return { type: 'ok' as const, label: 'STATUS', message: 'Faça o check-in para ver seus alertas.' };

    // Priority order: lost revenue > no-show > occupancy > follow-up
    if (rev.lost > 500)
      return { type: 'warn' as const, label: 'ALERTA FINANCEIRO', message: `Vazamento de ${formatBRL(rev.lost)} hoje entre faltas, cancelamentos e buracos na agenda.` };
    if (rev.noShowRate > targetNoShowRate)
      return { type: 'warn' as const, label: 'ALERTA DE AGENDA', message: `Taxa de no-show (${safePercent(rev.noShowRate)}) acima da meta (${formatPercent(targetNoShowRate)}).` };
    if (rev.occupancyRate != null && rev.occupancyRate < targetFillRate)
      return { type: 'warn' as const, label: 'ALERTA DE OCUPAÇÃO', message: `Ocupação (${safePercent(rev.occupancyRate)}) abaixo da meta (${formatPercent(targetFillRate)}).` };
    if (cd && !cd.followup_done)
      return { type: 'warn' as const, label: 'ALERTA DE PROCESSO', message: 'Follow-up não executado hoje. Risco de perder oportunidades de reagendamento.' };

    return { type: 'ok' as const, label: 'AGENDA DENTRO DAS METAS', message: 'Sua operação está alinhada com as metas. Ótimo trabalho.' };
  }, [displayRevenue, checkinData, targetNoShowRate, targetFillRate]);

  const handleComplete = (id: string) => {
    completeAction.mutate(id, {
      onSuccess: () => toast.success('Ação concluída!'),
    });
  };

  const pendingActions = actions.filter(a => a.status === 'pending');
  const criticalAction = pendingActions[0] ?? null;
  const nextActions = pendingActions.slice(1, 3);

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
      <EfficiencyBadgeModal />
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Olá, {nameAlreadyHasPrefix ? '' : `${prefix} `}{firstName} {hasBadge && <span title="Selo de Clínica Eficiente">🏅</span>} 👋
           </h1>
          <p className="text-sm text-muted-foreground">Visão do dia</p>
          <p className="text-xs text-muted-foreground/70 capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showRenewalBanner && (
            <div className="flex items-center gap-1.5 rounded-full bg-idea-attention/10 border border-idea-attention/30 px-2.5 py-1">
              <Bell className="h-3 w-3 text-idea-attention" />
              <span className="text-[11px] font-medium text-idea-attention">Renova {renewalDate}</span>
            </div>
          )}
          <Link
            to="/institucional"
            className="text-xs font-semibold text-[#D4AF37] hover:text-[#e0c04a] transition-colors flex items-center gap-1"
          >
            Conheça a DAMA →
          </Link>
        </div>
      </div>

      {/* Location selector */}
      {locations.length > 1 && (
        <LocationSelector />
      )}

      {/* ── VERSE MINI-CARD ── */}
      <button
        onClick={() => navigate('/versiculo')}
        className="w-full rounded-2xl bg-card border border-primary/20 p-3 flex items-center gap-3 shadow-card transition-transform active:scale-[0.99]"
      >
        <span className="text-lg">📖</span>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Versículo do dia</p>
          <p className="text-[11px] text-muted-foreground">Toque para ler e compartilhar</p>
        </div>
      </button>

      {/* ── SUCCESS CHECKLIST (always first action) ── */}
      <SuccessChecklistCard />

      {/* ── CHECK-IN PROMPT or UPDATE PROMPT or IDEA SCORE ── */}
      {/* Consolidated mode: show X/Y check-in status */}
      {!selectedLocationId && locations.length > 1 && todayScore == null && (
        <button
          onClick={() => navigate('/checkin')}
          className="w-full rounded-2xl gradient-primary p-5 text-left shadow-premium transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/75 uppercase tracking-wider">Check-ins do dia</p>
              <p className="mt-1 text-lg font-bold text-white">
                {checkedInCount}/{totalLocationsToday} locais concluídos
              </p>
              <p className="text-sm text-white/75 mt-0.5">
                {allCheckedIn
                  ? 'Todos os check-ins do dia estão concluídos.'
                  : 'Fazer check-in no próximo local'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </button>
      )}

      {/* Consolidated mode with checkins done: collapsed status */}
      {!selectedLocationId && locations.length > 1 && todayScore != null && checkinCollapsed && (
        <button
          onClick={() => setCheckinCollapsed(false)}
          className="w-full rounded-2xl border p-3 flex items-center justify-between transition-all duration-300 ease-in-out"
          style={{
            backgroundColor: allCheckedIn ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            borderColor: allCheckedIn ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)',
            maxHeight: '48px',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: allCheckedIn ? 'rgb(34, 197, 94)' : 'rgb(234, 179, 8)' }} />
            <span className="text-sm font-semibold text-foreground truncate">
              Check-ins: {checkedInCount}/{totalLocationsToday} locais | Receita: {displayRevenue ? formatBRL(displayRevenue.estimated) : 'R$0'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* Single location mode: original check-in prompt */}
      {(selectedLocationId || locations.length <= 1) && todayScore == null && (
        <button
          onClick={() => navigate('/checkin')}
          className="w-full rounded-2xl gradient-primary p-5 text-left shadow-premium transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/75 uppercase tracking-wider">Check-in do dia pendente</p>
              <p className="mt-1 text-lg font-bold text-white">Fazer Check-in Agora</p>
              <p className="text-sm text-white/75 mt-0.5">Leve 60 segundos para ter clareza sobre sua agenda e receita de hoje.</p>
              {yesterdayScore != null && (
                <p className="text-xs text-white/65 mt-1.5 border-t border-white/15 pt-1.5">
                  Ontem seu Índice IDEA foi <span className="font-bold text-white/90">{yesterdayScore} ({getIdeaLabel(getIdeaStatus(yesterdayScore))})</span>. Faça o check-in para ver o de hoje.
                </p>
              )}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </button>
      )}

      {/* Single location collapsed check-in */}
      {(selectedLocationId || locations.length <= 1) && todayScore != null && checkinCollapsed && (
        <button
          onClick={() => setCheckinCollapsed(false)}
          className="w-full rounded-2xl border p-3 flex items-center justify-between transition-all duration-300 ease-in-out"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            maxHeight: '48px',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'rgb(34, 197, 94)' }} />
            <span className="text-sm font-semibold text-foreground truncate">
              Check-in feito! Atendidos: {displayRevenue?.totalAttended ?? 0} | Receita: {displayRevenue ? formatBRL(displayRevenue.estimated) : 'R$0'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* ── EXPANDED IDEA SCORE ── */}
      {todayScore != null && !checkinCollapsed && (
        <div className={cn(
          'rounded-2xl p-5 shadow-elevated transition-all duration-300 ease-in-out',
          ideaStatus === 'critical' && 'idea-critical',
          ideaStatus === 'attention' && 'idea-attention',
          ideaStatus === 'stable' && 'idea-stable',
        )}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Seu Índice IDEA de hoje</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-white/50 hover:text-white/80 transition-colors">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-sm" side="bottom">
                    <p className="font-semibold mb-1">O que é o Índice IDEA?</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      O IDEA mede a eficiência da sua agenda com base em ocupação, no-shows e cancelamentos. Score acima de 70 = agenda saudável. Quanto maior, menos receita você está perdendo.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
              <button onClick={() => navigate('/idea')} className="text-left group">
                <p className="text-5xl font-extrabold text-white tracking-tight mt-0.5 group-hover:opacity-90 transition-opacity">{todayScore}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-sm font-semibold text-white/90">{getIdeaLabel(ideaStatus!)}</p>
                  <Info className="h-3 w-3 text-white/50" />
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">Índice DAMA de Eficiência do Atendimento</p>
              </button>
              <p className="text-[11px] text-white/60 mt-0.5">Quanto maior, mais eficiente sua agenda</p>
              {yesterdayScore != null && (
                <p className="text-xs text-white/65 mt-1">
                  {todayScore - yesterdayScore > 0 ? `+${todayScore - yesterdayScore}` : todayScore - yesterdayScore} vs ontem
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right opacity-70">
                <p className="text-sm text-white font-bold">{todayScore}<span className="text-base text-white/60">/100</span></p>
              </div>
              <button
                onClick={() => setCheckinCollapsed(true)}
                className="text-white/50 hover:text-white/80 transition-colors"
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/80 border-t border-white/20 pt-2">
            {ideaDescription}
          </p>
          {capacityIsFallback && (
            <p className="mt-1 text-[10px] text-white/50 italic">⚠ Sem agenda cadastrada para hoje neste local.</p>
          )}
        </div>
      )}

      {/* ── QUICK UPDATE BUTTONS (only after check-in, single location) ── */}
      {todayScore != null && (selectedLocationId || locations.length <= 1) && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🔄 Atualize durante o dia</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/checkin?section=encaixes')}
              className="rounded-2xl bg-card border border-border/60 p-3.5 text-left transition-all hover:border-primary/40 active:scale-[0.98] shadow-card"
            >
              <Zap className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-sm font-semibold text-foreground">Encaixes</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Consultas extras</p>
            </button>
            <button
              onClick={() => navigate('/checkin?section=perdas')}
              className="rounded-2xl bg-card border border-border/60 p-3.5 text-left transition-all hover:border-primary/40 active:scale-[0.98] shadow-card"
            >
              <FileX className="h-4 w-4 text-idea-attention mb-1.5" />
              <p className="text-sm font-semibold text-foreground">Não realizadas</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">No-shows e cancelamentos</p>
            </button>
          </div>
        </div>
      )}

      {/* Consolidated mode: show check-in progress instead of update buttons */}
      {todayScore != null && !selectedLocationId && locations.length > 1 && !allCheckedIn && (
        <button
          onClick={() => navigate('/checkin')}
          className="w-full rounded-xl bg-card border border-idea-attention/30 p-3.5 flex items-center gap-3 shadow-card transition-transform active:scale-[0.99]"
        >
          <ClipboardCheck className="h-5 w-5 text-idea-attention" />
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-foreground">
              {checkedInCount}/{totalLocationsToday} check-ins concluídos
            </p>
            <p className="text-[10px] text-muted-foreground">Fazer check-in no próximo local</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* ── LOSS RADAR / TREND ALERT (only after check-in) ── */}
      {todayScore != null && <LossRadarCard />}

      {/* ── STREAK + IDEA GAUGE (only after check-in) ── */}
      {todayScore != null && (
        <div className="grid grid-cols-2 gap-3">
          {/* Streak */}
          <div className={cn(
            'rounded-2xl p-4 shadow-card flex flex-col items-center justify-center text-center',
            streak >= 3
              ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30'
              : 'bg-card border border-border/60'
          )}>
            <Flame className={cn('h-8 w-8 mb-1', streak >= 3 ? 'text-orange-500' : 'text-muted-foreground')} />
            <p className="text-2xl font-bold text-foreground">{streak} {streak === 1 ? 'dia' : 'dias'}</p>
            <p className="text-[11px] text-muted-foreground">
              {streak >= 3 ? '🔥 em chamas!' : 'de consistência'}
            </p>
          </div>
          {/* IDEA Gauge */}
          <button
            onClick={() => navigate('/idea')}
            className="rounded-2xl bg-card border border-border/60 p-4 shadow-card flex flex-col items-center justify-center text-center transition-transform active:scale-[0.98] cursor-pointer"
          >
            <div className="relative w-20 h-12 mb-1">
              <svg viewBox="0 0 120 70" className="w-full h-full">
                <path
                  d="M 10 65 A 50 50 0 0 1 110 65"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 65 A 50 50 0 0 1 110 65"
                  fill="none"
                  stroke={todayScore >= 71 ? 'hsl(142,71%,45%)' : todayScore >= 41 ? 'hsl(48,96%,53%)' : 'hsl(0,84%,60%)'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(todayScore / 100) * 157} 157`}
                />
                <text x="60" y="60" textAnchor="middle" className="fill-foreground text-2xl font-bold" fontSize="24">{todayScore}</text>
              </svg>
            </div>
            <div className="flex items-center gap-1">
              <p className="text-[11px] font-semibold text-muted-foreground">Índice IDEA</p>
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </div>
            <p className="text-[10px] text-muted-foreground/70">Índice DAMA de Eficiência do Atendimento</p>
          </button>
        </div>
      )}
      {displayRevenue && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-revenue-gain" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Receita est.</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatBRL(displayRevenue.estimated)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{displayRevenue.totalAttended} consultas</p>
          </div>
          <div className="rounded-2xl bg-card border border-revenue-loss/40 p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-revenue-loss" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Receita perdida</span>
            </div>
            <p className="text-2xl font-bold text-revenue-loss">{formatBRL(displayRevenue.lost)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{displayRevenue.totalLosses} perdas</p>
          </div>
        </div>
      )}

      {/* Worst leaker + most efficient - consolidated mode */}
      {worstLeaker && isConsolidated && (
        <div className="rounded-xl bg-card border border-revenue-loss/30 p-3.5 flex items-start gap-3 shadow-card">
          <AlertCircle className="h-4 w-4 shrink-0 text-revenue-loss mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-revenue-loss uppercase tracking-wider mb-0.5">Maior vazamento hoje</p>
            <p className="text-sm font-medium text-foreground">
              {worstLeaker.name}: <span className="text-revenue-loss font-bold">{formatBRL(worstLeaker.lost)}</span> perdidos
            </p>
            {mostEfficient && mostEfficient.locationId !== worstLeaker.locationId && (
              <p className="text-xs text-muted-foreground mt-1">
                Mais eficiente: <span className="font-semibold text-foreground">{mostEfficient.name}</span> ({safePercent(mostEfficient.occupancy)} ocupação)
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── OCCUPANCY + NO-SHOW ── */}
      {displayRevenue && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ocupação</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-foreground">
                {displayRevenue.occupancyRate != null ? safePercent(displayRevenue.occupancyRate) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">meta {formatPercent(targetFillRate)}</p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  displayRevenue.occupancyRate != null && displayRevenue.occupancyRate >= targetFillRate ? 'bg-idea-stable' : 'bg-idea-attention'
                )}
                style={{ width: `${Math.min(100, (displayRevenue.occupancyRate ?? 0) * 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">No-show</p>
            <div className="flex items-end justify-between">
              <p className={cn('text-2xl font-bold', displayRevenue.noShowRate > targetNoShowRate ? 'text-destructive' : 'text-foreground')}>
                {safePercent(displayRevenue.noShowRate)}
              </p>
              <p className="text-xs text-muted-foreground">meta {formatPercent(targetNoShowRate)}</p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full', displayRevenue.noShowRate <= targetNoShowRate ? 'bg-idea-stable' : 'bg-destructive')}
                style={{ width: `${Math.min(100, displayRevenue.noShowRate * 100 * 4)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SINGLE ALERT ── */}
      {(checkinData || isConsolidated) && (
        <div className={cn(
          'flex items-start gap-3 rounded-xl border p-3.5',
          alert.type === 'ok'
            ? 'bg-idea-stable/10 border-idea-stable/30'
            : 'bg-idea-attention/10 border-idea-attention/30'
        )}>
          {alert.type === 'ok'
            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-idea-stable mt-0.5" />
            : <AlertCircle className="h-4 w-4 shrink-0 text-idea-attention mt-0.5" />
          }
          <div>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-0.5', alert.type === 'ok' ? 'text-idea-stable' : 'text-idea-attention')}>
              {alert.label}
            </p>
            <p className={cn('text-sm font-medium', alert.type === 'ok' ? 'text-idea-stable' : 'text-idea-attention')}>
              {alert.message}
            </p>
            {alert.action && (
              <p className="text-xs text-muted-foreground mt-0.5">→ {alert.action}</p>
            )}
          </div>
        </div>
      )}

      {/* ── CRITICAL ACTION ── */}
      {criticalAction && (
        <div className="rounded-2xl bg-gradient-to-r from-destructive/20 to-destructive/5 border border-destructive/30 shadow-card overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">⚡ Ação Crítica de Hoje</p>
            <p className="text-[10px] text-muted-foreground">Esta é a ação com maior potencial de impacto no seu resultado de hoje.</p>
          </div>
          <div className="flex items-start gap-3 px-4 pb-4 pt-2">
            <button
              onClick={() => handleComplete(criticalAction.id)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-primary/50 hover:bg-primary/10 transition-colors"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{criticalAction.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 whitespace-normal break-words">{criticalAction.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── NEXT ACTIONS ── */}
      {nextActions.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Próximas Ações do Dia</p>
              <p className="text-xs text-muted-foreground">Complete estas ações para otimizar sua operação.</p>
            </div>
            <Badge variant="secondary" className="text-xs">{nextActions.length}</Badge>
          </div>
          <div className="divide-y divide-border/50">
            {nextActions.map((action) => (
              <div key={action.id} className="flex items-start gap-3 px-4 py-3">
                <button
                  onClick={() => handleComplete(action.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-border hover:bg-accent transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-normal break-words">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── MEDICAL NEWS BANNER ── */}
      {latestMedicalNews ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
          <a
            href={latestMedicalNews.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 text-left transition-all hover:bg-accent/5 active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Newspaper className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Notícias do Mundo Médico</p>
                <p className="text-sm font-semibold text-foreground line-clamp-2">{latestMedicalNews.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latestMedicalNews.summary}</p>
                <p className="text-[10px] text-primary/70 font-medium mt-1">{latestMedicalNews.source}</p>
              </div>
            </div>
          </a>
          {medicalNewsCount > 1 && (
            <button
              onClick={() => navigate('/noticias')}
              className="w-full border-t border-border/50 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-accent/5 transition-colors flex items-center justify-center gap-1"
            >
              Ver todas as notícias <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : oldNews && oldNews.length > 0 && (
        /* Fallback: old news table */
        <button
          onClick={() => navigate('/insights')}
          className="w-full rounded-2xl bg-card border border-border/60 shadow-card p-4 text-left transition-all hover:shadow-elevated active:scale-[0.99]"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Newspaper className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Notícias do Mundo Médico</p>
              <p className="text-sm font-semibold text-foreground line-clamp-1">{oldNews[0].title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{oldNews[0].summary}</p>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
