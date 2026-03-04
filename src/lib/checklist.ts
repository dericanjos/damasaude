// Success Checklist — rotating daily categories
// Each weekday has a themed checklist with 3 actionable micro-tasks + tips

export interface ChecklistItem {
  question: string;
  tip: string;
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
    emoji: '💰',
    title: 'Proteção da Receita',
    sealName: '🏆 Selo do Protetor de Receita',
    items: [
      {
        question: 'Pedir à secretária para contatar os no-shows de ontem para reagendamento.',
        tip: 'Use o script de reativação para garantir a conversão.',
      },
      {
        question: 'Verificar se há pacientes com pendências financeiras na agenda de hoje.',
        tip: 'A cobrança pré-consulta evita constrangimentos e perdas.',
      },
      {
        question: 'Garantir que todo paciente atendido hoje saiu com o próximo passo agendado.',
        tip: 'Agende o retorno antes que ele saia do consultório.',
      },
    ],
  },
  {
    dayOfWeek: 2,
    emoji: '🛡️',
    title: 'Blindagem da Agenda',
    sealName: '🏆 Selo da Agenda Blindada',
    items: [
      {
        question: 'Analisar a agenda de amanhã em busca de mais de 2 buracos consecutivos.',
        tip: 'Se houver, acione a lista de espera ou remaneje pacientes.',
      },
      {
        question: 'Confirmar via WhatsApp os 5 primeiros pacientes de amanhã.',
        tip: 'Envie a mensagem de confirmação padrão até as 18h de hoje.',
      },
      {
        question: 'Revisar se há horários nobres (manhã) vagos nesta semana.',
        tip: 'Ofereça proativamente para pacientes da lista de espera.',
      },
    ],
  },
  {
    dayOfWeek: 3,
    emoji: '🔄',
    title: 'Máquina de Reativação',
    sealName: '🏆 Selo do Reativador',
    items: [
      {
        question: 'Selecionar 3 pacientes que não voltaram nos últimos 60 dias.',
        tip: 'Priorize os de maior ticket médio.',
      },
      {
        question: 'Enviar mensagem de reativação personalizada para cada um.',
        tip: 'Use o template "Olá [Nome], sentimos sua falta..."',
      },
      {
        question: 'Verificar se há pacientes com tratamento incompleto na base de dados.',
        tip: 'Uma ligação pode reativar um tratamento parado.',
      },
    ],
  },
  {
    dayOfWeek: 4,
    emoji: '⭐',
    title: 'Experiência do Paciente',
    sealName: '🏆 Selo da Experiência Premium',
    items: [
      {
        question: 'Perguntar a 1 paciente hoje: "De 0 a 10, como foi sua experiência?"',
        tip: 'O feedback direto é a forma mais rápida de melhorar.',
      },
      {
        question: 'Verificar se a recepção está organizada e acolhedora.',
        tip: 'Olhe o ambiente com os olhos de um paciente de primeira viagem.',
      },
      {
        question: 'Confirmar que o tempo de espera médio hoje está abaixo de 15 minutos.',
        tip: 'Se estiver acima, revise os tempos de consulta.',
      },
    ],
  },
  {
    dayOfWeek: 5,
    emoji: '📊',
    title: 'Visão Estratégica',
    sealName: '🏆 Selo do Estrategista',
    items: [
      {
        question: 'Revisar o Índice IDEA da semana e anotar 1 aprendizado.',
        tip: 'O que mais impactou o score, positiva ou negativamente?',
      },
      {
        question: 'Definir 1 meta de melhoria para a próxima semana.',
        tip: 'Ex: "Reduzir no-show em 1 paciente".',
      },
      {
        question: 'Verificar se a taxa de ocupação da semana atingiu a meta definida.',
        tip: 'Se não, o que pode ser feito de diferente na próxima semana?',
      },
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
