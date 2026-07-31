import type { GoalProgress, LinkedAccountBalance } from "@/domains/goals/types";

/**
 * Goal progress is derived the same way net worth is (Section 8): from the
 * linked accounts' latest balances, never from a stored running total.
 *
 * Pure function so it can be verified directly and reused by the goals list,
 * the goal detail screen, and the dashboard card. Milestone 5 will add
 * *trajectory* on top of this — projecting forward with a growth assumption
 * is a separate concern and deliberately not done here.
 */

export function calculateGoalProgress(
  targetAmount: number,
  targetDate: Date | null,
  linkedBalances: LinkedAccountBalance[],
  now = new Date(),
): GoalProgress {
  // Debt subtracts, matching the net worth sign convention (decisions/0001).
  const currentAmount = linkedBalances.reduce(
    (sum, account) => sum + (account.isDebt ? -account.balance : account.balance),
    0,
  );

  const remaining = Math.max(targetAmount - currentAmount, 0);

  // A zero or negative target can't be divided into — treat it as met so the
  // UI shows a complete goal rather than NaN or Infinity.
  const percentComplete =
    targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 100;

  const isComplete = currentAmount >= targetAmount;

  const monthsRemaining =
    targetDate === null ? null : wholeMonthsBetween(now, targetDate);

  const isOverdue =
    targetDate !== null && !isComplete && monthsRemaining !== null
      ? monthsRemaining < 0
      : false;

  // Only meaningful with time left and something still to save.
  const requiredPerMonth =
    monthsRemaining !== null && monthsRemaining > 0 && remaining > 0
      ? remaining / monthsRemaining
      : null;

  return {
    currentAmount,
    targetAmount,
    remaining,
    percentComplete,
    isComplete,
    targetDate,
    monthsRemaining,
    requiredPerMonth,
    isOverdue,
  };
}

/**
 * Whole months between two dates, counting a partial month as still
 * available — being on the 20th with a target on the 31st leaves one month,
 * not zero, which would otherwise make the required contribution infinite.
 */
export function wholeMonthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());

  // Same calendar month: a target later this month still counts as one.
  if (months === 0) {
    return to.getDate() >= from.getDate() ? 1 : 0;
  }

  if (months > 0) {
    return to.getDate() >= from.getDate() ? months + 1 : months;
  }

  return months;
}

/** Clamped to 0–100 for rendering a progress bar's width. */
export function progressBarPercent(progress: GoalProgress): number {
  return Math.min(Math.max(progress.percentComplete, 0), 100);
}
