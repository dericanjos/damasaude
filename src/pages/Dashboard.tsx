import { useNavigate } from 'react-router-dom';
import { useTodayCheckin, useYesterdayCheckin } from '@/hooks/useCheckin';
import { useTodayActions, useCompleteAction, useGenerateActions } from '@/hooks/useActions';
import { useClinic } from '@/hooks/useClinic';
import { useSubscription } from '@/hooks/useSubscription';
import { calculateIDEA, generateInsight, type CheckinData } from '@/lib/idea';
import IdeaScoreCard from '@/components/IdeaScoreCard';
import MetricCard from '@/components/MetricCard';
import ActionsList from '@/components/ActionsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, Users, UserX, XCircle, SquareDashed, Lightbulb, BarChart3, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import NewsBanner from '@/components/NewsBanner';

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

  const doctorName = user?.user_metadata?.doctor_name || 'Doutor(a)';

  // Renewal warning: 3 days or less
  const showRenewalBanner = (() => {
    if (!subscriptionEnd) return false;
    if (subscriptionStatus !== 'testando' && subscriptionStatus !== 'ativo') return false;
    const endDate = new Date(subscriptionEnd);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
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

  const insight = checkinData && todayScore != null ? generateInsight(checkinData, todayScore) : null;

  const handleComplete = (id: string) => {
    completeAction.mutate(id, {
      onSuccess: () => toast.success('Ação concluída! 🎉'),
    });
  };

  const handleRegenerate = () => {
    if (!checkinData) {
      toast.error('Faça o check-in primeiro para gerar ações.');
      return;
    }
    generateActionsM.mutate(checkinData, {
      onSuccess: () => toast.success('Ações regeneradas!'),
    });
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Olá, {doctorName.split(' ')[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Hoje em 30 segundos</p>
      </div>

      {/* News Banner */}
      <NewsBanner />

      {/* Renewal Banner */}
      {showRenewalBanner && (
        <Card className="border-idea-attention/30 bg-idea-attention/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-idea-attention mt-0.5" style={{ color: 'hsl(var(--idea-attention))' }} />
            <p className="text-sm text-foreground">
              Seu acesso renova em <strong>{renewalDate}</strong>. Verifique se o pagamento está ok.
            </p>
          </CardContent>
        </Card>
      )}

      {/* IDEA Score */}
      {todayScore != null ? (
        <IdeaScoreCard score={todayScore} comparison={yesterdayScore} />
      ) : (
        <Card className="border-dashed border-2 border-primary/30 bg-accent/30">
          <CardContent className="py-6 text-center">
            <CalendarCheck className="mx-auto h-8 w-8 text-primary/60 mb-2" />
            <p className="text-sm font-medium text-foreground">Faça o check-in de 1 minuto</p>
            <p className="text-xs text-muted-foreground mt-1">para atualizar o IDEA</p>
            <Button size="sm" className="mt-3" onClick={() => navigate('/checkin')}>
              Fazer check-in
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      {checkinData && (
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={Users} label="Agendados" value={checkinData.appointments_scheduled} />
          <MetricCard icon={CalendarCheck} label="Atendidos" value={checkinData.appointments_done} />
          <MetricCard icon={UserX} label="No-show" value={checkinData.no_show} variant="danger" />
          <MetricCard icon={XCircle} label="Cancelamentos" value={checkinData.cancellations} variant="warning" />
          <MetricCard icon={SquareDashed} label="Buracos" value={checkinData.empty_slots} variant={checkinData.empty_slots > 0 ? 'danger' : 'default'} />
          <MetricCard icon={Users} label="Novos" value={checkinData.new_appointments} />
        </div>
      )}

      {/* Actions */}
      <ActionsList
        actions={actions}
        onComplete={handleComplete}
        onRegenerate={handleRegenerate}
        loading={generateActionsM.isPending}
      />

      {/* Insight */}
      {insight && (
        <Card className="shadow-card border-border/50 bg-accent/30">
          <CardContent className="flex items-start gap-3 p-4">
            <Lightbulb className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground/80">Insight do Dia</p>
              <p className="text-sm text-foreground mt-0.5">{insight}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 text-sm" onClick={() => navigate('/checkin')}>
          {todayCheckin ? 'Atualizar check-in' : 'Fazer check-in (1 min)'}
        </Button>
        <Button variant="outline" className="flex-1 text-sm" onClick={() => navigate('/relatorio')}>
          <BarChart3 className="h-4 w-4 mr-1.5" />
          Relatório
        </Button>
      </div>
    </div>
  );
}
