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
