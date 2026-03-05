import { useState, useMemo, useEffect } from 'react';
import { useWeekCheckins, useAllCheckins } from '@/hooks/useCheckin';
import { calculateIDEA, getIdeaStatus, getIdeaLabel, type CheckinData } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent, DEFAULT_DAILY_CAPACITY } from '@/lib/revenue';
import { useClinic } from '@/hooks/useClinic';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { startOfWeek, subWeeks, addWeeks, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Loader2, Sparkles, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function WeeklyReportPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: clinic } = useClinic();
  const { data: allCheckins = [] } = useAllCheckins();
  const dailyCapacity = (clinic as any)?.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
  const targetFillRate = clinic?.target_fill_rate ?? 0.85;
  const targetNoShowRate = clinic?.target_noshow_rate ?? 0.05;
  const ticketMedio = (clinic as any)?.ticket_medio ?? 250;

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset < 0 ? subWeeks(base, Math.abs(weekOffset)) : addWeeks(base, weekOffset);
  }, [weekOffset]);

  const { data: checkins = [] } = useWeekCheckins(weekStart);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekLabel = format(weekStart, "'Semana de' dd 'de' MMMM", { locale: ptBR });

  // AI Report state
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [reportFetched, setReportFetched] = useState(false);

  // Fetch or generate report when week changes
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
      // Generate via edge function (it checks for existing internally)
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

      // Generate via edge function
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

  // Stats
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

  const totalRevenueEstimated = totalDone * ticketMedio;
  const totalRevenueLost = (totalNoShow + totalCancellations + totalEmptySlots) * ticketMedio;
  const avgOccupancy = totalDone / (checkins.length * dailyCapacity || 1);
  const avgNoShow = totalNoShow / totalScheduled;

  const hasEnoughData = allCheckins.length >= 7;

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

      {!hasEnoughData ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card py-12 text-center px-6">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Seu primeiro relatório semanal está quase pronto</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Seu primeiro relatório semanal será gerado após 7 dias de dados. Continue fazendo seus check-ins diários!
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Check-ins realizados: <span className="font-bold text-foreground">{allCheckins.length}/7</span>
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
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Diagnóstico Semanal com IA</p>
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
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Receita perdida</span>
              </div>
              <p className="text-xl font-bold text-revenue-loss">{formatBRL(totalRevenueLost)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ineficiências operacionais</p>
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
