export interface CheckinData {
  appointments_scheduled: number;
  attended_private: number;
  attended_insurance: number;
  noshows_private: number;
  noshows_insurance: number;
  cancellations: number;
  new_appointments: number;
  empty_slots: number;
  followup_done: boolean;
}

/** Helpers */
export function totalAttended(d: CheckinData) { return d.attended_private + d.attended_insurance; }
export function totalNoshows(d: CheckinData) { return d.noshows_private + d.noshows_insurance; }

const DEFAULT_DAILY_CAPACITY = 16;
const DEFAULT_TICKET_PRIVATE = 250;
const DEFAULT_TICKET_INSURANCE = 100;

export function calculateRevenueLost(
  data: CheckinData,
  ticketPrivate = DEFAULT_TICKET_PRIVATE,
  ticketInsurance = DEFAULT_TICKET_INSURANCE,
): number {
  const avgTicket = (ticketPrivate + ticketInsurance) / 2;
  return (
    (data.noshows_private * ticketPrivate) +
    (data.noshows_insurance * ticketInsurance) +
    ((data.cancellations + data.empty_slots) * avgTicket)
  );
}

export function calculateRevenueEstimated(
  data: CheckinData,
  ticketPrivate = DEFAULT_TICKET_PRIVATE,
  ticketInsurance = DEFAULT_TICKET_INSURANCE,
): number {
  return (data.attended_private * ticketPrivate) + (data.attended_insurance * ticketInsurance);
}

/**
 * IDEA Score – improved formula:
 * IDEA = 100 - penalty + bonus_followup + bonus_occupation + bonus_capture
 *
 * - Weighted average ticket based on actual attendance proportions
 * - Conditional follow-up bonus (+5 only if base score ≥ 50)
 * - Occupation bonus (+3 if occupancy ≥ 90%)
 * - Capture bonus (+2 if new_appointments > 0)
 * - Clamped 0–100
 */
export function calculateIDEA(
  data: CheckinData,
  dailyCapacity?: number,
  ticketPrivate?: number,
  ticketInsurance?: number,
): number {
  const capacity = dailyCapacity ?? DEFAULT_DAILY_CAPACITY;
  const tp = ticketPrivate ?? DEFAULT_TICKET_PRIVATE;
  const ti = ticketInsurance ?? DEFAULT_TICKET_INSURANCE;

  const attended = totalAttended(data);
  const propPrivate = attended > 0 ? data.attended_private / attended : 0.5;
  const propInsurance = attended > 0 ? data.attended_insurance / attended : 0.5;
  const weightedTicket = (tp * propPrivate) + (ti * propInsurance);

  const revenuePotential = capacity * weightedTicket;
  const revenueLost =
    (data.noshows_private * tp) +
    (data.noshows_insurance * ti) +
    ((data.cancellations + data.empty_slots) * weightedTicket);

  const penalty = revenuePotential > 0 ? (revenueLost / revenuePotential) * 100 : 0;
  const baseScore = 100 - penalty;

  const bonusFollowup = (data.followup_done && baseScore >= 50) ? 5 : 0;
  const bonusOccupation = (attended / capacity) >= 0.90 ? 3 : 0;
  const bonusCapture = data.new_appointments > 0 ? 2 : 0;

  return Math.max(0, Math.min(100, Math.round(baseScore + bonusFollowup + bonusOccupation + bonusCapture)));
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
    { label: 'No-show', value: totalNoshows(data) },
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

  const noshows = totalNoshows(data);
  const items = [
    { label: 'no-show', value: noshows },
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

export function generateActions(data: CheckinData, targetNoshowRate: number, ideaScore: number, hasSecretary = false): ActionRule[] {
  const actions: ActionRule[] = [];
  const scheduled = Math.max(data.appointments_scheduled, 1);
  const noshows = totalNoshows(data);
  const noShowRate = noshows / scheduled;

  const sec = hasSecretary;

  if (data.empty_slots > 0) {
    actions.push({
      action_type: 'fix_empty_slots',
      title: sec ? 'Orientar secretária a preencher buracos' : 'Ativar preenchimento de buracos',
      description: sec
        ? `Você tem ${data.empty_slots} vaga${data.empty_slots > 1 ? 's' : ''} aberta${data.empty_slots > 1 ? 's' : ''} hoje. Oriente sua secretária a acionar a lista de espera, entrar em contato com pacientes que pediram encaixe ou antecipar consultas futuras para preencher esses horários vagos.`
        : `Você tem ${data.empty_slots} vaga${data.empty_slots > 1 ? 's' : ''} aberta${data.empty_slots > 1 ? 's' : ''} hoje. Use o WhatsApp Business para acionar sua lista de espera, entre em contato com pacientes que pediram encaixe ou antecipe consultas futuras para preencher esses horários vagos.`,
    });
  }

  if (noShowRate >= targetNoshowRate) {
    actions.push({
      action_type: 'confirmations',
      title: sec ? 'Pedir à secretária para revisar confirmações' : 'Revisar protocolo de confirmação',
      description: sec
        ? `O no-show de hoje está em ${Math.round(noShowRate * 100)}% (${noshows} paciente${noshows > 1 ? 's' : ''}). Peça à sua secretária para revisar se a confirmação em duas etapas está sendo feita: lembrete no dia anterior (D-1) e confirmação na manhã do atendimento (D-0).`
        : `O no-show de hoje está em ${Math.round(noShowRate * 100)}% (${noshows} paciente${noshows > 1 ? 's' : ''}). Faça você mesmo a confirmação em duas etapas: envie lembrete no dia anterior (D-1) via WhatsApp e confirme novamente na manhã do atendimento (D-0).`,
    });
  }

  if (!data.followup_done) {
    actions.push({
      action_type: 'reactivation',
      title: sec ? 'Delegar follow-up à secretária' : 'Executar rotina de follow-up',
      description: sec
        ? 'O follow-up de hoje ainda não foi feito. Peça à sua secretária para entrar em contato com pacientes que precisam de retorno ou acompanhamento. Quanto mais rápido o contato, maior a chance de manter o paciente ativo na sua agenda.'
        : 'Você ainda não fez o follow-up de hoje. Use o WhatsApp Business para entrar em contato com pacientes que precisam de retorno ou acompanhamento. Quanto mais rápido o contato, maior a chance de manter o paciente ativo na sua agenda.',
    });
  }

  if (ideaScore >= 80 && actions.length === 0) {
    actions.push({
      action_type: 'collect_nps',
      title: sec ? 'Pedir à secretária para coletar avaliações' : 'Pedir avaliações hoje',
      description: sec
        ? 'Seu dia está indo muito bem. Oriente sua secretária a pedir avaliações dos pacientes no Google ou redes sociais após o atendimento. Isso fortalece sua reputação online e gera novas indicações.'
        : 'Seu dia está indo muito bem. Aproveite a boa experiência dos pacientes para pedir avaliações no Google ou redes sociais. Isso fortalece sua reputação online e gera novas indicações.',
    });
  }

  if (actions.length < 3) {
    actions.push({
      action_type: 'schedule_admin_block',
      title: 'Bloquear 30 min para gestão',
      description: sec
        ? 'Reserve 30 minutos no final do dia com sua secretária para analisar os números da semana, revisar a agenda dos próximos dias e identificar horários que precisam de atenção.'
        : 'Reserve 30 minutos no final do dia para analisar seus números da semana, revisar a agenda dos próximos dias e identificar horários que precisam de atenção.',
    });
  }

  return actions.slice(0, 3);
}

// Legacy alias kept for compatibility
export function generateInsight(data: CheckinData, ideaScore: number): string {
  return generateInsightText(data, ideaScore);
}
