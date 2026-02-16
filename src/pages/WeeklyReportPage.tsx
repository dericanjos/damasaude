import { useState, useMemo } from 'react';
import { useWeekCheckins } from '@/hooks/useCheckin';
import { useWeekLossReasons } from '@/hooks/useLossReasons';
import { calculateIDEA, getIdeaStatus, getIdeaLabel, type CheckinData } from '@/lib/idea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { startOfWeek, subWeeks, addWeeks, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WeeklyReportPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset < 0 ? subWeeks(base, Math.abs(weekOffset)) : addWeeks(base, weekOffset);
  }, [weekOffset]);

  const { data: checkins = [] } = useWeekCheckins(weekStart);
  const { data: lossReasons = [] } = useWeekLossReasons(weekStart);

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
    return { date: c.date, score: calculateIDEA(data), data };
  });

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length) : null;
  const bestDay = scores.length > 0 ? scores.reduce((a, b) => a.score >= b.score ? a : b) : null;
  const worstDay = scores.length > 0 ? scores.reduce((a, b) => a.score <= b.score ? a : b) : null;

  const totalNoShow = checkins.reduce((s, c) => s + c.no_show, 0);
  const totalCancellations = checkins.reduce((s, c) => s + c.cancellations, 0);
  const totalEmptySlots = checkins.reduce((s, c) => s + c.empty_slots, 0);

  // Top 3 loss reasons
  const reasonAgg = lossReasons.reduce<Record<string, { reason: string; total: number }>>((acc, r) => {
    if (!acc[r.reason]) acc[r.reason] = { reason: r.reason, total: 0 };
    acc[r.reason].total += r.count;
    return acc;
  }, {});
  const topReasons = Object.values(reasonAgg).sort((a, b) => b.total - a.total).slice(0, 3);

  // Recommendations
  const recommendations: string[] = [];
  if (totalNoShow > 0) recommendations.push('Reforce as confirmações para reduzir no-show.');
  if (totalEmptySlots > 0) recommendations.push('Ative lista de espera para preencher buracos.');
  if (totalCancellations > 0) recommendations.push('Investigue motivos de cancelamento e ofereça reagendamento.');
  if (recommendations.length === 0) recommendations.push('Semana estável! Continue monitorando os indicadores.');

  const avgStatus = avgScore != null ? getIdeaStatus(avgScore) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <BarChart3 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Relatório Semanal</h1>
          <p className="text-xs text-muted-foreground capitalize">{weekLabel}</p>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}>
          Próxima <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {checkins.length === 0 ? (
        <Card className="shadow-card border-border/50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum check-in nesta semana.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Avg IDEA */}
          {avgScore != null && (
            <Card className={cn(
              'shadow-elevated text-center',
              avgStatus === 'critical' && 'idea-critical',
              avgStatus === 'attention' && 'idea-attention',
              avgStatus === 'stable' && 'idea-stable',
            )}>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-primary-foreground/80">IDEA Médio</p>
                <p className="text-4xl font-extrabold text-primary-foreground">{avgScore}</p>
                <p className="text-sm text-primary-foreground/90">{getIdeaLabel(avgStatus!)}</p>
              </CardContent>
            </Card>
          )}

          {/* Best/Worst */}
          <div className="grid grid-cols-2 gap-3">
            {bestDay && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="mx-auto h-5 w-5 text-idea-stable mb-1" />
                  <p className="text-xs text-muted-foreground">Melhor dia</p>
                  <p className="text-2xl font-bold text-foreground">{bestDay.score}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(bestDay.date + 'T12:00:00'), 'EEEE', { locale: ptBR })}</p>
                </CardContent>
              </Card>
            )}
            {worstDay && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-4 text-center">
                  <TrendingDown className="mx-auto h-5 w-5 text-destructive mb-1" />
                  <p className="text-xs text-muted-foreground">Pior dia</p>
                  <p className="text-2xl font-bold text-foreground">{worstDay.score}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(worstDay.date + 'T12:00:00'), 'EEEE', { locale: ptBR })}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Totals */}
          <Card className="shadow-card border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Totais da Semana</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-destructive">{totalNoShow}</p>
                  <p className="text-xs text-muted-foreground">No-show</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-idea-attention">{totalCancellations}</p>
                  <p className="text-xs text-muted-foreground">Cancel.</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalEmptySlots}</p>
                  <p className="text-xs text-muted-foreground">Buracos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Reasons */}
          {topReasons.length > 0 && (
            <Card className="shadow-card border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Top 3 Motivos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {topReasons.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <span className="text-sm text-foreground">{i + 1}. {r.reason}</span>
                    <span className="text-sm font-bold text-foreground">{r.total}x</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="shadow-card border-border/50 bg-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Recomendação DAMA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-primary font-bold">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
