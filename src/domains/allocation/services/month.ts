/**
 * Allocations are keyed by month. Every month value is normalised to local
 * midnight on the first of that month so lookups match regardless of which
 * day within the month the value came from — the same reasoning as
 * docs/decisions/0001 applied at month rather than day granularity.
 */
export function startOfLocalMonth(date: Date): Date {
  const normalised = new Date(date);
  normalised.setDate(1);
  normalised.setHours(0, 0, 0, 0);
  return normalised;
}

export function currentMonth(): Date {
  return startOfLocalMonth(new Date());
}
