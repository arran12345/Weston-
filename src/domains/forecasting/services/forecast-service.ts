import type { PrismaClient } from "@/generated/prisma/client";
import { AccountType } from "@/domains/accounts/types";
import { listAccounts } from "@/domains/accounts/services/account-service";
import { getStrategy } from "@/domains/allocation/services/allocation-service";
import { getGoal } from "@/domains/goals/services/goal-service";
import {
  buildGoalTrajectory,
  projectNetWorth,
} from "@/domains/forecasting/services/project";
import { summariseScenarios } from "@/domains/forecasting/services/compare";
import {
  DEFAULT_ANNUAL_GROWTH_RATE,
  DEFAULT_FORECAST_MONTHS,
  type StartingPosition,
} from "@/domains/forecasting/types";

type AccountLike = {
  type: AccountType;
  latestBalance: number | null;
};

/**
 * Splits accounts into the three buckets the engine models. Investments grow;
 * cash doesn't; debt is held flat. Accounts with no logged balance contribute
 * nothing, consistent with the net worth series.
 */
export function toStartingPosition(accounts: AccountLike[]): StartingPosition {
  return accounts.reduce<StartingPosition>(
    (position, account) => {
      const balance = account.latestBalance ?? 0;

      if (account.type === AccountType.DEBT) {
        return { ...position, debt: position.debt + balance };
      }
      if (account.type === AccountType.INVESTMENT) {
        return { ...position, investments: position.investments + balance };
      }
      return { ...position, cash: position.cash + balance };
    },
    { cash: 0, investments: 0, debt: 0 },
  );
}

export type ForecastOptions = {
  months?: number;
  annualGrowthRate?: number;
  /** Overrides the standing strategy — the basis for scenarios later. */
  monthlyCashContribution?: number;
  monthlyInvestmentContribution?: number;
};

export async function getNetWorthForecast(
  prisma: PrismaClient,
  userId: string,
  options: ForecastOptions = {},
) {
  const [accounts, strategy] = await Promise.all([
    listAccounts(prisma, userId),
    getStrategy(prisma, userId),
  ]);

  const assumptions = {
    monthlyCashContribution:
      options.monthlyCashContribution ?? strategy.savingsAmount,
    monthlyInvestmentContribution:
      options.monthlyInvestmentContribution ?? strategy.investmentAmount,
    annualGrowthRate: options.annualGrowthRate ?? DEFAULT_ANNUAL_GROWTH_RATE,
    months: options.months ?? DEFAULT_FORECAST_MONTHS,
    startDate: new Date(),
  };

  const start = toStartingPosition(accounts);

  return {
    start,
    assumptions,
    hasData: accounts.some((account) => account.latestBalance !== null),
    points: projectNetWorth(start, assumptions),
  };
}

export type ScenarioInput = {
  id: string;
  label: string;
  monthlyCashContribution?: number;
  monthlyInvestmentContribution?: number;
  annualGrowthRate?: number;
};

/**
 * Runs the same engine once per scenario against the same starting position
 * (Section 12) — the "what if" feature is a parameterisation, not a second
 * implementation.
 */
export async function compareScenarios(
  prisma: PrismaClient,
  userId: string,
  scenarios: ScenarioInput[],
  months: number = DEFAULT_FORECAST_MONTHS,
) {
  const [accounts, strategy] = await Promise.all([
    listAccounts(prisma, userId),
    getStrategy(prisma, userId),
  ]);

  const start = toStartingPosition(accounts);
  // One start date for all runs, so the series line up month for month.
  const startDate = new Date();

  const runs = scenarios.map((scenario) => {
    const assumptions = {
      monthlyCashContribution:
        scenario.monthlyCashContribution ?? strategy.savingsAmount,
      monthlyInvestmentContribution:
        scenario.monthlyInvestmentContribution ?? strategy.investmentAmount,
      annualGrowthRate:
        scenario.annualGrowthRate ?? DEFAULT_ANNUAL_GROWTH_RATE,
      months,
      startDate,
    };

    return {
      id: scenario.id,
      label: scenario.label,
      ...assumptions,
      points: projectNetWorth(start, assumptions),
    };
  });

  return {
    start,
    months,
    hasData: accounts.some((account) => account.latestBalance !== null),
    scenarios: summariseScenarios(runs),
  };
}

/**
 * A goal's trajectory projects only the accounts linked to it, so it answers
 * "when does *this* pot reach the target" rather than "when does total net
 * worth" — consistent with how Milestone 4 measures progress.
 *
 * Contributions only count for account types the goal actually links: a goal
 * tracking savings alone shouldn't be credited with investment contributions
 * going somewhere else.
 */
export async function getGoalForecast(
  prisma: PrismaClient,
  userId: string,
  goalId: string,
  options: ForecastOptions = {},
) {
  const [goal, accounts, strategy] = await Promise.all([
    getGoal(prisma, userId, goalId),
    listAccounts(prisma, userId),
    getStrategy(prisma, userId),
  ]);

  const linked = accounts.filter((account) =>
    goal.linkedAccountIds.includes(account.id),
  );
  const start = toStartingPosition(linked);

  const linksInvestment = linked.some(
    (account) => account.type === AccountType.INVESTMENT,
  );
  const linksCash = linked.some(
    (account) =>
      account.type === AccountType.SAVINGS ||
      account.type === AccountType.CURRENT,
  );

  const assumptions = {
    monthlyCashContribution: linksCash
      ? (options.monthlyCashContribution ?? strategy.savingsAmount)
      : 0,
    monthlyInvestmentContribution: linksInvestment
      ? (options.monthlyInvestmentContribution ?? strategy.investmentAmount)
      : 0,
    annualGrowthRate: options.annualGrowthRate ?? DEFAULT_ANNUAL_GROWTH_RATE,
    months: options.months ?? DEFAULT_FORECAST_MONTHS,
    startDate: new Date(),
  };

  const points = projectNetWorth(start, assumptions);

  return {
    goal,
    assumptions,
    points,
    linksCash,
    linksInvestment,
    trajectory: buildGoalTrajectory(
      points,
      goal.targetAmount,
      goal.targetDate,
    ),
  };
}
