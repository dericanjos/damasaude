import { getDay } from 'date-fns';

export const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  dom: 'Domingo',
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
};

export const DAY_SHORT_LABELS: Record<DayKey, string> = {
  dom: 'D', seg: 'S', ter: 'T', qua: 'Q', qui: 'Q', sex: 'S', sab: 'S',
};

/** JS getDay() returns 0=Sunday…6=Saturday → map to our keys */
const JS_DAY_TO_KEY: DayKey[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export type DailyCapacities = Record<DayKey, number>;

export const DEFAULT_CAPACITIES: DailyCapacities = {
  dom: 0, seg: 16, ter: 16, qua: 16, qui: 16, sex: 16, sab: 0,
};

/** Get the capacity for a specific date string (yyyy-MM-dd) or Date */
export function getCapacityForDate(
  dateOrStr: Date | string,
  capacities?: DailyCapacities | null,
  fallback = 16,
): number {
  const date = typeof dateOrStr === 'string' ? new Date(dateOrStr + 'T12:00:00') : dateOrStr;
  const key = JS_DAY_TO_KEY[getDay(date)];
  const caps = capacities ?? DEFAULT_CAPACITIES;
  return caps[key] ?? fallback;
}

/** Parse the jsonb from DB into typed DailyCapacities */
export function parseDailyCapacities(raw: any): DailyCapacities {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CAPACITIES };
  const result = { ...DEFAULT_CAPACITIES };
  for (const k of DAY_KEYS) {
    if (typeof raw[k] === 'number') result[k] = raw[k];
  }
  return result;
}
