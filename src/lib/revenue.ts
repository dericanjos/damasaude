// Revenue calculation helpers for DAMA – Private vs Insurance split

export const DEFAULT_TICKET_PRIVATE = 250;
export const DEFAULT_TICKET_INSURANCE = 100;
export const DEFAULT_DAILY_CAPACITY = 16;

export interface RevenueParams {
  attended_private: number;
  attended_insurance: number;
  noshows_private: number;
  noshows_insurance: number;
  cancellations: number;
  empty_slots: number;
  ticket_private: number;
  ticket_insurance: number;
  daily_capacity: number;
  appointments_scheduled: number;
}

export interface RevenueData {
  estimated: number;       // Revenue realized today
  lost: number;            // Revenue lost (no-show + cancellations + empty_slots)
  occupancyRate: number;   // 0–1 (total_attended / daily_capacity), 0 if capacity=0
  noShowRate: number;      // 0–1 (total_noshows / scheduled)
  totalAttended: number;
  totalNoshows: number;
  averageTicket: number;   // Weighted average for generic losses
  /** true when the capacity used was a fallback (no schedule found) */
  capacityIsFallback?: boolean;
}

export function calculateRevenue(p: RevenueParams): RevenueData {
  const totalAttended = p.attended_private + p.attended_insurance;
  const totalNoshows = p.noshows_private + p.noshows_insurance;
  const scheduled = Math.max(p.appointments_scheduled, 1);

  // Determine active tickets for average calculation
  const activeTickets = [p.ticket_private, p.ticket_insurance].filter(t => t > 0);
  const averageTicket = activeTickets.length > 0
    ? activeTickets.reduce((a, b) => a + b, 0) / activeTickets.length
    : 0;

  const estimated =
    (p.attended_private * p.ticket_private) +
    (p.attended_insurance * p.ticket_insurance);

  const lost =
    (p.noshows_private * p.ticket_private) +
    (p.noshows_insurance * p.ticket_insurance) +
    ((p.cancellations + p.empty_slots) * averageTicket);

  // CRITICAL: guard against capacity <= 0
  const safeCapacity = Math.max(p.daily_capacity, 1);
  const occupancyRate = p.daily_capacity > 0 ? totalAttended / safeCapacity : 0;
  const noShowRate = totalNoshows / scheduled;

  return { estimated, lost, occupancyRate, noShowRate, totalAttended, totalNoshows, averageTicket };
}

export function formatBRL(value: number): string {
  if (!isFinite(value)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

/** Safe formatting that returns "—" for invalid values */
export function safePercent(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  return formatPercent(value);
}
