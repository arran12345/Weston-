/**
 * Balances are logged *for a day*, not a moment. Normalising every snapshot's
 * capturedAt to local midnight means two balances logged for the same day
 * collapse to one point on the net worth history rather than drifting apart
 * by the wall-clock time they happened to be entered — and a correction
 * entered later for the same day supersedes the earlier one via createdAt.
 */
export function startOfLocalDay(date: Date): Date {
  const normalised = new Date(date);
  normalised.setHours(0, 0, 0, 0);
  return normalised;
}
