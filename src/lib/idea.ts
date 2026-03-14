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
  ticketPrivate = DEFAULT_TICKET_PRIVATE,
  ticketInsurance = DEFAULT_TICKET_INSURANCE,
  ticketAvg?: number,
): LossMap {
  const noshow = (data.noshows_private * ticketPrivate) + (data.noshows_insurance * ticketInsurance);
  const avg = ticketAvg ?? ((ticketPrivate + ticketInsurance) / 2);
  const cancel = data.cancellations * avg;
  const buracos = data.empty_slots * avg;
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

const CTA_DAMA = 'Se quiser, a DAMA te entrega isso pronto com secretária e rotina montada.';

export function generateActions(
  data: CheckinData,
  targetNoshowRate: number,
  ideaScore: number,
  hasSecretary = false,
  ticketPrivate = DEFAULT_TICKET_PRIVATE,
  ticketInsurance = DEFAULT_TICKET_INSURANCE,
  ticketAvg?: number,
): ActionRule[] {
  const sec = hasSecretary;
  const lossMap = calculateLossMap(data, ticketPrivate, ticketInsurance, ticketAvg);
  const noshows = totalNoshows(data);
  const isCritical = ideaScore < 70;

  // ── Build candidate pool ──
  const candidates: (ActionRule & { lossValue: number; priority: number })[] = [];

  if (noshows > 0) {
    const impacto = `${noshows} falta${noshows > 1 ? 's' : ''} = R$${lossMap.noshow} perdidos.`;
    candidates.push({
      action_type: 'map_noshow',
      title: 'Confirmar pacientes de amanhã agora',
      description: sec
        ? `${impacto} Faça assim hoje: (1) Secretária envia WhatsApp de confirmação D-1 para todos de amanhã. (2) Quem não respondeu em 2h, ligação. (3) Sem resposta = acione lista de espera. ⏱ 15 min. ${isCritical ? CTA_DAMA : ''}`
        : `${impacto} Faça assim hoje: (1) Envie WhatsApp de confirmação D-1 para todos de amanhã. (2) Quem não respondeu em 2h, mande "Posso liberar seu horário?". (3) Sem OK = encaixe da lista de espera. ⏱ 10 min.`,
      lossValue: lossMap.noshow,
      priority: 1,
    });
  }

  if (data.cancellations > 0) {
    const impacto = `${data.cancellations} cancelamento${data.cancellations > 1 ? 's' : ''} = R$${lossMap.cancel} perdidos.`;
    candidates.push({
      action_type: 'review_cancellations',
      title: 'Reagendar cancelamentos de hoje',
      description: sec
        ? `${impacto} Roteiro rápido: (1) Secretária liga para quem cancelou e oferece 2 datas alternativas. (2) Se não reagendar, registre o motivo. (3) Preencha o horário com lista de espera. ⏱ 10 min. ${isCritical ? CTA_DAMA : ''}`
        : `${impacto} Roteiro rápido: (1) Mande WhatsApp: "Vi que precisou desmarcar. Tenho [data] ou [data], qual prefere?". (2) Se não reagendar, registre o motivo. ⏱ 5 min.`,
      lossValue: lossMap.cancel,
      priority: 1,
    });
  }

  if (data.empty_slots >= 2) {
    const impacto = `${data.empty_slots} buracos = R$${lossMap.buracos} perdidos.`;
    candidates.push({
      action_type: 'fill_slots_2x',
      title: 'Preencher buracos da agenda',
      description: sec
        ? `${impacto} Faça assim: (1) Secretária aciona lista de espera agora. (2) Segunda rodada às 14h. (3) Se sobrar vaga, ofereça encaixe para pacientes de retorno. ⏱ 20 min total. ${isCritical ? CTA_DAMA : ''}`
        : `${impacto} Faça assim: (1) Acione sua lista de espera via WhatsApp agora. (2) Segunda tentativa às 14h. (3) Antecipe retornos se possível. ⏱ 10 min.`,
      lossValue: lossMap.buracos,
      priority: 1,
    });
  } else if (data.empty_slots === 1) {
    candidates.push({
      action_type: 'fill_slots',
      title: 'Preencher 1 vaga aberta',
      description: sec
        ? `1 buraco na agenda = R$${lossMap.buracos} perdidos. Secretária: acione lista de espera ou antecipe um retorno. ⏱ 5 min.`
        : `1 buraco na agenda = R$${lossMap.buracos} perdidos. Acione lista de espera ou antecipe um retorno. ⏱ 5 min.`,
      lossValue: lossMap.buracos,
      priority: 2,
    });
  }

  if (!data.followup_done) {
    candidates.push({
      action_type: 'followup_2x',
      title: 'Fazer follow-up dos pacientes de hoje',
      description: sec
        ? `Follow-up pendente. Faça assim: (1) Secretária envia mensagem de pós-consulta até 18h. (2) Pacientes que faltaram: "Notamos que não conseguiu vir. Quer reagendar?". ⏱ 10 min.`
        : `Follow-up pendente. Copie e cole: "Olá [nome], como está se sentindo após a consulta?" Para quem faltou: "Vi que não conseguiu vir. Posso agendar outro horário?". ⏱ 10 min.`,
      lossValue: 0,
      priority: 2,
    });
  }

  if (ideaScore < 70) {
    candidates.push({
      action_type: 'plan_tomorrow',
      title: 'Definir 1 ação preventiva para amanhã',
      description: `Score em ${ideaScore} — dia difícil, mas recuperável. Escolha UMA ação: reforçar confirmação D-1, abrir encaixes extras ou ajustar horários de maior perda. Impacto estimado: até R$${Math.round(lossMap.total * 0.3)} recuperáveis.`,
      lossValue: 0,
      priority: 3,
    });
  }

  if (ideaScore >= 80 && lossMap.total === 0) {
    candidates.push({
      action_type: 'maintain',
      title: 'Manter o ritmo amanhã',
      description: `Dia eficiente sem vazamentos — parabéns. Mantenha o mesmo protocolo de confirmação e preenchimento amanhã para consolidar.`,
      lossValue: 0,
      priority: 3,
    });
  }

  // Fallback filler
  candidates.push({
    action_type: 'schedule_admin_block',
    title: 'Revisar números do dia em 5 min',
    description: sec
      ? `Reserve 5 min com a secretária no fim do expediente: quantos atendeu, quantos faltaram, agenda de amanhã lotada? Essa rotina simples evita surpresas.`
      : `Reserve 5 min no fim do expediente: quantos atendeu, quantos faltaram, amanhã está lotado? Essa rotina evita surpresas.`,
    lossValue: 0,
    priority: 4,
  });

  // ── Select: 1 critical (highest loss) + 2 secondary ──
  candidates.sort((a, b) => b.lossValue - a.lossValue || a.priority - b.priority);

  const critical = candidates[0];
  critical.is_critical = true;

  const seen = new Set([critical.action_type]);
  const picked: ActionRule[] = [critical];
  for (const c of candidates.slice(1)) {
    if (picked.length >= 3) break;
    if (seen.has(c.action_type)) continue;
    seen.add(c.action_type);
    picked.push(c);
  }

  // Ensure always 3
  while (picked.length < 3) {
    picked.push({
      action_type: 'schedule_admin_block',
      title: 'Revisar números do dia em 5 min',
      description: `Reserve 5 min no fim do expediente para revisar números e planejar amanhã.`,
    });
  }

  return picked.slice(0, 3);
}

// Legacy alias kept for compatibility
export function generateInsight(data: CheckinData, ideaScore: number): string {
  return generateInsightText(data, ideaScore);
}
