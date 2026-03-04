// Success Checklist — rotating daily categories
// Each weekday has a themed checklist with 3 questions

export interface ChecklistItem {
  question: string;
}

export interface ChecklistCategory {
  dayOfWeek: number; // 1=Monday...5=Friday
  emoji: string;
  title: string;
  sealName: string;
  items: ChecklistItem[];
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    dayOfWeek: 1,
    emoji: '🎯',
    title: 'Planejamento Semanal',
    sealName: '🏆 Selo do Planejador Estratégico',
    items: [
      { question: 'Meta de ocupação da semana está clara?' },
      { question: 'Revisou os horários críticos com potencial de atraso?' },
      { question: 'Ações para preencher buracos já estão definidas?' },
    ],
  },
  {
    dayOfWeek: 2,
    emoji: '📈',
    title: 'Otimização da Agenda',
    sealName: '🏆 Selo da Agenda Blindada',
    items: [
      { question: 'Todas as consultas de amanhã foram confirmadas hoje?' },
      { question: 'A lista de espera foi acionada para preencher vagas de hoje?' },
      { question: 'O tempo médio por tipo de consulta está adequado?' },
    ],
  },
  {
    dayOfWeek: 3,
    emoji: '💰',
    title: 'Proteção da Receita',
    sealName: '🏆 Selo do Protetor de Receita',
    items: [
      { question: 'Todos os no-shows de ontem foram contatados para reagendamento?' },
      { question: 'Existem pendências financeiras de pacientes de hoje?' },
      { question: 'Todos os pacientes que saíram hoje têm um retorno/próximo passo agendado?' },
    ],
  },
  {
    dayOfWeek: 4,
    emoji: '🔄',
    title: 'Processos e Fluxo',
    sealName: '🏆 Selo de Processos Afiados',
    items: [
      { question: 'O fluxo de atendimento na recepção está sem gargalos hoje?' },
      { question: 'As pendências de guias e autorizações foram zeradas?' },
      { question: 'A rotina de follow-up foi executada hoje?' },
    ],
  },
  {
    dayOfWeek: 5,
    emoji: '📊',
    title: 'Análise e Decisão',
    sealName: '🏆 Selo do Analista Estratégico',
    items: [
      { question: 'O principal motivo de perda da semana foi identificado?' },
      { question: 'A receita da semana atingiu a meta esperada?' },
      { question: 'Uma decisão de melhoria para a próxima semana foi tomada?' },
    ],
  },
];

export const POINTS_PER_ITEM = 5;
export const COMPLETION_BONUS = 10;

export function getTodayCategory(): ChecklistCategory | null {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...6=Sat
  // Convert JS day (0=Sun) to ISO day (1=Mon)
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  if (isoDay > 5) return null; // Weekend
  return CHECKLIST_CATEGORIES.find(c => c.dayOfWeek === isoDay) ?? null;
}

export function calculateChecklistPoints(answers: boolean[]): { points: number; completed: boolean } {
  const yesCount = answers.filter(Boolean).length;
  const completed = yesCount === answers.length && answers.length > 0;
  const points = yesCount * POINTS_PER_ITEM + (completed ? COMPLETION_BONUS : 0);
  return { points, completed };
}
