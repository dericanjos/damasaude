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

/** Day-of-week index (0=Sun) used to rotate recommendation variants */
function dayVariant(): number {
  return new Date().getDay(); // 0-6
}

// ── Rotation pools ──
const NOSHOW_VARIANTS = [
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Reforçar confirmações para amanhã',
    description: sec
      ? `${impacto} Uma prática comum: secretária envia confirmação D-1 e, se não houver resposta em 2h, liga. Quem não confirmar = lista de espera. ⏱ 15 min. ${cta}`
      : `${impacto} Se fizer sentido no seu fluxo: envie confirmação D-1 por mensagem. Sem resposta em 2h → "Posso liberar seu horário?". Sem OK → encaixe. ⏱ 10 min.`,
  }),
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Ativar lista de espera preventiva',
    description: sec
      ? `${impacto} Exemplo (adapte): secretária monta lista de espera com 3-5 pacientes flexíveis e aciona assim que abrir vaga. Reduz perda sem esforço extra. ⏱ 10 min. ${cta}`
      : `${impacto} Opção simples: mantenha 3-5 pacientes flexíveis em lista de espera. Quando alguém faltar, uma mensagem rápida já preenche. ⏱ 5 min.`,
  }),
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Revisar perfil de quem faltou',
    description: sec
      ? `${impacto} Peça para a secretária anotar o perfil de quem faltou (horário, tipo de consulta). Em 1-2 semanas, você identifica padrões e pode ajustar a grade. ⏱ 5 min. ${cta}`
      : `${impacto} Anote rapidamente: quem faltou, horário, se era primeira vez. Padrões aparecem em poucos dias e permitem ajustes na agenda. ⏱ 5 min.`,
  }),
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Testar confirmação em etapas',
    description: sec
      ? `${impacto} Se fizer sentido: secretária confirma D-2 por mensagem, D-1 por ligação curta. Dois pontos de contato reduzem faltas sem parecer insistente. ⏱ 15 min. ${cta}`
      : `${impacto} Exemplo (adapte): D-2 envie lembrete automático; D-1, mensagem personalizada. Dois toques discretos reduzem faltas. ⏱ 10 min.`,
  }),
];

const CANCEL_VARIANTS = [
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Reagendar cancelamentos de hoje',
    description: sec
      ? `${impacto} Uma prática comum: secretária oferece 2 datas alternativas por ligação. Se não reagendar, registre o motivo e acione lista de espera. ⏱ 10 min. ${cta}`
      : `${impacto} Se fizer sentido: mande mensagem oferecendo 2 datas próximas. Quem não reagendar, registre o motivo para análise futura. ⏱ 5 min.`,
  }),
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Criar janela de reposição rápida',
    description: sec
      ? `${impacto} Exemplo (adapte): secretária mantém bloco de 30 min no fim do expediente para encaixar reagendamentos do dia. Reduz perda sem comprometer a grade. ⏱ 5 min. ${cta}`
      : `${impacto} Opção simples: reserve 1-2 slots flexíveis na semana para absorver cancelamentos de última hora. Isso reduz buracos sem mexer na grade fixa. ⏱ 5 min.`,
  }),
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Mapear motivos de cancelamento',
    description: sec
      ? `${impacto} Peça à secretária para registrar o motivo de cada cancelamento (custo, horário, urgência). Em 2 semanas você terá dados para ajustar. ⏱ 5 min. ${cta}`
      : `${impacto} Anote o motivo de cada cancelamento — depois de alguns dias, padrões aparecem (ex.: horários, distância, custo). Isso direciona ajustes reais. ⏱ 3 min.`,
  }),
];

const SLOTS_VARIANTS = [
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Preencher buracos na agenda',
    description: sec
      ? `${impacto} Uma prática comum: secretária aciona lista de espera agora e faz segunda rodada às 14h. Se sobrar vaga, antecipe retornos. ⏱ 20 min total. ${cta}`
      : `${impacto} Se fizer sentido: acione lista de espera agora. Segunda tentativa às 14h. Antecipe retornos se possível. ⏱ 10 min.`,
  }),
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Redistribuir horários ociosos',
    description: sec
      ? `${impacto} Exemplo (adapte): secretária verifica se há pacientes de outros dias que podem antecipar. Redistribuir é mais eficiente que esperar encaixes. ⏱ 15 min. ${cta}`
      : `${impacto} Opção: veja se algum paciente da semana pode antecipar para hoje. Às vezes o preenchimento mais fácil já está na sua própria agenda. ⏱ 10 min.`,
  }),
  (sec: boolean, impacto: string, cta: string) => ({
    title: 'Ajustar grade para evitar buracos',
    description: sec
      ? `${impacto} Revise com a secretária: os buracos caem sempre no mesmo horário? Se sim, considere concentrar agenda ou oferecer esses slots para encaixe prioritário. ⏱ 10 min. ${cta}`
      : `${impacto} Observe: os buracos repetem no mesmo horário? Se sim, concentrar a agenda nesses períodos ou oferecer para encaixes pode resolver. ⏱ 5 min.`,
  }),
];

const FOLLOWUP_VARIANTS = [
  (sec: boolean) => ({
    title: 'Fazer follow-up dos pacientes de hoje',
    description: sec
      ? `Follow-up pendente. Uma prática comum: secretária envia mensagem de pós-consulta até 18h. Para quem faltou: "Notamos que não conseguiu vir. Quer reagendar?". ⏱ 10 min.`
      : `Follow-up pendente. Se fizer sentido: envie mensagem rápida de pós-consulta. Para quem faltou: "Vi que não conseguiu vir. Posso agendar outro horário?". ⏱ 10 min.`,
  }),
  (sec: boolean) => ({
    title: 'Prevenir evasão com contato pós-consulta',
    description: sec
      ? `Follow-up pendente. Exemplo (adapte): secretária envia mensagem curta perguntando como o paciente está. Pacientes que recebem follow-up retornam mais. ⏱ 10 min.`
      : `Follow-up pendente. Opção simples: uma mensagem curta ("Como está se sentindo?") aumenta retorno. Para quem faltou, ofereça reagendamento. ⏱ 5 min.`,
  }),
];

function pickVariant<T>(pool: T[]): T {
  return pool[dayVariant() % pool.length];
}

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
  const cta = isCritical ? CTA_DAMA : '';

  const candidates: (ActionRule & { lossValue: number; priority: number })[] = [];

  if (noshows > 0) {
    const impacto = `${noshows} falta${noshows > 1 ? 's' : ''} = R$${lossMap.noshow} perdidos.`;
    const v = pickVariant(NOSHOW_VARIANTS)(sec, impacto, cta);
    candidates.push({
      action_type: 'map_noshow',
      ...v,
      lossValue: lossMap.noshow,
      priority: 1,
    });
  }

  if (data.cancellations > 0) {
    const impacto = `${data.cancellations} cancelamento${data.cancellations > 1 ? 's' : ''} = R$${lossMap.cancel} perdidos.`;
    const v = pickVariant(CANCEL_VARIANTS)(sec, impacto, cta);
    candidates.push({
      action_type: 'review_cancellations',
      ...v,
      lossValue: lossMap.cancel,
      priority: 1,
    });
  }

  if (data.empty_slots >= 2) {
    const impacto = `${data.empty_slots} buracos = R$${lossMap.buracos} perdidos.`;
    const v = pickVariant(SLOTS_VARIANTS)(sec, impacto, cta);
    candidates.push({
      action_type: 'fill_slots_2x',
      ...v,
      lossValue: lossMap.buracos,
      priority: 1,
    });
  } else if (data.empty_slots === 1) {
    candidates.push({
      action_type: 'fill_slots',
      title: 'Preencher 1 vaga aberta',
      description: sec
        ? `1 buraco na agenda = R$${lossMap.buracos} perdidos. Se fizer sentido: secretária aciona lista de espera ou antecipa um retorno. ⏱ 5 min.`
        : `1 buraco na agenda = R$${lossMap.buracos} perdidos. Opção: acione lista de espera ou antecipe um retorno. ⏱ 5 min.`,
      lossValue: lossMap.buracos,
      priority: 2,
    });
  }

  if (!data.followup_done) {
    const v = pickVariant(FOLLOWUP_VARIANTS)(sec);
    candidates.push({
      action_type: 'followup_2x',
      ...v,
      lossValue: 0,
      priority: 2,
    });
  }

  if (ideaScore < 70) {
    candidates.push({
      action_type: 'plan_tomorrow',
      title: 'Definir 1 ação preventiva para amanhã',
      description: `Score em ${ideaScore} — dia difícil, mas recuperável. Escolha UMA ação que faça sentido: reforçar confirmação, abrir encaixes extras ou ajustar horários. Impacto estimado: até R$${Math.round(lossMap.total * 0.3)} recuperáveis.`,
      lossValue: 0,
      priority: 3,
    });
  }

  if (ideaScore >= 80 && lossMap.total === 0) {
    candidates.push({
      action_type: 'maintain',
      title: 'Manter o ritmo amanhã',
      description: `Dia eficiente sem vazamentos — parabéns. O mais importante é consistência; ajuste ao seu fluxo e mantenha o mesmo ritmo amanhã.`,
      lossValue: 0,
      priority: 3,
    });
  }

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
