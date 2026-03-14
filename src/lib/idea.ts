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
 * IDEA Score – improved formula
 */
export function calculateIDEA(
  data: CheckinData,
  dailyCapacity?: number,
  ticketPrivate?: number,
  ticketInsurance?: number,
): number {
  const capacity = Math.max(dailyCapacity ?? DEFAULT_DAILY_CAPACITY, 1);
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

const PROTECTION = 'O mais importante é consistência; ajuste ao seu fluxo.';

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
        ? `${noshows} falta${noshows > 1 ? 's' : ''} hoje. Uma prática comum é pedir à secretária para verificar em quais horários o no-show se concentrou (manhã vs tarde, tipo de consulta). ${PROTECTION}`
        : `${noshows} falta${noshows > 1 ? 's' : ''} hoje. Uma prática comum é verificar em quais horários o no-show se concentrou e reforçar confirmação nesses blocos (D-1 e D-0). ${PROTECTION}`,
      lossValue: lossMap.noshow,
      priority: 1,
    });
  }

  if (data.cancellations > 0) {
    candidates.push({
      action_type: 'review_cancellations',
      title: 'Revisar padrão de reagendamento do dia',
      description: sec
        ? `${data.cancellations} cancelamento${data.cancellations > 1 ? 's' : ''} hoje. Uma prática comum é a secretária verificar se houve remarcação e registrar o motivo. ${PROTECTION}`
        : `${data.cancellations} cancelamento${data.cancellations > 1 ? 's' : ''} hoje. Uma prática comum é verificar se houve remarcação e registrar o motivo principal. ${PROTECTION}`,
      lossValue: lossMap.cancel,
      priority: 1,
    });
  }

  if (data.empty_slots >= 2) {
    candidates.push({
      action_type: 'fill_slots_2x',
      title: 'Rodar rotina de preenchimento 2x hoje',
      description: sec
        ? `${data.empty_slots} buracos na agenda. Uma prática comum é acionar a lista de espera pela manhã e novamente à tarde. ${PROTECTION}`
        : `${data.empty_slots} buracos na agenda. Uma prática comum é acionar a lista de espera agora e uma segunda vez à tarde. ${PROTECTION}`,
      lossValue: lossMap.buracos,
      priority: 1,
    });
  } else if (data.empty_slots === 1) {
    candidates.push({
      action_type: 'fill_slots',
      title: 'Preencher vaga aberta',
      description: sec
        ? `1 buraco na agenda. Uma prática comum é acionar a lista de espera ou antecipar uma consulta futura. ${PROTECTION}`
        : `1 buraco na agenda. Uma prática comum é acionar a lista de espera ou antecipar uma consulta futura. ${PROTECTION}`,
      lossValue: lossMap.buracos,
      priority: 2,
    });
  }

  if (!data.followup_done) {
    candidates.push({
      action_type: 'followup_2x',
      title: 'Executar follow-up em 2 janelas',
      description: sec
        ? `Follow-up pendente. Uma prática comum é fazer contato pela manhã e uma segunda rodada à tarde (WhatsApp ou ligação). ${PROTECTION}`
        : `Follow-up pendente. Uma prática comum é fazer contato pela manhã e uma segunda rodada à tarde. ${PROTECTION}`,
      lossValue: 0,
      priority: 2,
    });
  }

  if (ideaScore < 70) {
    candidates.push({
      action_type: 'plan_tomorrow',
      title: 'Escolher 1 decisão para amanhã',
      description: `Score em ${ideaScore}. Uma prática comum é escolher uma única ação preventiva para amanhã: melhorar confirmação D-1, ajustar encaixes ou revisar horários de maior perda. ${PROTECTION}`,
      lossValue: 0,
      priority: 3,
    });
  }

  if (ideaScore >= 80 && lossMap.total === 0) {
    candidates.push({
      action_type: 'maintain',
      title: 'Manter consistência amanhã',
      description: `Dia eficiente sem vazamentos. Uma prática comum é manter o mesmo protocolo amanhã para consolidar o resultado. ${PROTECTION}`,
      lossValue: 0,
      priority: 3,
    });
  }

  // Fallback filler
  candidates.push({
    action_type: 'schedule_admin_block',
    title: 'Bloquear 30 min para gestão',
    description: sec
      ? `Uma prática comum é reservar 30 min no fim do dia com a secretária para revisar números da semana. ${PROTECTION}`
      : `Uma prática comum é reservar 30 min no fim do dia para revisar seus números e planejar o próximo dia. ${PROTECTION}`,
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
      description: `Uma prática comum é reservar 30 min para revisar seus números e planejar o próximo dia. ${PROTECTION}`,
    });
  }

  return picked.slice(0, 3);
}

// Legacy alias kept for compatibility
export function generateInsight(data: CheckinData, ideaScore: number): string {
  return generateInsightText(data, ideaScore);
}
