// Revenue calculation helpers for DAMA

export const DEFAULT_TICKET = 250; // R$ médio por consulta
export const DEFAULT_DAILY_CAPACITY = 16;

export interface RevenueData {
  estimated: number;       // Revenue realized today
  lost: number;            // Revenue lost (no-show + cancellations + empty_slots)
  occupancyRate: number;   // 0–1 (done / daily_capacity)
  noShowRate: number;      // 0–1 (no_show / scheduled)
}

export function calculateRevenue(data: {
  appointments_scheduled: number;
  appointments_done: number;
  no_show: number;
  cancellations: number;
  empty_slots?: number;
  ticket?: number;
  daily_capacity?: number;
}): RevenueData {
  const ticket = data.ticket ?? DEFAULT_TICKET;
  const capacity = data.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
  const scheduled = Math.max(data.appointments_scheduled, 1);

  const estimated = data.appointments_done * ticket;
  const lost = (data.no_show + data.cancellations + (data.empty_slots ?? 0)) * ticket;
  const occupancyRate = data.appointments_done / capacity;
  const noShowRate = data.no_show / scheduled;

  return { estimated, lost, occupancyRate, noShowRate };
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
