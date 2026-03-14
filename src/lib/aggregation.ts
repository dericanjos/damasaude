/**
 * Aggregation helpers for multi-location consolidated views.
 * Uses per-location ticket_avg for revenue calculations.
 */

import type { LocationFinancial } from '@/hooks/useLocations';

const DEFAULT_TICKET = 250;

export interface AggregatedMetrics {
  totalRevenueEstimated: number;
  totalRevenueLost: number;
  totalAttended: number;
  totalNoshows: number;
  totalCancellations: number;
  totalEmptySlots: number;
  totalScheduled: number;
  totalCapacity: number;
  occupancyRate: number;
  noShowRate: number;
  /** location_id → revenue lost, for "biggest leaker" */
  lostByLocation: Record<string, number>;
}

/**
 * Aggregate checkins using per-location ticket_avg.
 * @param checkins array of DB checkin rows (must have location_id)
 * @param financials array of LocationFinancial (ticket_avg per location)
 * @param getCapacity fn that returns capacity for a given checkin (date-aware)
 */
export function aggregateCheckins(
  checkins: any[],
  financials: LocationFinancial[],
  getCapacity: (checkin: any) => number,
): AggregatedMetrics {
  const ticketMap = new Map<string, number>();
  for (const f of financials) {
    ticketMap.set(f.location_id, f.ticket_avg);
  }

  let totalRevenueEstimated = 0;
  let totalRevenueLost = 0;
  let totalAttended = 0;
  let totalNoshows = 0;
  let totalCancellations = 0;
  let totalEmptySlots = 0;
  let totalScheduled = 0;
  let totalCapacity = 0;
  const lostByLocation: Record<string, number> = {};

  for (const c of checkins) {
    const ticket = ticketMap.get(c.location_id) ?? DEFAULT_TICKET;
    const attendedPriv = c.attended_private ?? c.appointments_done ?? 0;
    const attendedIns = c.attended_insurance ?? 0;
    const noshowPriv = c.noshows_private ?? c.no_show ?? 0;
    const noshowIns = c.noshows_insurance ?? 0;
    const attended = attendedPriv + attendedIns;
    const noshows = noshowPriv + noshowIns;
    const cancellations = c.cancellations ?? 0;
    const emptySlots = c.empty_slots ?? 0;
    const cap = Math.max(getCapacity(c), 0); // never negative

    const estimated = attended * ticket;
    const lost = (noshows + cancellations + emptySlots) * ticket;

    totalRevenueEstimated += estimated;
    totalRevenueLost += lost;
    totalAttended += attended;
    totalNoshows += noshows;
    totalCancellations += cancellations;
    totalEmptySlots += emptySlots;
    totalScheduled += c.appointments_scheduled ?? 0;
    totalCapacity += cap;

    const locId = c.location_id || 'unknown';
    lostByLocation[locId] = (lostByLocation[locId] ?? 0) + lost;
  }

  const scheduled = Math.max(totalScheduled, 1);

  return {
    totalRevenueEstimated,
    totalRevenueLost,
    totalAttended,
    totalNoshows,
    totalCancellations,
    totalEmptySlots,
    totalScheduled,
    totalCapacity,
    // CRITICAL: guard against totalCapacity=0 → show 0 instead of Infinity
    occupancyRate: totalCapacity > 0 ? totalAttended / totalCapacity : 0,
    noShowRate: totalNoshows / scheduled,
    lostByLocation,
  };
}

/** Find the location with the highest revenue lost */
export function getWorstLeaker(
  lostByLocation: Record<string, number>,
  locationNames: Record<string, string>,
): { locationId: string; name: string; lost: number } | null {
  let maxId = '';
  let maxLost = 0;
  for (const [id, lost] of Object.entries(lostByLocation)) {
    if (lost > maxLost) {
      maxLost = lost;
      maxId = id;
    }
  }
  if (!maxId || maxLost <= 0) return null;
  return { locationId: maxId, name: locationNames[maxId] || 'Local', lost: maxLost };
}
