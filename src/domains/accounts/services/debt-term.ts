import { startOfLocalDay } from "@/domains/accounts/services/captured-at";

/**
 * Section 4: we track a debt's term end so you get warned before it stops
 * being 0% — deliberately not a repayment planner. Section 18's example
 * ("your 0% debt term ends in 60 days") sets the warning window.
 */
export const TERM_WARNING_DAYS = 60;

export type DebtTermStatus = "NONE" | "ACTIVE" | "ENDING_SOON" | "ENDED";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(date: Date, now = new Date()): number {
  return Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) /
      MS_PER_DAY,
  );
}

export function debtTermStatus(
  termEndDate: Date | null,
  now = new Date(),
): { status: DebtTermStatus; daysRemaining: number | null } {
  if (!termEndDate) return { status: "NONE", daysRemaining: null };

  const daysRemaining = daysUntil(termEndDate, now);

  if (daysRemaining < 0) return { status: "ENDED", daysRemaining };
  if (daysRemaining <= TERM_WARNING_DAYS) {
    return { status: "ENDING_SOON", daysRemaining };
  }

  return { status: "ACTIVE", daysRemaining };
}
