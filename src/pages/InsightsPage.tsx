import { useMemo, useState, useEffect, useCallback } from 'react';
import { useWeekCheckins, useCheckinRange, useAllCheckins } from '@/hooks/useCheckin';
import { useClinic } from '@/hooks/useClinic';
import { useGenerateInsight } from '@/hooks/useInsights';
import { calculateIDEA, type CheckinData } from '@/lib/idea';
import { formatBRL, formatPercent } from '@/lib/revenue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfWeek, subWeeks, subDays, format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sparkles, TrendingDown, Zap, ArrowUpRight, ArrowDownRight,
  AlertTriangle, UserPlus, FileText, Wand2, Loader2, Target, DollarSign, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReportTypeTabs from '@/components/ReportTypeTabs';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

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

export default function InsightsPage() {
  const { data: clinic } = useClinic();
  const [simNoShow, setSimNoShow] = useState(50);
  const [simTicket, setSimTicket] = useState(20);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const thisWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const lastWeekStart = useMemo(() => subWeeks(thisWeekStart, 1), [thisWeekStart]);

  const { data: thisWeek = [] } = useWeekCheckins(thisWeekStart);
  const { data: lastWeek = [] } = useWeekCheckins(lastWeekStart);

  const thirtyDaysAgo = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const { data: last30 = [] } = useCheckinRange(thirtyDaysAgo, today);

  const { data: allCheckins = [] } = useAllCheckins();

  const monthStart = useMemo(() => format(startOfMonth(parseISO(selectedMonth + '-01')), 'yyyy-MM-dd'), [selectedMonth]);
  const monthEnd = useMemo(() => format(endOfMonth(parseISO(selectedMonth + '-01')), 'yyyy-MM-dd'), [selectedMonth]);
  const { data: monthCheckins = [] } = useCheckinRange(monthStart, monthEnd);

  const { generate, insight: aiInsight, loading: aiLoading, error: aiError } = useGenerateInsight();

  const TICKET_PRIVATE = (clinic as any)?.ticket_private ?? 250;
  const TICKET_INSURANCE = (clinic as any)?.ticket_insurance ?? 100;
  const AVG_TICKET = (TICKET_PRIVATE + TICKET_INSURANCE) / 2;
  const CAPACITY = (clinic as any)?.daily_capacity ?? 16;

  const calcWeek = (checkins: typeof thisWeek) => {
    const totalAttPrivate = checkins.reduce((s, c) => s + ((c as any).attended_private ?? (c as any).appointments_done ?? 0), 0);
    const totalAttInsurance = checkins.reduce((s, c) => s + ((c as any).attended_insurance ?? 0), 0);
    const totalDone = totalAttPrivate + totalAttInsurance;
    const totalScheduled = checkins.reduce((s, c) => s + c.appointments_scheduled, 0);
    const totalNoshowsPriv = checkins.reduce((s, c) => s + ((c as any).noshows_private ?? (c as any).no_show ?? 0), 0);
    const totalNoshowsIns = checkins.reduce((s, c) => s + ((c as any).noshows_insurance ?? 0), 0);
    const totalNoShow = totalNoshowsPriv + totalNoshowsIns;
    const totalCancellations = checkins.reduce((s, c) => s + c.cancellations, 0);
    const totalEmpty = checkins.reduce((s, c) => s + c.empty_slots, 0);
    const totalNew = checkins.reduce((s, c) => s + c.new_appointments, 0);
    const revenue = (totalAttPrivate * TICKET_PRIVATE) + (totalAttInsurance * TICKET_INSURANCE);
    const lost = (totalNoshowsPriv * TICKET_PRIVATE) + (totalNoshowsIns * TICKET_INSURANCE) + ((totalCancellations + totalEmpty) * AVG_TICKET);
    const occupancy = checkins.length > 0 ? checkins.reduce((s, c) => {
      const att = ((c as any).attended_private ?? (c as any).appointments_done ?? 0) + ((c as any).attended_insurance ?? 0);
      return s + (att / CAPACITY);
    }, 0) / checkins.length : 0;
    const noShowRate = totalScheduled > 0 ? totalNoShow / totalScheduled : 0;

    const scores = checkins.map(c => {
      const d = toCheckinData(c);
      return calculateIDEA(d, CAPACITY, TICKET_PRIVATE, TICKET_INSURANCE);
    });
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

    return { revenue, lost, occupancy, noShowRate, totalDone, totalNoShow, totalCancellations, totalEmpty, totalNew, totalScheduled, avgScore, scores };
  };

  const tw = calcWeek(thisWeek);
  const lw = calcWeek(lastWeek);

  const totalCheckins = allCheckins.length;
  const hasEnoughData = totalCheckins >= 3;

  const [aiRequested, setAiRequested] = useState(false);
  useEffect(() => {
    if (hasEnoughData && thisWeek.length >= 2 && !aiRequested && !aiInsight) {
      setAiRequested(true);
      generate(thisWeek, 'weekly');
    }
  }, [hasEnoughData, thisWeek.length]);

  const ideaEvolution = useMemo(() => {
    if (!thisWeek.length) return [];
    return thisWeek.map((c) => ({
      day: format(parseISO(c.date), 'EEE', { locale: ptBR }).replace(/^\w/, s => s.toUpperCase()),
      idea: calculateIDEA(toCheckinData(c), CAPACITY, TICKET_PRIVATE, TICKET_INSURANCE),
    }));
  }, [thisWeek, CAPACITY, TICKET_PRIVATE, TICKET_INSURANCE]);

  const compareData = useMemo(() => {
    return [
      { label: 'Atendidos', atual: tw.totalDone, anterior: lw.totalDone },
      { label: 'No-shows', atual: tw.totalNoShow, anterior: lw.totalNoShow },
      { label: 'Cancelamentos', atual: tw.totalCancellations, anterior: lw.totalCancellations },
    ];
  }, [tw, lw]);

  // ── FINANCEIRO: Donut chart ──
  const lossDonutData = useMemo(() => {
    const noshowPriv = last30.reduce((s, c) => s + ((c as any).noshows_private ?? (c as any).no_show ?? 0), 0);
    const noshowIns = last30.reduce((s, c) => s + ((c as any).noshows_insurance ?? 0), 0);
    const noShowLoss = (noshowPriv * TICKET_PRIVATE) + (noshowIns * TICKET_INSURANCE);
    const cancel = last30.reduce((s, c) => s + c.cancellations, 0) * AVG_TICKET;
    const empty = last30.reduce((s, c) => s + c.empty_slots, 0) * AVG_TICKET;
    return [
      { name: 'No-shows', value: noShowLoss, color: 'hsl(0, 72%, 52%)' },
      { name: 'Cancelamentos', value: cancel, color: 'hsl(38, 92%, 48%)' },
      { name: 'Buracos', value: empty, color: 'hsl(220, 15%, 60%)' },
    ].filter(d => d.value > 0);
  }, [last30, TICKET_PRIVATE, TICKET_INSURANCE, AVG_TICKET]);

  const totalLoss30 = lossDonutData.reduce((s, d) => s + d.value, 0);

  // ── FINANCEIRO: Simulator ──
  const simGain = useMemo(() => {
    const daysWithData = thisWeek.length || 1;
    const noshowPriv = thisWeek.reduce((s, c) => s + ((c as any).noshows_private ?? (c as any).no_show ?? 0), 0);
    const noshowIns = thisWeek.reduce((s, c) => s + ((c as any).noshows_insurance ?? 0), 0);
    const monthlyNoShowLoss = ((noshowPriv * TICKET_PRIVATE) + (noshowIns * TICKET_INSURANCE)) / daysWithData * 22;
    const noShowSaving = monthlyNoShowLoss * (simNoShow / 100);
    const currentMonthlyRevenue = tw.revenue / daysWithData * 22;
    const ticketGain = currentMonthlyRevenue * (simTicket / 100);
    return noShowSaving + ticketGain;
  }, [tw, simNoShow, simTicket, TICKET_PRIVATE, TICKET_INSURANCE, thisWeek.length]);

  // ── PACIENTES: Funnel ──
  const funnelData = useMemo(() => {
    const scheduled = last30.reduce((s, c) => s + c.appointments_scheduled, 0);
    const attPriv = last30.reduce((s, c) => s + ((c as any).attended_private ?? (c as any).appointments_done ?? 0), 0);
    const attIns = last30.reduce((s, c) => s + ((c as any).attended_insurance ?? 0), 0);
    const done = attPriv + attIns;
    const noshowP = last30.reduce((s, c) => s + ((c as any).noshows_private ?? (c as any).no_show ?? 0), 0);
    const noshowI = last30.reduce((s, c) => s + ((c as any).noshows_insurance ?? 0), 0);
    const lost = noshowP + noshowI + last30.reduce((s, c) => s + c.cancellations, 0);
    return { scheduled, done, lost };
  }, [last30]);

  const totalEmptySlots30 = useMemo(() => last30.reduce((s, c) => s + c.empty_slots, 0), [last30]);

  // ── RELATÓRIOS: PDF generation ──
  const handleGeneratePDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const clinicName = (clinic as any)?.name || 'Clínica';
    const doctorName = (clinic as any)?.doctor_name || 'Médico';
    const monthLabel = format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());

    doc.setFontSize(18);
    doc.text(`Relatório Mensal - ${monthLabel}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`${clinicName} • Dr(a). ${doctorName}`, 14, 30);
    doc.setDrawColor(200);
    doc.line(14, 34, 196, 34);

    const mStats = calcWeek(monthCheckins);
    doc.setFontSize(13);
    doc.text('Resumo do Mês', 14, 44);
    doc.setFontSize(10);
    const kpis = [
      `Faturamento: ${formatBRL(mStats.revenue)}`,
      `Perda Total: ${formatBRL(mStats.lost)}`,
      `IDEA Médio: ${mStats.avgScore ?? '-'}`,
      `Taxa de Ocupação: ${formatPercent(mStats.occupancy)}`,
      `No-shows: ${mStats.totalNoShow}`,
      `Cancelamentos: ${mStats.totalCancellations}`,
      `Buracos: ${mStats.totalEmpty}`,
    ];
    kpis.forEach((kpi, i) => doc.text(kpi, 14, 52 + i * 7));

    doc.setFontSize(13);
    doc.text('Detalhamento Diário', 14, 108);

    autoTable(doc, {
      startY: 114,
      head: [['Data', 'Agendados', 'Atend. Part.', 'Atend. Conv.', 'No-show', 'Cancel.', 'Buracos', 'IDEA']],
      body: monthCheckins.map(c => {
        const d = toCheckinData(c);
        return [
          format(parseISO(c.date), 'dd/MM'),
          c.appointments_scheduled,
          d.attended_private,
          d.attended_insurance,
          d.noshows_private + d.noshows_insurance,
          c.cancellations,
          c.empty_slots,
          calculateIDEA(d, CAPACITY, TICKET_PRIVATE, TICKET_INSURANCE),
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [41, 82, 163] },
      styles: { fontSize: 9 },
    });

    doc.save(`relatorio-${selectedMonth}.pdf`);
  };

  const chartConfig = {
    atual: { label: 'Semana Atual', color: 'hsl(221, 83%, 45%)' },
    anterior: { label: 'Semana Anterior', color: 'hsl(220, 15%, 60%)' },
    idea: { label: 'IDEA', color: 'hsl(221, 83%, 45%)' },
  };

  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
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

      {!hasEnoughData ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card py-12 text-center px-6">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Seus insights estão sendo construídos</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Continue fazendo seus check-ins diários. Após 3 dias de dados, seus insights e gráficos começarão a aparecer aqui!
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Check-ins realizados: <span className="font-bold text-foreground">{totalCheckins}/3</span>
          </p>
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
            {/* Análise Semanal */}
            <div className="rounded-2xl bg-card border border-primary/30 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Análise Semanal</p>
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

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-card border border-border/60 shadow-card p-4 text-center">
                <DollarSign className="h-4 w-4 mx-auto text-revenue-gain mb-1" />
                <p className="text-[10px] text-muted-foreground">Faturamento</p>
                <p className="text-sm font-extrabold text-foreground mt-0.5">{formatBRL(tw.revenue)}</p>
              </div>
              <div className="rounded-2xl bg-card border border-border/60 shadow-card p-4 text-center">
                <TrendingDown className="h-4 w-4 mx-auto text-revenue-loss mb-1" />
                <p className="text-[10px] text-muted-foreground">Perda</p>
                <p className="text-sm font-extrabold text-foreground mt-0.5">{formatBRL(tw.lost)}</p>
              </div>
              <div className="rounded-2xl bg-card border border-border/60 shadow-card p-4 text-center">
                <Target className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground">Ocupação</p>
                <p className="text-sm font-extrabold text-foreground mt-0.5">{formatPercent(tw.occupancy)}</p>
              </div>
            </div>

            {/* Evolução do IDEA */}
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

            {/* Comparativo Semanal */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Comparativo Semanal</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Últimos 7 dias vs. 7 dias anteriores</p>
              </div>
              <div className="px-2 pb-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart data={compareData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,24%)" />
                    <XAxis dataKey="label" tick={{ fill: 'hsl(220,15%,60%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(220,15%,60%)', fontSize: 10 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="atual" fill="hsl(221,83%,45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="anterior" fill="hsl(220,15%,60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>

          {/* ── ABA 2: ANÁLISE FINANCEIRA ── */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {/* Donut: Origem da Perda */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Origem da Perda Financeira (30 dias)</p>
              </div>
              <div className="px-4 pb-4">
                {lossDonutData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="w-[140px] h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={lossDonutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} strokeWidth={2} stroke="hsl(222,35%,18%)">
                            {lossDonutData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {lossDonutData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-xs text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground">{formatBRL(d.value)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">Total</span>
                          <span className="text-sm font-extrabold text-revenue-loss">{formatBRL(totalLoss30)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">Sem dados de perda nos últimos 30 dias.</p>
                )}
              </div>
            </div>

            {/* Simulador de Crescimento */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Simulador de Crescimento</p>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Se eu reduzir os no-shows em</span>
                    <span className="text-sm font-bold text-primary">{simNoShow}%</span>
                  </div>
                  <Slider value={[simNoShow]} onValueChange={(v) => setSimNoShow(v[0])} min={0} max={100} step={10} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Se eu aumentar meu ticket médio em</span>
                    <span className="text-sm font-bold text-primary">{simTicket}%</span>
                  </div>
                  <Slider value={[simTicket]} onValueChange={(v) => setSimTicket(v[0])} min={0} max={100} step={5} />
                </div>
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Impacto Mensal</p>
                  <p className="text-2xl font-extrabold text-primary mt-1">+ {formatBRL(simGain)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── ABA 3: ANÁLISE DE PACIENTES ── */}
          <TabsContent value="pacientes" className="space-y-4 mt-4">
            {/* Funil */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Jornada do Paciente (30 dias)</p>
              </div>
              <div className="px-4 pb-4 space-y-3">
                {[
                  { label: 'Agendados', value: funnelData.scheduled, color: 'hsl(221, 83%, 45%)', pct: 100 },
                  { label: 'Atendidos', value: funnelData.done, color: 'hsl(155, 60%, 38%)', pct: funnelData.scheduled > 0 ? (funnelData.done / funnelData.scheduled) * 100 : 0 },
                  { label: 'Perdidos', value: funnelData.lost, color: 'hsl(0, 72%, 52%)', pct: funnelData.scheduled > 0 ? (funnelData.lost / funnelData.scheduled) * 100 : 0 },
                ].map((step) => (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{step.label}</span>
                      <span className="text-xs text-muted-foreground">{step.value} ({Math.round(step.pct)}%)</span>
                    </div>
                    <div className="h-6 bg-secondary rounded-lg overflow-hidden flex items-center justify-center relative">
                      <div
                        className="absolute left-0 top-0 h-full rounded-lg transition-all"
                        style={{ width: `${Math.max(step.pct, 3)}%`, backgroundColor: step.color }}
                      />
                      <span className="relative z-10 text-[10px] font-bold text-white">{step.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Oportunidades na Agenda */}
            <div className="rounded-2xl bg-card border border-idea-attention shadow-card overflow-hidden p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-idea-attention" />
                <p className="text-sm font-bold text-foreground">Oportunidades na Agenda</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você teve <span className="font-bold text-foreground">{totalEmptySlots30}</span> buracos na agenda no último mês.
                São <span className="font-bold text-foreground">{totalEmptySlots30}</span> horários que poderiam ter sido usados para encaixes ou reativação de pacientes antigos.
              </p>
              {totalEmptySlots30 > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Valor potencial: <span className="font-bold text-idea-attention">{formatBRL(totalEmptySlots30 * AVG_TICKET)}</span>
                </p>
              )}
            </div>

            {/* Novos pacientes */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aquisição de Novos Pacientes</p>
                </div>
              </div>
              <div className="px-2 pb-4">
                <ChartContainer config={{ novos: { label: 'Novos', color: 'hsl(221,83%,45%)' } }} className="h-[180px] w-full">
                  <BarChart data={thisWeek.map(c => ({
                    day: format(parseISO(c.date), 'EEE', { locale: ptBR }).replace(/^\w/, s => s.toUpperCase()),
                    novos: c.new_appointments,
                  }))}>
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
            {/* Month selector */}
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

            {/* Report type toggle */}
            <ReportTypeTabs
              selectedMonth={selectedMonth}
              monthCheckins={monthCheckins}
              calcWeek={calcWeek}
              handleGeneratePDF={handleGeneratePDF}
              clinicId={clinic?.id}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
