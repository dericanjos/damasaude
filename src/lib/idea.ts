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
  is_critical?: boolean;
}

export interface LossMap {
  noshow: number;
  cancel: number;
  buracos: number;
  total: number;
  biggest: 'noshow' | 'cancel' | 'buracos' | null;
}

export function calculateLossMap(
  data: CheckinData,
  ticketAvg: number,
): LossMap {
  const noshow = totalNoshows(data) * ticketAvg;
  const cancel = data.cancellations * ticketAvg;
  const buracos = data.empty_slots * ticketAvg;
  const total = noshow + cancel + buracos;

  let biggest: LossMap['biggest'] = null;
  const max = Math.max(noshow, cancel, buracos);
  if (max > 0) {
    if (noshow === max) biggest = 'noshow';
    else if (cancel === max) biggest = 'cancel';
    else biggest = 'buracos';
  }

  return { noshow, cancel, buracos, total, biggest };
}

export function generateActions(
  data: CheckinData,
  targetNoshowRate: number,
  ideaScore: number,
  hasSecretary = false,
  ticketAvg = 250,
): ActionRule[] {
  const sec = hasSecretary;
  const lossMap = calculateLossMap(data, ticketAvg);
  const noshows = totalNoshows(data);

  // ── Build candidate pool ──
  const candidates: (ActionRule & { lossValue: number; priority: number })[] = [];

  if (noshows > 0) {
    candidates.push({
      action_type: 'map_noshow',
      title: 'Mapear concentração de no-show',
      description: sec
        ? `${noshows} paciente${noshows > 1 ? 's' : ''} não compareceu hoje. Peça à secretária para identificar em quais horários e tipos de consulta o no-show se concentrou para ajustar a confirmação.`
        : `${noshows} paciente${noshows > 1 ? 's' : ''} não compareceu hoje. Identifique em quais horários e tipos de consulta o no-show se concentrou para ajustar seu protocolo de confirmação.`,
      lossValue: lossMap.noshow,
      priority: 1,
    });
  }

  if (data.cancellations > 0) {
    candidates.push({
      action_type: 'review_cancellations',
      title: 'Revisar padrão de reagendamento do dia',
      description: sec
        ? `${data.cancellations} cancelamento${data.cancellations > 1 ? 's' : ''} hoje. Oriente a secretária a verificar se houve remarcação e identificar o motivo para reduzir recorrência.`
        : `${data.cancellations} cancelamento${data.cancellations > 1 ? 's' : ''} hoje. Verifique se houve remarcação e identifique o motivo para reduzir recorrência nos próximos dias.`,
      lossValue: lossMap.cancel,
      priority: 1,
    });
  }

  if (data.empty_slots >= 2) {
    candidates.push({
      action_type: 'fill_slots_2x',
      title: 'Rodar rotina de preenchimento 2x hoje',
      description: sec
        ? `${data.empty_slots} buracos na agenda. Oriente a secretária a acionar a lista de espera agora e novamente no meio da tarde para maximizar o preenchimento.`
        : `${data.empty_slots} buracos na agenda. Acione sua lista de espera agora e novamente no meio da tarde para maximizar o preenchimento.`,
      lossValue: lossMap.buracos,
      priority: 1,
    });
  } else if (data.empty_slots === 1) {
    candidates.push({
      action_type: 'fill_slots',
      title: 'Preencher vaga aberta',
      description: sec
        ? `1 buraco na agenda. Oriente a secretária a acionar a lista de espera ou antecipar uma consulta futura.`
        : `1 buraco na agenda. Acione sua lista de espera ou antecipe uma consulta futura para preencher.`,
      lossValue: lossMap.buracos,
      priority: 2,
    });
  }

  if (!data.followup_done) {
    candidates.push({
      action_type: 'followup_2x',
      title: 'Executar follow-up em 2 janelas',
      description: sec
        ? 'Follow-up pendente. Peça à secretária para fazer contato pela manhã e uma segunda rodada à tarde com pacientes que precisam de retorno.'
        : 'Follow-up pendente. Faça contato pela manhã e uma segunda rodada à tarde com pacientes que precisam de retorno ou acompanhamento.',
      lossValue: 0,
      priority: 2,
    });
  }

  if (ideaScore < 70) {
    candidates.push({
      action_type: 'plan_tomorrow',
      title: 'Escolher 1 decisão para amanhã',
      description: `Score em ${ideaScore}. Escolha uma única ação preventiva para aplicar amanhã: melhorar confirmação, ajustar encaixes ou revisar horários de maior perda.`,
      lossValue: 0,
      priority: 3,
    });
  }

  if (ideaScore >= 80 && lossMap.total === 0) {
    candidates.push({
      action_type: 'maintain',
      title: 'Manter consistência amanhã',
      description: 'Dia eficiente sem vazamentos. Mantenha o mesmo protocolo amanhã para consolidar o resultado.',
      lossValue: 0,
      priority: 3,
    });
  }

  // Fallback filler
  candidates.push({
    action_type: 'schedule_admin_block',
    title: 'Bloquear 30 min para gestão',
    description: sec
      ? 'Reserve 30 minutos no final do dia com sua secretária para analisar os números da semana e revisar a agenda dos próximos dias.'
      : 'Reserve 30 minutos no final do dia para analisar seus números da semana e revisar a agenda dos próximos dias.',
    lossValue: 0,
    priority: 4,
  });

  // ── Select: 1 critical (highest loss) + 2 secondary ──
  candidates.sort((a, b) => b.lossValue - a.lossValue || a.priority - b.priority);

  const critical = candidates[0];
  critical.is_critical = true;

  const secondary = candidates.slice(1);
  // De-duplicate by action_type and pick top 2
  const seen = new Set([critical.action_type]);
  const picked: ActionRule[] = [critical];
  for (const c of secondary) {
    if (picked.length >= 3) break;
    if (seen.has(c.action_type)) continue;
    seen.add(c.action_type);
    picked.push(c);
  }

  // Ensure always 3
  while (picked.length < 3) {
    picked.push({
      action_type: 'schedule_admin_block',
      title: 'Bloquear 30 min para gestão',
      description: 'Reserve 30 minutos para revisar seus números e planejar o próximo dia.',
    });
  }

  return picked.slice(0, 3);
}

// Legacy alias kept for compatibility
export function generateInsight(data: CheckinData, ideaScore: number): string {
  return generateInsightText(data, ideaScore);
}
