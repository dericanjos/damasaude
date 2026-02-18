import { useNavigate } from 'react-router-dom';
import { useTodayCheckin, useYesterdayCheckin } from '@/hooks/useCheckin';
import { useTodayActions, useCompleteAction, useGenerateActions } from '@/hooks/useActions';
import { useClinic } from '@/hooks/useClinic';
import { useSubscription } from '@/hooks/useSubscription';
import { calculateIDEA, generateInsight, type CheckinData } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent } from '@/lib/revenue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingDown, TrendingUp, AlertCircle, CheckCircle2,
  ClipboardCheck, Sparkles, ArrowRight, Newspaper, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLatestNews } from '@/hooks/useNews';
import { cn } from '@/lib/utils';
import { getIdeaStatus, getIdeaLabel } from '@/lib/idea';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  const { data: todayCheckin } = useTodayCheckin();
  const { data: yesterdayCheckin } = useYesterdayCheckin();
  const { data: actions = [] } = useTodayActions();
  const completeAction = useCompleteAction();
  const generateActionsM = useGenerateActions();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const { data: news } = useLatestNews();

  const doctorName = user?.user_metadata?.doctor_name || 'Doutor(a)';
  const firstName = doctorName.split(' ')[0];

  const targetFillRate = clinic?.target_fill_rate ?? 0.85;
  const targetNoShowRate = clinic?.target_noshow_rate ?? 0.05;

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

  const checkinData: CheckinData | null = todayCheckin
    ? {
        appointments_scheduled: todayCheckin.appointments_scheduled,
        appointments_done: todayCheckin.appointments_done,
        no_show: todayCheckin.no_show,
        cancellations: todayCheckin.cancellations,
        new_appointments: todayCheckin.new_appointments,
        empty_slots: todayCheckin.empty_slots,
        followup_done: todayCheckin.followup_done,
      }
    : null;

  const todayScore = checkinData ? calculateIDEA(checkinData) : null;
  const yesterdayScore = yesterdayCheckin
    ? calculateIDEA({
        appointments_scheduled: yesterdayCheckin.appointments_scheduled,
        appointments_done: yesterdayCheckin.appointments_done,
        no_show: yesterdayCheckin.no_show,
        cancellations: yesterdayCheckin.cancellations,
        new_appointments: yesterdayCheckin.new_appointments,
        empty_slots: yesterdayCheckin.empty_slots,
        followup_done: yesterdayCheckin.followup_done,
      })
    : null;

  const revenue = checkinData ? calculateRevenue(checkinData) : null;
  const ideaStatus = todayScore != null ? getIdeaStatus(todayScore) : null;

  // Alert rules
  const alerts: Array<{ type: 'warn' | 'ok'; message: string; action?: string }> = [];
  if (checkinData && revenue) {
    if (revenue.noShowRate > targetNoShowRate) {
      alerts.push({ type: 'warn', message: `No-show em ${formatPercent(revenue.noShowRate)} — acima da sua meta.`, action: 'Reforce confirmações amanhã' });
    }
    if (revenue.occupancyRate < targetFillRate) {
      alerts.push({ type: 'warn', message: `Ocupação em ${formatPercent(revenue.occupancyRate)} — agenda com buracos.`, action: 'Ative lista de espera' });
    }
    if (!checkinData.followup_done) {
      alerts.push({ type: 'warn', message: 'Follow-up ainda não executado hoje.', action: 'Dedique 15 min para reativar contatos' });
    }
    if (revenue.lost > 500) {
      alerts.push({ type: 'warn', message: `${formatBRL(revenue.lost)} perdidos hoje em faltas e cancelamentos.`, action: 'Revise motivos na aba Relatório' });
    }
    if (alerts.length === 0) {
      alerts.push({ type: 'ok', message: 'Agenda dentro das metas. Bom trabalho!' });
    }
  }

  const handleComplete = (id: string) => {
    completeAction.mutate(id, {
      onSuccess: () => toast.success('Ação concluída! 🎉'),
    });
  };

  const pendingActions = actions.filter(a => a.status === 'pending');

  const latestNews = news?.[0] ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-foreground">Olá, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">Visão do dia em 30 segundos</p>
        </div>
        {showRenewalBanner && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1">
            <Bell className="h-3 w-3 text-amber-600" />
            <span className="text-[11px] font-medium text-amber-700">Renova {renewalDate}</span>
          </div>
        )}
      </div>

      {/* ── CHECK-IN PROMPT or IDEA SCORE ── */}
      {todayScore == null ? (
        <button
          onClick={() => navigate('/checkin')}
          className="w-full rounded-2xl gradient-primary p-5 text-left shadow-premium transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/75 uppercase tracking-wider">Check-in pendente</p>
              <p className="mt-1 text-lg font-bold text-white">Faça o check-in de hoje</p>
              <p className="text-sm text-white/75 mt-0.5">Leva menos de 1 minuto</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </button>
      ) : (
        /* IDEA score card */
        <div className={cn(
          'rounded-2xl p-5 shadow-elevated',
          ideaStatus === 'critical' && 'idea-critical',
          ideaStatus === 'attention' && 'idea-attention',
          ideaStatus === 'stable' && 'idea-stable',
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Índice IDEA</p>
              <p className="text-5xl font-extrabold text-white tracking-tight mt-0.5">{todayScore}</p>
              <p className="text-sm font-semibold text-white/90 mt-0.5">{getIdeaLabel(ideaStatus!)}</p>
              {yesterdayScore != null && (
                <p className="text-xs text-white/65 mt-1">
                  {todayScore - yesterdayScore > 0 ? `+${todayScore - yesterdayScore}` : todayScore - yesterdayScore} vs ontem
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70 font-medium">Pontuação</p>
              <p className="text-3xl font-bold text-white">{todayScore}<span className="text-lg text-white/70">/100</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── REVENUE CARDS ── */}
      {revenue && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-revenue-gain" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Receita est.</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatBRL(revenue.estimated)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{checkinData?.appointments_done} consultas</p>
          </div>
          <div className="rounded-2xl bg-card border border-revenue-loss p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-revenue-loss" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Receita perdida</span>
            </div>
            <p className="text-2xl font-bold text-revenue-loss">{formatBRL(revenue.lost)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(checkinData?.no_show ?? 0) + (checkinData?.cancellations ?? 0)} faltas/cancel.</p>
          </div>
        </div>
      )}

      {/* ── OCCUPANCY + NO-SHOW METRICS ── */}
      {revenue && (
        <div className="grid grid-cols-2 gap-3">
          {/* Occupancy */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ocupação</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-foreground">{formatPercent(revenue.occupancyRate)}</p>
              <p className="text-xs text-muted-foreground">meta {formatPercent(targetFillRate)}</p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', revenue.occupancyRate >= targetFillRate ? 'bg-idea-stable' : 'bg-idea-attention')}
                style={{ width: `${Math.min(100, revenue.occupancyRate * 100)}%` }}
              />
            </div>
          </div>
          {/* No-show */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">No-show</p>
            <div className="flex items-end justify-between">
              <p className={cn('text-2xl font-bold', revenue.noShowRate > targetNoShowRate ? 'text-destructive' : 'text-foreground')}>
                {formatPercent(revenue.noShowRate)}
              </p>
              <p className="text-xs text-muted-foreground">meta {formatPercent(targetNoShowRate)}</p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', revenue.noShowRate <= targetNoShowRate ? 'bg-idea-stable' : 'bg-destructive')}
                style={{ width: `${Math.min(100, revenue.noShowRate * 100 * 4)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── ALERT PANEL ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5',
                alert.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30'
                  : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30'
              )}
            >
              {alert.type === 'ok'
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                : <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              }
              <div>
                <p className={cn('text-sm font-medium', alert.type === 'ok' ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
                  {alert.message}
                </p>
                {alert.action && (
                  <p className="text-xs text-muted-foreground mt-0.5">→ {alert.action}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PENDING ACTIONS ── */}
      {pendingActions.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-foreground">Ações de hoje</p>
            <Badge variant="secondary" className="text-xs">{pendingActions.length}</Badge>
          </div>
          <div className="divide-y divide-border/50">
            {pendingActions.slice(0, 3).map((action) => (
              <div key={action.id} className="flex items-start gap-3 px-4 py-3">
                <button
                  onClick={() => handleComplete(action.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-primary/40 hover:bg-primary/10 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NEWS BANNER ── */}
      {latestNews && (
        <button
          onClick={() => navigate('/insights')}
          className="w-full rounded-2xl bg-card border border-border/60 shadow-card p-4 text-left transition-all hover:shadow-elevated active:scale-[0.99]"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Newspaper className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Atualização relevante</p>
              <p className="text-sm font-semibold text-foreground line-clamp-1">{latestNews.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latestNews.summary}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
          </div>
        </button>
      )}

      {/* ── INSIGHTS CTA ── */}
      <button
        onClick={() => navigate('/insights')}
        className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-all hover:bg-primary/8 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Ver Insights Estratégicos</p>
            <p className="text-xs text-muted-foreground mt-0.5">Previsão de receita e tendências</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        </div>
      </button>

      {/* ── BOTTOM ACTIONS ── */}
      <div className="flex gap-3 pb-1">
        <Button variant="outline" className="flex-1 text-sm rounded-xl" onClick={() => navigate('/checkin')}>
          {todayCheckin ? 'Atualizar check-in' : 'Fazer check-in'}
        </Button>
        <Button variant="outline" className="flex-1 text-sm rounded-xl" onClick={() => navigate('/relatorio')}>
          Relatório
        </Button>
      </div>
    </div>
  );
}
