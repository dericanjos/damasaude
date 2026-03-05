import { useMemo, useState, useEffect } from 'react';
import { useWeekCheckins } from '@/hooks/useCheckin';
import { useClinic } from '@/hooks/useClinic';
import { useGenerateInsight } from '@/hooks/useInsights';
import { calculateIDEA, type CheckinData } from '@/lib/idea';
import { formatBRL, formatPercent } from '@/lib/revenue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfWeek, subWeeks, format } from 'date-fns';
import {
  Sparkles, TrendingDown, Zap, ArrowUpRight, ArrowDownRight,
  AlertTriangle, UserPlus, FileText, Wand2, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area,
} from 'recharts';

const DEFAULT_TICKET = 250;
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

export default function InsightsPage() {
  const { data: clinic } = useClinic();
  const [simNoShow, setSimNoShow] = useState(50);
  const [simCancel, setSimCancel] = useState(30);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const thisWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const lastWeekStart = useMemo(() => subWeeks(thisWeekStart, 1), [thisWeekStart]);

  const { data: thisWeek = [] } = useWeekCheckins(thisWeekStart);
  const { data: lastWeek = [] } = useWeekCheckins(lastWeekStart);

  const { generate, insight: aiInsight, loading: aiLoading, error: aiError } = useGenerateInsight();

  const TICKET = (clinic as any)?.ticket_medio ?? DEFAULT_TICKET;

  const calcWeek = (checkins: typeof thisWeek) => {
    const totalDone = checkins.reduce((s, c) => s + c.appointments_done, 0);
    const totalScheduled = checkins.reduce((s, c) => s + c.appointments_scheduled, 0);
    const totalNoShow = checkins.reduce((s, c) => s + c.no_show, 0);
    const totalCancellations = checkins.reduce((s, c) => s + c.cancellations, 0);
    const totalNew = checkins.reduce((s, c) => s + c.new_appointments, 0);
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

    return { revenue, lost, occupancy, noShowRate, totalDone, totalNoShow, totalCancellations, totalNew, avgScore, scores };
  };

  const tw = calcWeek(thisWeek);
  const lw = calcWeek(lastWeek);

  const hasData = thisWeek.length > 0;
  const noData = thisWeek.length === 0 && lastWeek.length === 0;

  // Auto-generate AI insight when resumo tab has data
  const [aiRequested, setAiRequested] = useState(false);
  useEffect(() => {
    if (hasData && thisWeek.length >= 2 && !aiRequested && !aiInsight) {
      setAiRequested(true);
      generate(thisWeek, 'weekly');
    }
  }, [hasData, thisWeek.length]);

  // Chart data
  const revenueCompareData = useMemo(() => {
    if (!hasData) return [];
    return WEEKDAYS.map((day, i) => {
      const checkin = thisWeek[i];
      const done = checkin?.appointments_done ?? 0;
      const noshow = checkin?.no_show ?? 0;
      const cancel = checkin?.cancellations ?? 0;
      return { day, recuperada: done * TICKET, perdida: (noshow + cancel) * TICKET };
    });
  }, [thisWeek, TICKET, hasData]);

  const performanceByDay = useMemo(() => {
    if (!hasData) return [];
    return WEEKDAYS.map((day, i) => {
      const checkin = thisWeek[i];
      const scheduled = checkin?.appointments_scheduled ?? 0;
      const done = checkin?.appointments_done ?? 0;
      return { day, ocupacao: scheduled > 0 ? Math.round((done / scheduled) * 100) : 0 };
    });
  }, [thisWeek, hasData]);

  const ideaEvolution = useMemo(() => {
    if (!hasData) return [];
    return WEEKDAYS.map((day, i) => ({
      day, idea: tw.scores[i] ?? null,
    })).filter(d => d.idea !== null);
  }, [tw.scores, hasData]);

  const daysWithData = thisWeek.length || 1;
  const weekDays = 5;

  const simGain = useMemo(() => {
    const noShowReduction = (tw.totalNoShow / daysWithData) * weekDays * (simNoShow / 100) * TICKET * 4.3;
    const cancelReduction = (tw.totalCancellations / daysWithData) * weekDays * (simCancel / 100) * TICKET * 4.3;
    return noShowReduction + cancelReduction;
  }, [tw.totalNoShow, tw.totalCancellations, simNoShow, simCancel, TICKET, daysWithData]);

  const forecastData = useMemo(() => {
    if (!hasData) return [];
    const dailyAvg = tw.revenue / daysWithData;
    return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((label, i) => ({
      semana: label,
      faturamento: Math.round(dailyAvg * weekDays * (i + 1)),
      projecao: Math.round(dailyAvg * weekDays * (i + 1) * 1.05),
    }));
  }, [tw.revenue, daysWithData, hasData]);

  const appAvg = { occupancy: 0.72, noShowRate: 0.12, score: 68 };
  const patientsAtRisk = hasData ? Math.max(1, Math.round(tw.totalNoShow * 0.6)) : 0;
  const riskValue = patientsAtRisk * TICKET * 3;

  const newPatientsData = useMemo(() => {
    if (!hasData) return [];
    return WEEKDAYS.map((day, i) => ({ day, novos: thisWeek[i]?.new_appointments ?? 0 }));
  }, [thisWeek, hasData]);

  const chartConfig = {
    recuperada: { label: 'Recuperada', color: 'hsl(155, 60%, 38%)' },
    perdida: { label: 'Perdida', color: 'hsl(0, 72%, 52%)' },
    ocupacao: { label: 'Ocupação %', color: 'hsl(221, 83%, 45%)' },
    idea: { label: 'IDEA', color: 'hsl(221, 83%, 45%)' },
    faturamento: { label: 'Faturamento', color: 'hsl(155, 60%, 38%)' },
    projecao: { label: 'Projeção', color: 'hsl(221, 83%, 55%)' },
    novos: { label: 'Novos Pacientes', color: 'hsl(221, 83%, 45%)' },
  };

  // Month options for reports
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy').replace(/^\w/, c => c.toUpperCase()),
      });
    }
    return months;
  }, []);

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
          <p className="text-sm font-semibold text-foreground">Seus insights estão sendo construídos</p>
          <p className="text-xs text-muted-foreground mt-1">Continue fazendo seus check-ins diários para desbloquear esta área.</p>
        </div>
      ) : (
        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9 rounded-xl bg-secondary">
            <TabsTrigger value="resumo" className="text-[10px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Resumo</TabsTrigger>
            <TabsTrigger value="financeiro" className="text-[10px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Financeiro</TabsTrigger>
            <TabsTrigger value="pacientes" className="text-[10px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Pacientes</TabsTrigger>
            <TabsTrigger value="relatorios" className="text-[10px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Relatórios</TabsTrigger>
          </TabsList>

          {/* ── ABA 1: RESUMO SEMANAL ── */}
          <TabsContent value="resumo" className="space-y-4 mt-4">
            {/* Consultor IA */}
            <div className="rounded-2xl bg-card border border-primary/30 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Análise do seu Consultor IA</p>
              </div>
              <div className="px-4 pb-4">
                {aiLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analisando seus dados...</p>
                  </div>
                ) : aiError ? (
                  <div className="py-3">
                    <p className="text-xs text-muted-foreground">{aiError}</p>
                    <Button variant="outline" size="sm" className="mt-2 rounded-xl text-xs" onClick={() => generate(thisWeek, 'weekly')}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : aiInsight ? (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{aiInsight}</p>
                ) : (
                  <div className="py-3">
                    <p className="text-xs text-muted-foreground">Faça pelo menos 2 check-ins esta semana para desbloquear a análise da IA.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 1: Receita Perdida vs Recuperada */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Receita Perdida vs. Recuperada</p>
              </div>
              <div className="px-2 pb-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart data={revenueCompareData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,24%)" />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(220,15%,60%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(220,15%,60%)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="recuperada" fill="hsl(155,60%,38%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="perdida" fill="hsl(0,72%,52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>

            {/* Card 2: Performance por Dia */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Performance por Dia da Semana</p>
              </div>
              <div className="px-4 pb-4 space-y-2">
                {performanceByDay.map((d) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground w-8">{d.day}</span>
                    <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${d.ocupacao}%`,
                          background: d.ocupacao >= 80 ? 'hsl(155,60%,38%)' : d.ocupacao >= 60 ? 'hsl(38,92%,48%)' : 'hsl(0,72%,52%)',
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground w-10 text-right">{d.ocupacao}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Você vs Média */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Você vs. Média do App</p>
              </div>
              <div className="divide-y divide-border/50">
                {[
                  { label: 'Ocupação', yours: formatPercent(tw.occupancy), avg: formatPercent(appAvg.occupancy), better: tw.occupancy >= appAvg.occupancy },
                  { label: 'No-show', yours: formatPercent(tw.noShowRate), avg: formatPercent(appAvg.noShowRate), better: tw.noShowRate <= appAvg.noShowRate },
                  { label: 'IDEA Score', yours: `${tw.avgScore ?? '-'}`, avg: `${appAvg.score}`, better: (tw.avgScore ?? 0) >= appAvg.score },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-foreground">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Média: {row.avg}</span>
                      <span className={cn('text-sm font-bold', row.better ? 'text-revenue-gain' : 'text-revenue-loss')}>{row.yours}</span>
                      {row.better
                        ? <ArrowUpRight className="h-3.5 w-3.5 text-revenue-gain" />
                        : <ArrowDownRight className="h-3.5 w-3.5 text-revenue-loss" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4: Evolução IDEA */}
            {ideaEvolution.length > 1 && (
              <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Evolução do Índice IDEA</p>
                </div>
                <div className="px-2 pb-4">
                  <ChartContainer config={chartConfig} className="h-[180px] w-full">
                    <LineChart data={ideaEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,24%)" />
                      <XAxis dataKey="day" tick={{ fill: 'hsl(220,15%,60%)', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(220,15%,60%)', fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="idea" stroke="hsl(221,83%,45%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(221,83%,45%)' }} />
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── ABA 2: ANÁLISE FINANCEIRA ── */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Previsão de Faturamento Mensal</p>
              </div>
              <div className="px-2 pb-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <AreaChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,24%)" />
                    <XAxis dataKey="semana" tick={{ fill: 'hsl(220,15%,60%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(220,15%,60%)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="faturamento" stroke="hsl(155,60%,38%)" fill="hsl(155,60%,38%)" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="projecao" stroke="hsl(221,83%,55%)" fill="hsl(221,83%,55%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Simulador de Cenários</p>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Reduzir no-show em</span>
                    <span className="text-sm font-bold text-primary">{simNoShow}%</span>
                  </div>
                  <Slider value={[simNoShow]} onValueChange={(v) => setSimNoShow(v[0])} min={0} max={100} step={10} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Reduzir cancelamento em</span>
                    <span className="text-sm font-bold text-primary">{simCancel}%</span>
                  </div>
                  <Slider value={[simCancel]} onValueChange={(v) => setSimCancel(v[0])} min={0} max={100} step={10} />
                </div>
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Ganho mensal estimado</p>
                  <p className="text-2xl font-extrabold text-primary mt-1">{formatBRL(simGain)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── ABA 3: PACIENTES ── */}
          <TabsContent value="pacientes" className="space-y-4 mt-4">
            <div className="rounded-2xl bg-card border border-revenue-loss shadow-card overflow-hidden p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-revenue-loss" />
                <p className="text-sm font-bold text-foreground">Pacientes em Risco de Evasão</p>
              </div>
              <p className="text-3xl font-extrabold text-revenue-loss">{patientsAtRisk} pacientes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Valor em risco: <span className="font-bold text-foreground">{formatBRL(riskValue)}</span> nos próximos 3 meses
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Baseado nos no-shows recorrentes e ausência de reagendamento.
              </p>
            </div>

            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aquisição de Novos Pacientes</p>
                </div>
              </div>
              <div className="px-2 pb-4">
                <ChartContainer config={chartConfig} className="h-[180px] w-full">
                  <BarChart data={newPatientsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,24%)" />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(220,15%,60%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(220,15%,60%)', fontSize: 10 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="novos" fill="hsl(221,83%,45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>

          {/* ── ABA 4: RELATÓRIOS ── */}
          <TabsContent value="relatorios" className="space-y-4 mt-4">
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gerador de Relatório Mensal</p>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-4">
                <div className="space-y-1.5">
                  <p className="text-sm text-foreground">Selecione o mês</p>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full rounded-xl" disabled>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar relatório PDF
                  <Badge variant="secondary" className="ml-2 text-[9px]">Em breve</Badge>
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  O gerador de relatórios em PDF estará disponível em breve com dados consolidados do mês.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
