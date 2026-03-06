// Dynamic checklist system — "card deck" logic

export interface ChecklistItem {
  question: string;
  tip: string;
}

export interface ChecklistRecord {
  id: number;
  category: string;
  task_1: string;
  tip_1: string;
  task_2: string;
  tip_2: string;
  task_3: string;
  tip_3: string;
  task_4: string | null;
  tip_4: string | null;
  level: number;
}

export const POINTS_PER_ITEM = 5;
export const COMPLETION_BONUS = 10;

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Iniciante',
  2: 'Intermediário',
  3: 'Avançado',
};

export const CHECKLISTS_TO_UNLOCK_NEXT = 5; // Complete 5 of level N to unlock N+1

export function checklistToItems(checklist: ChecklistRecord): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { question: checklist.task_1, tip: checklist.tip_1 },
    { question: checklist.task_2, tip: checklist.tip_2 },
    { question: checklist.task_3, tip: checklist.tip_3 },
  ];
  if (checklist.task_4 && checklist.tip_4) {
    items.push({ question: checklist.task_4, tip: checklist.tip_4 });
  }
  return items;
}

export function calculateChecklistPoints(answers: boolean[]): { points: number; completed: boolean } {
  const yesCount = answers.filter(Boolean).length;
  const completed = yesCount === answers.length && answers.length > 0;
  const points = yesCount * POINTS_PER_ITEM + (completed ? COMPLETION_BONUS : 0);
  return { points, completed };
}

/** Map JS day abbreviation to PT-BR */
const DAY_MAP: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

export function isTodayWorkingDay(workingDays: string[]): boolean {
  const today = new Date().getDay(); // 0=Sun...6=Sat
  return workingDays.some(d => DAY_MAP[d] === today);
}

export function getWorkingDaysPerWeek(workingDays: string[]): number {
  return workingDays.length;
}

/**
 * Adapts checklist task/tip text based on whether the doctor has a secretary.
 * With secretary: uses delegation language.
 * Without secretary: uses direct action language.
 */
export function adaptChecklistText(text: string, hasSecretary: boolean): string {
  if (!hasSecretary) return text;
  
  // Common patterns to convert to delegation language
  const replacements: [RegExp, string][] = [
    [/^Envie /i, 'Peça à sua secretária para enviar '],
    [/^Confirme /i, 'Peça à sua secretária para confirmar '],
    [/^Ligue /i, 'Peça à sua secretária para ligar '],
    [/^Entre em contato /i, 'Peça à sua secretária para entrar em contato '],
    [/^Revise /i, 'Peça à sua secretária para revisar '],
    [/^Organize /i, 'Peça à sua secretária para organizar '],
    [/^Agende /i, 'Peça à sua secretária para agendar '],
    [/^Reagende /i, 'Peça à sua secretária para reagendar '],
    [/^Verifique /i, 'Peça à sua secretária para verificar '],
    [/^Faça /i, 'Peça à sua secretária para fazer '],
    [/^Realize /i, 'Peça à sua secretária para realizar '],
    [/^Separe /i, 'Peça à sua secretária para separar '],
    [/^Prepare /i, 'Peça à sua secretária para preparar '],
    [/^Cheque /i, 'Peça à sua secretária para checar '],
    [/^Mande /i, 'Peça à sua secretária para mandar '],
    [/^Identifique /i, 'Peça à sua secretária para identificar '],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }

  // If no specific pattern matched but it starts with a verb, add generic prefix
  // Check if first word looks like an imperative verb (ends in 'e', 'a', etc.)
  return text;
}
