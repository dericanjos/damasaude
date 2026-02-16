export interface CheckinData {
  appointments_scheduled: number;
  appointments_done: number;
  no_show: number;
  cancellations: number;
  new_appointments: number;
  empty_slots: number;
  followup_done: boolean;
}

export function calculateIDEA(data: CheckinData): number {
  const scheduled = Math.max(data.appointments_scheduled, 1);
  const noShowRate = data.no_show / scheduled;
  const cancellationRate = data.cancellations / scheduled;
  const emptySlotsRate = data.empty_slots / scheduled;

  const base = 100;
  const penalty = (noShowRate * 40 + cancellationRate * 20 + emptySlotsRate * 30) * 100;
  const bonus = data.followup_done ? 10 : 0;
  const idea = base - penalty + bonus;

  return Math.max(0, Math.min(100, Math.round(idea)));
}

export function getIdeaStatus(score: number): 'critical' | 'attention' | 'stable' {
  if (score < 60) return 'critical';
  if (score < 80) return 'attention';
  return 'stable';
}

export function getIdeaLabel(status: 'critical' | 'attention' | 'stable'): string {
  switch (status) {
    case 'critical': return 'Crítico';
    case 'attention': return 'Atenção';
    case 'stable': return 'Estável';
  }
}

export interface ActionRule {
  action_type: string;
  title: string;
  description: string;
}

export function generateActions(data: CheckinData, targetNoshowRate: number, ideaScore: number): ActionRule[] {
  const actions: ActionRule[] = [];
  const scheduled = Math.max(data.appointments_scheduled, 1);
  const noShowRate = data.no_show / scheduled;

  if (data.empty_slots > 0) {
    actions.push({
      action_type: 'fix_empty_slots',
      title: `Preencher ${data.empty_slots} buraco${data.empty_slots > 1 ? 's' : ''} na agenda hoje`,
      description: 'Ative lista de espera e reative contatos para ocupar os horários vazios.',
    });
  }

  if (noShowRate >= targetNoshowRate) {
    actions.push({
      action_type: 'confirmations',
      title: 'Reforçar confirmações para reduzir faltas',
      description: 'Confirmar pacientes e reforçar orientação/horário para reduzir no-show.',
    });
  }

  if (!data.followup_done) {
    actions.push({
      action_type: 'reactivation',
      title: 'Executar follow-up e reativação',
      description: 'Reativar contatos que pediram informação e não agendaram.',
    });
  }

  if (ideaScore >= 80 && actions.length === 0) {
    actions.push({
      action_type: 'collect_nps',
      title: 'Pedir avaliações/NPS hoje',
      description: 'Aproveite o bom dia para fortalecer reputação e indicações.',
    });
  }

  if (actions.length < 3) {
    actions.push({
      action_type: 'schedule_admin_block',
      title: 'Bloquear 30 min para gestão',
      description: 'Separe 30 min hoje para ver números e ajustar agenda.',
    });
  }

  return actions.slice(0, 3);
}

export function generateInsight(data: CheckinData, ideaScore: number): string {
  const scheduled = Math.max(data.appointments_scheduled, 1);
  const noShowRate = data.no_show / scheduled;
  const emptySlotsRate = data.empty_slots / scheduled;
  const cancellationRate = data.cancellations / scheduled;

  if (ideaScore >= 80) {
    return 'Bom dia: aproveite para pedir avaliações e fortalecer indicações.';
  }

  const impacts = [
    { label: 'buracos na agenda', value: emptySlotsRate * 30 },
    { label: 'no-show', value: noShowRate * 40 },
    { label: 'cancelamentos', value: cancellationRate * 20 },
  ].sort((a, b) => b.value - a.value);

  if (impacts[0].value > 0) {
    if (impacts[0].label === 'no-show') {
      return 'Seu no-show está acima da meta. Priorize confirmações.';
    }
    return `Hoje o maior impacto no seu IDEA foram os ${impacts[0].label}.`;
  }

  return 'Continue monitorando sua agenda para manter a estabilidade.';
}
