/** Where the projection starts from — today's actual position. */
export type StartingPosition = {
  /** Savings + current accounts: assumed not to grow. */
  cash: number;
  /** Investment accounts: compound at the assumed growth rate. */
  investments: number;
  /** Positive amount owed. Held flat — see ForecastAssumptions. */
  debt: number;
};

export type ForecastAssumptions = {
  monthlyCashContribution: number;
  monthlyInvestmentContribution: number;
  /** e.g. 0.06 for 6% a year. An assumption, never a promise (Section 17). */
  annualGrowthRate: number;
  months: number;
  startDate: Date;
};

export type ForecastPoint = {
  /** 0 is the starting position; 1 is one month out. */
  monthIndex: number;
  date: Date;
  cash: number;
  investments: number;
  debt: number;
  netWorth: number;
  /** Contributions paid in so far, excluding growth. */
  contributed: number;
  /** Investment growth accrued so far. */
  growth: number;
};

export type GoalTrajectory = {
  /** Months until the projection first reaches the target, null if never. */
  monthsToTarget: number | null;
  dateReached: Date | null;
  /** True when the target is already met at month 0. */
  alreadyReached: boolean;
  /**
   * Whether the projection reaches the target before the goal's target date.
   * Null when the goal has no target date.
   */
  onTrack: boolean | null;
  monthsEarlyOrLate: number | null;
};

export const DEFAULT_ANNUAL_GROWTH_RATE = 0.06;
export const DEFAULT_FORECAST_MONTHS = 60;
