import { useState, useMemo } from 'react';
import { useWeekCheckins } from '@/hooks/useCheckin';
import { useClinic } from '@/hooks/useClinic';
import { calculateIDEA, getIdeaStatus, type CheckinData } from '@/lib/idea';
import { formatBRL, formatPercent } from '@/lib/revenue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { startOfWeek, subWeeks, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sparkles, TrendingDown, TrendingUp, DollarSign, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TICKET = 250;

export default function InsightsPage() {
  const { data: clinic } = useClinic();

  // Last 4 weeks of data
  const thisWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const lastWeekStart = useMemo(() => subWeeks(thisWeekStart, 1), [thisWeekStart]);
  const twoWeeksStart = useMemo(() => subWeeks(thisWeekStart, 2), [thisWeekStart]);

  const { data: thisWeek = [] } = useWeekCheckins(thisWeekStart);
  const { data: lastWeek = [] } = useWeekCheckins(lastWeekStart);

  const calcWeek = (checkins: typeof thisWeek) => {
    const totalDone = checkins.reduce((s, c) => s + c.appointments_done, 0);
    const totalScheduled = checkins.reduce((s, c) => s + c.appointments_scheduled, 0);
    const totalNoShow = checkins.reduce((s, c) => s + c.no_show, 0);
    const totalCancellations = checkins.reduce((s, c) => s + c.cancellations, 0);
    const revenue = totalDone * TICKET;
    const lost = (totalNoShow + totalCancellations) * TICKET;
    const occupancy = totalScheduled > 0 ? totalDone / totalScheduled : 0;
    const noShowRate = totalScheduled > 0 ? totalNoShow / totalScheduled : 0;

    const scores = checkins.map(c => {
      const d: CheckinData = {
        appointments_scheduled: c.appointments_scheduled,
        appointments_done: c.appointments_done,
        no_show: c.no_show,
        cancellations: c.cancellations,
        new_appointments: c.new_appointments,
        empty_slots: c.empty_slots,
        followup_done: c.followup_done,
      };
      return calculateIDEA(d);
    });
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

    return { revenue, lost, occupancy, noShowRate, totalDone, totalNoShow, totalCancellations, avgScore };
  };

  const tw = calcWeek(thisWeek);
  const lw = calcWeek(lastWeek);

  // Projections
  const hasData = thisWeek.length > 0;
  const daysInWeek = 5;
  const daysWithData = thisWeek.length;
  const projectedWeekRevenue = daysWithData > 0 ? (tw.revenue / daysWithData) * daysInWeek : 0;
  const projectedMonthRevenue = projectedWeekRevenue * 4.3;

  // What-if: if no-show reduced by 5pp
  const monthlyLost = tw.lost * 4.3;
  const potentialGain = daysWithData > 0
    ? (tw.totalNoShow / daysWithData) * daysInWeek * 0.5 * TICKET * 4.3
    : 0;

  // Trend vs last week
  const revenueTrend = lw.revenue > 0 ? ((tw.revenue - lw.revenue) / lw.revenue) : 0;
  const lostTrend = lw.lost > 0 ? ((tw.lost - lw.lost) / lw.lost) : 0;

  const noData = thisWeek.length === 0 && lastWeek.length === 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-premium">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Insights Estratégicos</h1>
            <p className="text-xs text-muted-foreground">Visão executiva da clínica</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">Premium</Badge>
      </div>

      {noData ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card py-12 text-center px-6">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Faça check-ins diários</p>
          <p className="text-xs text-muted-foreground mt-1">Insights e previsões aparecem após alguns dias de dados.</p>
        </div>
      ) : (
        <>
          {/* ── REVENUE FORECAST ── */}
          <div className="rounded-2xl gradient-dark p-5 shadow-elevated">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">Previsão de receita</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Esta semana</span>
                <span className="text-lg font-bold text-white">{formatBRL(projectedWeekRevenue)}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Projeção mensal</span>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-white">{formatBRL(projectedMonthRevenue)}</span>
                  {revenueTrend !== 0 && (
                    <div className={cn('flex items-center justify-end gap-1 mt-0.5', revenueTrend > 0 ? 'text-revenue-gain' : 'text-revenue-loss')}>
                  {revenueTrend > 0
                        ? <ArrowUpRight className="h-3 w-3" />
                        : <ArrowDownRight className="h-3 w-3" />
                      }
                      <span className="text-xs font-semibold">{Math.abs(Math.round(revenueTrend * 100))}% vs semana passada</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── MONTHLY LOSS ── */}
          <div className="rounded-2xl bg-card border border-revenue-loss shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-revenue-loss" />
              <p className="text-sm font-bold text-foreground">Receita perdida no mês</p>
            </div>
            <p className="text-3xl font-extrabold text-revenue-loss">{formatBRL(monthlyLost)}</p>
            <p className="text-xs text-muted-foreground mt-1">Em faltas e cancelamentos (projeção)</p>
            {lostTrend !== 0 && (
              <div className={cn('flex items-center gap-1 mt-2', lostTrend < 0 ? 'text-revenue-gain' : 'text-destructive')}>
                {lostTrend < 0
                  ? <ArrowDownRight className="h-3.5 w-3.5" />
                  : <ArrowUpRight className="h-3.5 w-3.5" />
                }
                <span className="text-xs font-semibold">
                  {lostTrend < 0 ? 'Redução' : 'Aumento'} de {Math.abs(Math.round(lostTrend * 100))}% vs semana passada
                </span>
              </div>
            )}
          </div>

          {/* ── WHAT-IF SCENARIO ── */}
          {potentialGain > 0 && (
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold text-foreground">E se o no-show caísse 50%?</p>
              </div>
              <p className="text-2xl font-extrabold text-primary">{formatBRL(potentialGain)}</p>
              <p className="text-xs text-muted-foreground mt-1">ganho adicional mensal estimado</p>
              <p className="text-xs text-foreground/60 mt-2">
                Com confirmações mais rigorosas, este ganho é realizável em 30 dias.
              </p>
            </div>
          )}

          {/* ── PERFORMANCE COMPARISON ── */}
          {lastWeek.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Esta semana vs anterior</p>
              </div>
              <div className="divide-y divide-border/50">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-foreground">Receita estimada</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatBRL(lw.revenue)}</span>
                    <span className="text-sm font-bold text-foreground">→ {formatBRL(tw.revenue)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-foreground">Perda</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatBRL(lw.lost)}</span>
                    <span className={cn('text-sm font-bold', tw.lost < lw.lost ? 'text-revenue-gain' : 'text-revenue-loss')}>
                      → {formatBRL(tw.lost)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-foreground">Ocupação</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatPercent(lw.occupancy)}</span>
                    <span className={cn('text-sm font-bold', tw.occupancy >= lw.occupancy ? 'text-revenue-gain' : 'text-revenue-loss')}>
                      → {formatPercent(tw.occupancy)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-foreground">No-show</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatPercent(lw.noShowRate)}</span>
                    <span className={cn('text-sm font-bold', tw.noShowRate <= lw.noShowRate ? 'text-revenue-gain' : 'text-revenue-loss')}>
                      → {formatPercent(tw.noShowRate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Value proposition */}
          <div className="rounded-2xl bg-muted/40 border border-border/40 p-4 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clínicas que usam DAMA diariamente reduzem até <span className="font-bold text-foreground">27% do no-show</span> e recuperam em média <span className="font-bold text-foreground">R$ 1.200/mês</span> em receita perdida.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
