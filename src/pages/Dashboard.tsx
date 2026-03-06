import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useTodayCheckin, useYesterdayCheckin } from '@/hooks/useCheckin';
import { useTodayActions, useCompleteAction } from '@/hooks/useActions';
import { useClinic } from '@/hooks/useClinic';
import { useSubscription } from '@/hooks/useSubscription';
import { useCheckinStreak } from '@/hooks/useChecklist';
import { calculateIDEA, getIdeaStatus, getIdeaLabel, totalAttended, totalNoshows, type CheckinData } from '@/lib/idea';
import { calculateRevenue, formatBRL, formatPercent, DEFAULT_DAILY_CAPACITY, DEFAULT_TICKET_PRIVATE, DEFAULT_TICKET_INSURANCE } from '@/lib/revenue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SuccessChecklistCard from '@/components/SuccessChecklistCard';
import {
  TrendingDown, TrendingUp, AlertCircle, CheckCircle2,
  ClipboardCheck, ArrowRight, Bell, HelpCircle, Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLatestNews } from '@/hooks/useNews';
import { useEfficiencyBadge } from '@/hooks/useEfficiencyBadge';
import { cn } from '@/lib/utils';
import LossRadarCard from '@/components/LossRadarCard';
import EfficiencyBadgeModal from '@/components/EfficiencyBadgeModal';
import DailyVerseCard from '@/components/DailyVerseCard';

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
  const { data: todayCheckin } = useTodayCheckin();
  const { data: yesterdayCheckin } = useYesterdayCheckin();
  const { data: actions = [] } = useTodayActions();
  const completeAction = useCompleteAction();
  const { subscriptionStatus, subscriptionEnd } = useSubscription();
  const { data: news } = useLatestNews();
  const { data: streak = 0 } = useCheckinStreak();
  const { data: hasBadge } = useEfficiencyBadge();

  const doctorName = (clinic as any)?.doctor_name || user?.user_metadata?.doctor_name || '';
  const doctorGender = (clinic as any)?.doctor_gender || 'masculino';
  const prefix = doctorGender === 'feminino' ? 'Dra.' : 'Dr.';
  const firstName = doctorName.split(' ')[0];

  const targetFillRate = clinic?.target_fill_rate ?? 0.85;
  const targetNoShowRate = clinic?.target_noshow_rate ?? 0.05;
  const dailyCapacity = (clinic as any)?.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
  const ticketPrivate = (clinic as any)?.ticket_private ?? DEFAULT_TICKET_PRIVATE;
  const ticketInsurance = (clinic as any)?.ticket_insurance ?? DEFAULT_TICKET_INSURANCE;

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

  const todayScore = checkinData ? calculateIDEA(checkinData, dailyCapacity, ticketPrivate, ticketInsurance) : null;
  const yesterdayScore = yesterdayCheckin
    ? calculateIDEA(toCheckinData(yesterdayCheckin), dailyCapacity, ticketPrivate, ticketInsurance)
    : null;

  const revenue = checkinData
    ? calculateRevenue({
        ...checkinData,
        daily_capacity: dailyCapacity,
        ticket_private: ticketPrivate,
        ticket_insurance: ticketInsurance,
      })
    : null;
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

  // Single priority alert with premium copy
  type Alert = { type: 'warn' | 'ok'; label: string; message: string; action?: string };
  const alert: Alert = (() => {
    if (!checkinData || !revenue) return { type: 'ok', label: 'STATUS', message: 'Faça o check-in para ver seus alertas.' };

    if (revenue.lost > 500)
      return { type: 'warn', label: 'ALERTA FINANCEIRO', message: `Você tem um vazamento de receita de ${formatBRL(revenue.lost)} hoje. A causa principal é faltas e buracos na agenda.`, action: 'Revise motivos no Relatório' };
    if (revenue.noShowRate > targetNoShowRate)
      return { type: 'warn', label: 'ALERTA DE AGENDA', message: `Sua taxa de no-show (${formatPercent(revenue.noShowRate)}) está acima da meta (${formatPercent(targetNoShowRate)}). É crucial reforçar a consistência das confirmações.` };
    if (revenue.occupancyRate < targetFillRate)
      return { type: 'warn', label: 'ALERTA DE OCUPAÇÃO', message: `Sua ocupação (${formatPercent(revenue.occupancyRate)}) está abaixo da meta (${formatPercent(targetFillRate)}). Existem buracos na agenda que precisam ser preenchidos.` };
    if (!checkinData.followup_done)
      return { type: 'warn', label: 'ALERTA DE PROCESSO', message: 'O follow-up não foi executado hoje. Isso aumenta o risco de perder oportunidades de reagendamento e retorno.' };

    return { type: 'ok', label: 'STATUS ESTÁVEL', message: 'Sua operação está alinhada com as metas. Ótimo trabalho mantendo a disciplina.' };
  })();

  const handleComplete = (id: string) => {
    completeAction.mutate(id, {
      onSuccess: () => toast.success('Ação concluída!'),
    });
  };

  const pendingActions = actions.filter(a => a.status === 'pending');
  const criticalAction = pendingActions[0] ?? null;
  const nextActions = pendingActions.slice(1, 3);
  const latestNews = news?.[0] ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 py-5 space-y-4">
      <EfficiencyBadgeModal />
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Olá, {prefix} {firstName} {hasBadge && <span title="Selo de Clínica Eficiente">🏅</span>} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Visão do dia</p>
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

      {/* ── SUCCESS CHECKLIST (always first action) ── */}
      <SuccessChecklistCard />

      {/* ── CHECK-IN PROMPT or IDEA SCORE ── */}
      {todayScore == null ? (
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
      ) : (
        <div className={cn(
          'rounded-2xl p-5 shadow-elevated',
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
              <p className="text-5xl font-extrabold text-white tracking-tight mt-0.5">{todayScore}</p>
              <p className="text-sm font-semibold text-white/90 mt-0.5">{getIdeaLabel(ideaStatus!)}</p>
              <p className="text-[11px] text-white/60 mt-0.5">Quanto maior, mais eficiente sua agenda</p>
              {yesterdayScore != null && (
                <p className="text-xs text-white/65 mt-1">
                  {todayScore - yesterdayScore > 0 ? `+${todayScore - yesterdayScore}` : todayScore - yesterdayScore} vs ontem
                </p>
              )}
            </div>
            <div className="text-right opacity-70">
              <p className="text-sm text-white font-bold">{todayScore}<span className="text-base text-white/60">/100</span></p>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/80 border-t border-white/20 pt-2">
            {ideaDescription}
          </p>
        </div>
      )}

      {/* ── LOSS RADAR / TREND ALERT (only after check-in) ── */}
      {todayScore != null && <LossRadarCard />}

      {/* ── STREAK + IDEA GAUGE (only after check-in) ── */}
      {todayScore != null && (
        <div className="grid grid-cols-2 gap-3">
          {/* Streak */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card flex flex-col items-center justify-center text-center">
            <Flame className={cn('h-8 w-8 mb-1', streak >= 3 ? 'text-orange-500' : 'text-muted-foreground')} />
            <p className="text-2xl font-bold text-foreground">{streak} {streak === 1 ? 'dia' : 'dias'}</p>
            <p className="text-[11px] text-muted-foreground">de consistência</p>
          </div>
          {/* IDEA Gauge */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card flex flex-col items-center justify-center text-center">
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
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 text-sm" side="top">
                  <p className="font-semibold mb-1">O que é o Índice IDEA?</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    O IDEA mede a eficiência da sua agenda com base em ocupação, no-shows e cancelamentos. Score acima de 70 = agenda saudável.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-[10px] text-muted-foreground/70">Quanto maior, mais eficiente</p>
          </div>
        </div>
      )}
      {revenue && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-revenue-gain" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Receita est.</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatBRL(revenue.estimated)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{revenue.totalAttended} consultas</p>
          </div>
          <div className="rounded-2xl bg-card border border-revenue-loss/40 p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-revenue-loss" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Receita perdida</span>
            </div>
            <p className="text-2xl font-bold text-revenue-loss">{formatBRL(revenue.lost)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{revenue.totalNoshows + (checkinData?.cancellations ?? 0) + (checkinData?.empty_slots ?? 0)} perdas</p>
          </div>
        </div>
      )}

      {/* ── OCCUPANCY + NO-SHOW ── */}
      {revenue && (
        <div className="grid grid-cols-2 gap-3">
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
                className={cn('h-full rounded-full', revenue.noShowRate <= targetNoShowRate ? 'bg-idea-stable' : 'bg-destructive')}
                style={{ width: `${Math.min(100, revenue.noShowRate * 100 * 4)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SINGLE ALERT ── */}
      {checkinData && (
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
        <div className="rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">⚡ Ação Crítica de Hoje</p>
            <p className="text-[10px] text-muted-foreground">Esta é a ação com maior potencial de impacto no seu resultado de hoje.</p>
          </div>
          <div className="flex items-start gap-3 px-4 pb-4 pt-2">
            <button
              onClick={() => handleComplete(criticalAction.id)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-primary/50 hover:bg-primary/10 transition-colors"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{criticalAction.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{criticalAction.description}</p>
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
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DAILY VERSE ── */}
      <DailyVerseCard />

      {/* ── NEWS BANNER ── */}
      {latestNews && (
        <button
          onClick={() => navigate('/insights')}
          className="w-full rounded-2xl bg-card border border-border/60 shadow-card p-4 text-left transition-all hover:shadow-elevated active:scale-[0.99]"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Atualização relevante para você</p>
              <p className="text-sm font-semibold text-foreground line-clamp-1">{latestNews.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latestNews.summary}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
          </div>
        </button>
      )}
    </div>
  );
}
