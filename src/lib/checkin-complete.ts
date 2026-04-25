/**
 * Determines whether a check-in is "complete" — meaning the doctor
 * confirmed the day's losses (no-shows, cancellations, etc.) at end of day.
 *
 * Without a dedicated database flag, we use heuristics:
 * 1. updated_at significantly after created_at (>60s) → doctor came back to update
 * 2. Any losses/notes/followup field has non-default value → doctor touched "not-done" section
 *
 * Both signals are valid — we OR them together.
 */
export function isCheckinComplete(checkin: any | null | undefined): boolean {
  if (!checkin) return false;

  // Signal 1: Updated significantly after creation (>60 seconds)
  const created = new Date(checkin.created_at).getTime();
  const updated = new Date(checkin.updated_at).getTime();
  if (updated - created > 60_000) return true;

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

  return hasLosses || hasEmptySlots || hasFollowup || hasNotes;
}

/**
 * For consolidated mode (multiple locations): a day is complete if
 * AT LEAST ONE check-in among all of them is complete. This is a soft criterion
 * to avoid blocking insights when the doctor uses multiple locations.
 */
export function areAllCheckinsComplete(checkins: any[]): boolean {
  if (!checkins || checkins.length === 0) return false;
  return checkins.every(c => isCheckinComplete(c));
}

export function isAnyCheckinComplete(checkins: any[]): boolean {
  if (!checkins || checkins.length === 0) return false;
  return checkins.some(c => isCheckinComplete(c));
}
