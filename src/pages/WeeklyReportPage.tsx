import { useState, useMemo } from 'react';
import { useWeekCheckins } from '@/hooks/useCheckin';
import { calculateIDEA, getIdeaStatus, getIdeaLabel, type CheckinData } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent, DEFAULT_DAILY_CAPACITY } from '@/lib/revenue';
import { useClinic } from '@/hooks/useClinic';
import { Button } from '@/components/ui/button';
import { startOfWeek, subWeeks, addWeeks, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function WeeklyReportPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: clinic } = useClinic();
  const dailyCapacity = (clinic as any)?.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
  const targetFillRate = clinic?.target_fill_rate ?? 0.85;
  const targetNoShowRate = clinic?.target_noshow_rate ?? 0.05;

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset < 0 ? subWeeks(base, Math.abs(weekOffset)) : addWeeks(base, weekOffset);
  }, [weekOffset]);

  const { data: checkins = [] } = useWeekCheckins(weekStart);

  const weekLabel = format(weekStart, "'Semana de' dd 'de' MMMM", { locale: ptBR });

  const scores = checkins.map(c => {
    const data: CheckinData = {
      appointments_scheduled: c.appointments_scheduled,
      appointments_done: c.appointments_done,
      no_show: c.no_show,
      cancellations: c.cancellations,
      new_appointments: c.new_appointments,
      empty_slots: c.empty_slots,
      followup_done: c.followup_done,
    };
    return { date: c.date, score: calculateIDEA(data, dailyCapacity), data };
  });

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length) : null;
  const avgStatus = avgScore != null ? getIdeaStatus(avgScore) : null;

  const totalNoShow = checkins.reduce((s, c) => s + c.no_show, 0);
  const totalCancellations = checkins.reduce((s, c) => s + c.cancellations, 0);
  const totalDone = checkins.reduce((s, c) => s + c.appointments_done, 0);
  const totalScheduled = Math.max(checkins.reduce((s, c) => s + c.appointments_scheduled, 0), 1);
  const totalEmptySlots = checkins.reduce((s, c) => s + c.empty_slots, 0);

  const totalRevenueEstimated = totalDone * 250;
  const totalRevenueLost = (totalNoShow + totalCancellations + totalEmptySlots) * 250;
  const avgOccupancy = totalDone / (checkins.length * dailyCapacity || 1);
  const avgNoShow = totalNoShow / totalScheduled;

  const ideaMedio = avgScore ?? 0;

  const recommendation = (() => {
    if (!checkins.length) return null;
    if (totalNoShow > 0) return 'Reforce confirmações para reduzir no-show.';
    if (totalEmptySlots > 0) return 'Ative lista de espera para preencher buracos.';
    if (totalCancellations > 0) return 'Investigue motivos de cancelamento e ofereça reagendamento imediato.';
    return 'Semana estável. Continue monitorando.';
  })();

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
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

      {checkins.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum check-in nesta semana.</p>
          <p className="text-xs text-muted-foreground mt-1">Faça o check-in diário para ver seu relatório.</p>
        </div>
      ) : (
        <>
          {/* IDEA avg */}
          {avgScore != null && (
            <div className={cn(
              'rounded-2xl p-5 shadow-elevated text-center',
              avgStatus === 'critical' && 'idea-critical',
              avgStatus === 'attention' && 'idea-attention',
              avgStatus === 'stable' && 'idea-stable',
            )}>
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest">IDEA Médio Semanal</p>
              <p className="text-5xl font-extrabold text-white tracking-tight mt-1">{avgScore}</p>
              <p className="text-sm font-semibold text-white/90 mt-0.5">{getIdeaLabel(avgStatus!)}</p>
            </div>
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
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Perda total</span>
              </div>
              <p className="text-xl font-bold text-revenue-loss">{formatBRL(totalRevenueLost)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{totalNoShow + totalCancellations + totalEmptySlots} perdas</p>
            </div>
          </div>

          {/* Key metrics */}
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
                <span className="text-sm text-foreground">IDEA médio</span>
                <span className="text-sm font-bold text-foreground">{ideaMedio}/100</span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div className="rounded-2xl bg-muted/60 border border-border/60 p-4">
              <p className="text-sm text-foreground">→ {recommendation}</p>
            </div>
          )}

          <Button variant="outline" className="w-full rounded-xl" onClick={() => toast.success('Relatório enviado! (simulação)')}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar relatório por email
          </Button>
        </>
      )}
    </div>
  );
}
