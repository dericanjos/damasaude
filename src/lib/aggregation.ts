/**
 * Aggregation helpers for multi-location consolidated views.
 * Uses per-location ticket_private/ticket_insurance for revenue calculations.
 * Falls back to ticket_avg when split tickets are not available.
 */

import type { LocationFinancial } from '@/hooks/useLocations';

const DEFAULT_TICKET_PRIVATE = 250;
const DEFAULT_TICKET_INSURANCE = 100;
const DEFAULT_TICKET_AVG = 250;

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
  /** location_id → revenue estimated */
  revenueByLocation: Record<string, number>;
  /** location_id → occupancy rate */
  occupancyByLocation: Record<string, number>;
  /** location_id → attended count */
  attendedByLocation: Record<string, number>;
  /** location_id → capacity */
  capacityByLocation: Record<string, number>;
}

interface TicketSet {
  ticketPriv: number;
  ticketIns: number;
  ticketAvg: number;
}

/**
 * Aggregate checkins using per-location ticket_private/ticket_insurance.
 * @param checkins array of DB checkin rows (must have location_id)
 * @param financials array of LocationFinancial (ticket data per location)
 * @param getCapacity fn that returns capacity for a given checkin (date-aware)
 */
export function aggregateCheckins(
  checkins: any[],
  financials: LocationFinancial[],
  getCapacity: (checkin: any) => number,
): AggregatedMetrics {
  // Build ticket maps per location
  const ticketMap = new Map<string, TicketSet>();
  for (const f of financials) {
    ticketMap.set(f.location_id, {
      ticketPriv: (f as any).ticket_private ?? DEFAULT_TICKET_PRIVATE,
      ticketIns: (f as any).ticket_insurance ?? DEFAULT_TICKET_INSURANCE,
      ticketAvg: f.ticket_avg ?? DEFAULT_TICKET_AVG,
    });
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
  const revenueByLocation: Record<string, number> = {};
  const occupancyByLocation: Record<string, number> = {};
  const attendedByLocation: Record<string, number> = {};
  const capacityByLocation: Record<string, number> = {};

  for (const c of checkins) {
    const locId = c.location_id || 'unknown';
    const tickets = ticketMap.get(locId) ?? {
      ticketPriv: DEFAULT_TICKET_PRIVATE,
      ticketIns: DEFAULT_TICKET_INSURANCE,
      ticketAvg: DEFAULT_TICKET_AVG,
    };

    const attendedPriv = c.attended_private ?? c.appointments_done ?? 0;
    const attendedIns = c.attended_insurance ?? 0;
    const noshowPriv = c.noshows_private ?? c.no_show ?? 0;
    const noshowIns = c.noshows_insurance ?? 0;
    const cancellations = c.cancellations ?? 0;
    const emptySlots = c.empty_slots ?? 0;
    const attended = attendedPriv + attendedIns;
    const noshows = noshowPriv + noshowIns;
    const cap = Math.max(getCapacity(c), 0);

    // Revenue uses split tickets (same formula as single-location view)
    const estimated = (attendedPriv * tickets.ticketPriv) + (attendedIns * tickets.ticketIns);
    const lostNoshow = (noshowPriv * tickets.ticketPriv) + (noshowIns * tickets.ticketIns);
    // Cancellations and empty slots use ticket_avg (no split available yet)
    const lostGeneric = (cancellations + emptySlots) * tickets.ticketAvg;
    const lost = lostNoshow + lostGeneric;

    totalRevenueEstimated += estimated;
    totalRevenueLost += lost;
    totalAttended += attended;
    totalNoshows += noshows;
    totalCancellations += cancellations;
    totalEmptySlots += emptySlots;
    totalScheduled += c.appointments_scheduled ?? 0;
    totalCapacity += cap;

    lostByLocation[locId] = (lostByLocation[locId] ?? 0) + lost;
    revenueByLocation[locId] = (revenueByLocation[locId] ?? 0) + estimated;
    attendedByLocation[locId] = (attendedByLocation[locId] ?? 0) + attended;
    capacityByLocation[locId] = (capacityByLocation[locId] ?? 0) + cap;
  }

  // Compute per-location occupancy
  for (const locId of Object.keys(capacityByLocation)) {
    const cap = capacityByLocation[locId];
    const att = attendedByLocation[locId] ?? 0;
    occupancyByLocation[locId] = cap > 0 ? att / cap : 0;
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
    occupancyRate: totalCapacity > 0 ? totalAttended / totalCapacity : 0,
    noShowRate: totalNoshows / scheduled,
    lostByLocation,
    revenueByLocation,
    occupancyByLocation,
    attendedByLocation,
    capacityByLocation,
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

/** Find the most efficient location (highest occupancy or lowest loss) */
export function getMostEfficient(
  occupancyByLocation: Record<string, number>,
  locationNames: Record<string, string>,
): { locationId: string; name: string; occupancy: number } | null {
  let bestId = '';
  let bestOcc = -1;
  for (const [id, occ] of Object.entries(occupancyByLocation)) {
    if (occ > bestOcc) {
      bestOcc = occ;
      bestId = id;
    }
  }
  if (!bestId || bestOcc <= 0) return null;
  return { locationId: bestId, name: locationNames[bestId] || 'Local', occupancy: bestOcc };
}
