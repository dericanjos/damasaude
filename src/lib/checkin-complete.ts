/**
 * Determines whether a check-in is "complete" — meaning the doctor
 * confirmed the day's losses (no-shows, cancellations, etc.) at end of day.
 *
 * Without a dedicated database flag, we use heuristics:
 * 1. Significant time gap between created_at and updated_at (>60s) → 
 *    doctor came back to update later
 * 2. Any "end of day" field has been explicitly set (losses, notes, followup)
 * 3. updated_at is strictly different from created_at AND there are 
 *    appointments_done > 0 → doctor saved at least twice (typical flow:
 *    morning save then evening save), even if the second save was a 
 *    "perfect day" with zero losses
 *
 * Any of the three signals being true marks the check-in as complete.
 */
export function isCheckinComplete(checkin: any | null | undefined): boolean {
  if (!checkin) return false;

  // Signal 1: Updated significantly after creation (>60 seconds)
  const created = new Date(checkin.created_at).getTime();
  const updated = new Date(checkin.updated_at).getTime();
  const timeDelta = updated - created;
  if (timeDelta > 60_000) return true;

  // Signal 2: Any "end of day" field has been set
  const hasLosses =
    (checkin.noshows_private ?? 0) > 0 ||
    (checkin.noshows_insurance ?? 0) > 0 ||
    (checkin.cancellations_private ?? 0) > 0 ||
    (checkin.cancellations_insurance ?? 0) > 0 ||
    (checkin.no_show ?? 0) > 0 ||
    (checkin.cancellations ?? 0) > 0;

  const hasEmptySlots = (checkin.empty_slots ?? 0) > 0;
  const hasFollowup = checkin.followup_done === true;
  const hasNotes = checkin.notes !== null && checkin.notes !== undefined && checkin.notes !== '';

  if (hasLosses || hasEmptySlots || hasFollowup || hasNotes) return true;

  // Signal 3: "Perfect day" — doctor saved twice (morning + evening confirmation),
  // even if the evening save had all zeros. We detect this by:
  // - updated_at being strictly after created_at (timeDelta > 0)
  // - having appointments_done > 0 (so we know the day actually happened)
  const appointmentsDone = (checkin.appointments_done ?? 0) +
    (checkin.attended_private ?? 0) + (checkin.attended_insurance ?? 0);

  if (timeDelta > 1_000 && appointmentsDone > 0) return true;

  return false;
}

/**
 * For consolidated mode (multiple locations): a day is complete if
 * AT LEAST ONE check-in among all of them is complete.
 */
export function areAllCheckinsComplete(checkins: any[]): boolean {
  if (!checkins || checkins.length === 0) return false;
  return checkins.every(c => isCheckinComplete(c));
}

export function isAnyCheckinComplete(checkins: any[]): boolean {
  if (!checkins || checkins.length === 0) return false;
  return checkins.some(c => isCheckinComplete(c));
}
