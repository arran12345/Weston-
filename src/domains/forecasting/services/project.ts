import type {
  ForecastAssumptions,
  ForecastPoint,
  GoalTrajectory,
  StartingPosition,
} from "@/domains/forecasting/types";

/**
 * Deterministic projection engine (docs/PRD.md Section 12).
 *
 * Transparent arithmetic, not a learned model: every number here can be
 * reproduced by hand, which is the point — "why does it think this" must
 * always be answerable in plain terms for a financial tool.
 *
 * A note on Section 12's formula. It is written as:
 *
 *     Σ (monthly_investment_contribution × months × (1 + rate)^months)
 *
 * which multiplies each contribution by BOTH the number of months and the
 * full-period growth factor, and would overstate the result substantially
 * (at 6% over 5 years it roughly quadruples the contributed amount). The
 * section describes its intent as "compound growth projection", so what is
 * implemented here is the standard version of that: each month, the existing
 * investment balance grows, then the month's contribution is added. A
 * contribution therefore only earns growth for the months it was actually
 * invested.
 *
 * Contributions are applied at the end of each month (an ordinary annuity),
 * which is the conservative reading — money paid in during a month has not
 * been invested for that whole month.
 *
 * Debt is held flat: the strategy is deliberately not to repay 0% debt early
 * (Section 4), so modelling repayment would project a decision that isn't
 * being made.
 */

/**
 * Converts an annual rate to its monthly equivalent geometrically, so twelve
 * compounded months reproduce the annual figure exactly. Dividing by 12
 * would understate growth, since it ignores compounding within the year.
 */
export function monthlyRateFromAnnual(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function projectNetWorth(
  start: StartingPosition,
  assumptions: ForecastAssumptions,
): ForecastPoint[] {
  const monthlyRate = monthlyRateFromAnnual(assumptions.annualGrowthRate);
  const months = Math.max(0, Math.floor(assumptions.months));

  const points: ForecastPoint[] = [];

  let cash = start.cash;
  let investments = start.investments;
  let contributed = 0;
  let growth = 0;

  points.push({
    monthIndex: 0,
    date: addMonths(assumptions.startDate, 0),
    cash,
    investments,
    debt: start.debt,
    netWorth: cash + investments - start.debt,
    contributed: 0,
    growth: 0,
  });

  for (let month = 1; month <= months; month += 1) {
    // Growth first, then the month's contribution — an ordinary annuity.
    const monthGrowth = investments * monthlyRate;
    investments += monthGrowth + assumptions.monthlyInvestmentContribution;
    cash += assumptions.monthlyCashContribution;

    growth += monthGrowth;
    contributed +=
      assumptions.monthlyCashContribution +
      assumptions.monthlyInvestmentContribution;

    points.push({
      monthIndex: month,
      date: addMonths(assumptions.startDate, month),
      cash,
      investments,
      debt: start.debt,
      netWorth: cash + investments - start.debt,
      contributed,
      growth,
    });
  }

  return points;
}

/**
 * The inverse question (Section 12): at what month does the projection first
 * reach the target? Returns null when it doesn't within the horizon — the UI
 * has to say "not within N years" rather than invent a date.
 */
export function findMonthsToTarget(
  points: ForecastPoint[],
  target: number,
): number | null {
  const reached = points.find((point) => point.netWorth >= target);
  return reached ? reached.monthIndex : null;
}

export function buildGoalTrajectory(
  points: ForecastPoint[],
  target: number,
  targetDate: Date | null,
): GoalTrajectory {
  const monthsToTarget = findMonthsToTarget(points, target);
  const reachedPoint =
    monthsToTarget === null
      ? null
      : (points.find((point) => point.monthIndex === monthsToTarget) ?? null);

  const alreadyReached = monthsToTarget === 0;

  if (targetDate === null) {
    return {
      monthsToTarget,
      dateReached: reachedPoint?.date ?? null,
      alreadyReached,
      onTrack: null,
      monthsEarlyOrLate: null,
    };
  }

  // Never reaching the target within the horizon is not "on track", and the
  // margin is unknown rather than zero.
  if (monthsToTarget === null || !reachedPoint) {
    return {
      monthsToTarget: null,
      dateReached: null,
      alreadyReached: false,
      onTrack: false,
      monthsEarlyOrLate: null,
    };
  }

  const monthsUntilTargetDate = monthsBetween(points[0].date, targetDate);
  const monthsEarlyOrLate = monthsUntilTargetDate - monthsToTarget;

  return {
    monthsToTarget,
    dateReached: reachedPoint.date,
    alreadyReached,
    onTrack: monthsEarlyOrLate >= 0,
    monthsEarlyOrLate,
  };
}

/** Whole calendar months between two dates. */
export function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}
