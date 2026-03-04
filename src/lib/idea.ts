export interface CheckinData {
  appointments_scheduled: number;
  appointments_done: number;
  no_show: number;
  cancellations: number;
  new_appointments: number;
  empty_slots: number;
  followup_done: boolean;
}

const DEFAULT_DAILY_CAPACITY = 16;
export const TICKET = 250;

export function calculateRevenueLost(data: CheckinData): number {
  return (data.no_show + data.cancellations + data.empty_slots) * TICKET;
}

export function calculateRevenueEstimated(data: CheckinData): number {
  return data.appointments_done * TICKET;
}

/**
 * IDEA Score – simplified, explainable formula:
 * Base 100
 * penalty = (revenue_lost / revenue_potential) * 100
 * bonus = followup_done ? +5 : 0
 * Clamp 0–100
 */
export function calculateIDEA(data: CheckinData, dailyCapacity?: number): number {
  const capacity = dailyCapacity ?? DEFAULT_DAILY_CAPACITY;
  const revenuePotential = capacity * TICKET;
  const revenueLost = calculateRevenueLost(data);
  const penalty = (revenueLost / revenuePotential) * 100;
  const bonus = data.followup_done ? 5 : 0;
  return Math.max(0, Math.min(100, Math.round(100 - penalty + bonus)));
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

/**
 * Returns the top 2 loss sources for "O que puxou o score hoje"
 */
export function getTopLossSources(data: CheckinData): string[] {
  const sources = [
    { label: 'No-show', value: data.no_show },
    { label: 'Cancelamentos', value: data.cancellations },
    { label: 'Buracos na agenda', value: data.empty_slots },
  ]
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
  return sources.map(s => `${s.label}: ${s.value}`);
}

/**
 * Generates 1 short insight phrase (no imperative, no teaching)
 */
export function generateInsightText(data: CheckinData, ideaScore: number): string {
  if (ideaScore >= 80) return 'Agenda dentro das metas.';

  const items = [
    { label: 'no-show', value: data.no_show },
    { label: 'cancelamentos', value: data.cancellations },
    { label: 'buracos na agenda', value: data.empty_slots },
  ].sort((a, b) => b.value - a.value);

  const top = items[0];
  if (!top || top.value === 0) return 'Agenda dentro das metas.';

  if (top.label === 'no-show') return 'Hoje o no-show foi o maior vazamento.';
  if (top.label === 'buracos na agenda') return 'Ocupação abaixo da meta.';
  return 'Cancelamentos puxaram a receita para baixo hoje.';
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
      title: 'Ativar preenchimento de buracos',
      description: 'Sua ocupação está baixa. Acione a lista de espera ou antecipe consultas para preencher as vagas de hoje.',
    });
  }

  if (noShowRate >= targetNoshowRate) {
    actions.push({
      action_type: 'confirmations',
      title: 'Revisar protocolo de confirmação',
      description: 'O no-show está alto. Garanta que a confirmação em duas etapas (D-1 e D-0) seja executada sem falhas.',
    });
  }

  if (!data.followup_done) {
    actions.push({
      action_type: 'reactivation',
      title: 'Executar rotina de follow-up',
      description: 'Execute a rotina de contato com pacientes que necessitam de acompanhamento para não perder o timing.',
    });
  }

  if (ideaScore >= 80 && actions.length === 0) {
    actions.push({
      action_type: 'collect_nps',
      title: 'Pedir avaliações hoje',
      description: 'Aproveite o bom dia para fortalecer reputação e indicações.',
    });
  }

  if (actions.length < 3) {
    actions.push({
      action_type: 'schedule_admin_block',
      title: 'Bloquear 30 min para gestão',
      description: 'Separe 30 min para ver números e ajustar a agenda da semana.',
    });
  }

  return actions.slice(0, 3);
}

// Legacy alias kept for compatibility
export function generateInsight(data: CheckinData, ideaScore: number): string {
  return generateInsightText(data, ideaScore);
}
