// Revenue calculation helpers for DAMA

export const DEFAULT_TICKET = 250; // R$ médio por consulta

export interface RevenueData {
  estimated: number;       // Revenue realized today
  lost: number;            // Revenue lost (no-show + cancellations)
  occupancyRate: number;   // 0–1
  noShowRate: number;      // 0–1
}

export function calculateRevenue(data: {
  appointments_scheduled: number;
  appointments_done: number;
  no_show: number;
  cancellations: number;
  ticket?: number;
}): RevenueData {
  const ticket = data.ticket ?? DEFAULT_TICKET;
  const scheduled = Math.max(data.appointments_scheduled, 1);

  const estimated = data.appointments_done * ticket;
  const lost = (data.no_show + data.cancellations) * ticket;
  const occupancyRate = data.appointments_done / scheduled;
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
