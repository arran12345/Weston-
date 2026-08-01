import { describe, expect, it } from "vitest";

import {
  buildGoalTrajectory,
  findMonthsToTarget,
  monthlyRateFromAnnual,
  monthsBetween,
  projectNetWorth,
} from "@/domains/forecasting/services/project";
import type {
  ForecastAssumptions,
  StartingPosition,
} from "@/domains/forecasting/types";

const startDate = new Date("2026-07-01T00:00:00");

const position = (
  overrides: Partial<StartingPosition> = {},
): StartingPosition => ({
  cash: 0,
  investments: 0,
  debt: 0,
  ...overrides,
});

const assume = (
  overrides: Partial<ForecastAssumptions> = {},
): ForecastAssumptions => ({
  monthlyCashContribution: 0,
  monthlyInvestmentContribution: 0,
  annualGrowthRate: 0,
  months: 12,
  startDate,
  ...overrides,
});

describe("monthlyRateFromAnnual", () => {
  it("compounds back to the annual rate over twelve months", () => {
    const monthly = monthlyRateFromAnnual(0.06);

    expect(Math.pow(1 + monthly, 12) - 1).toBeCloseTo(0.06, 10);
  });

  it("is zero for no growth", () => {
    expect(monthlyRateFromAnnual(0)).toBe(0);
  });

  it("is below the naive annual/12, because compounding is accounted for", () => {
    expect(monthlyRateFromAnnual(0.06)).toBeLessThan(0.06 / 12);
  });
});

describe("projectNetWorth", () => {
  it("starts at today's actual position", () => {
    const points = projectNetWorth(
      position({ cash: 5000, investments: 3000, debt: 1000 }),
      assume(),
    );

    expect(points[0]).toMatchObject({
      monthIndex: 0,
      cash: 5000,
      investments: 3000,
      debt: 1000,
      netWorth: 7000,
      contributed: 0,
      growth: 0,
    });
  });

  it("returns one point per month plus the starting point", () => {
    expect(projectNetWorth(position(), assume({ months: 12 }))).toHaveLength(13);
  });

  it("returns only the starting point for a zero-month horizon", () => {
    expect(projectNetWorth(position(), assume({ months: 0 }))).toHaveLength(1);
  });

  it("adds cash contributions linearly, with no growth applied", () => {
    const points = projectNetWorth(
      position({ cash: 1000 }),
      assume({ monthlyCashContribution: 700, months: 12 }),
    );

    expect(points[12].cash).toBe(1000 + 700 * 12);
    expect(points[12].growth).toBe(0);
  });

  it("holds debt flat, since 0% debt is deliberately not repaid early", () => {
    const points = projectNetWorth(
      position({ debt: 3200 }),
      assume({ monthlyCashContribution: 700, months: 24 }),
    );

    expect(points.every((point) => point.debt === 3200)).toBe(true);
  });

  describe("investment growth", () => {
    it("compounds an existing balance to the annual rate after a year", () => {
      const points = projectNetWorth(
        position({ investments: 10000 }),
        assume({ annualGrowthRate: 0.06, months: 12 }),
      );

      expect(points[12].investments).toBeCloseTo(10600, 6);
    });

    it("does not grow contributions that have not been invested yet", () => {
      // With an end-of-month contribution, month 1 has earned nothing.
      const points = projectNetWorth(
        position(),
        assume({
          monthlyInvestmentContribution: 300,
          annualGrowthRate: 0.06,
          months: 1,
        }),
      );

      expect(points[1].investments).toBe(300);
      expect(points[1].growth).toBe(0);
    });

    it("matches a hand-computed annuity over three months", () => {
      const rate = monthlyRateFromAnnual(0.06);
      // Contributions at the end of months 1, 2, 3 earn 2, 1 and 0 months.
      const expected =
        300 * Math.pow(1 + rate, 2) + 300 * (1 + rate) + 300;

      const points = projectNetWorth(
        position(),
        assume({
          monthlyInvestmentContribution: 300,
          annualGrowthRate: 0.06,
          months: 3,
        }),
      );

      expect(points[3].investments).toBeCloseTo(expected, 6);
    });

    it("keeps growth strictly below the naive formula in Section 12", () => {
      // Σ(c × months × (1+r)^months) would multiply by both, overstating.
      const months = 60;
      const contribution = 300;
      const naive =
        contribution * months * Math.pow(1 + 0.06, months / 12);

      const points = projectNetWorth(
        position(),
        assume({
          monthlyInvestmentContribution: contribution,
          annualGrowthRate: 0.06,
          months,
        }),
      );

      expect(points[months].investments).toBeLessThan(naive);
      // Sanity: still more than the contributions alone.
      expect(points[months].investments).toBeGreaterThan(contribution * months);
    });

    it("tracks contributed and growth separately so the split is explainable", () => {
      const points = projectNetWorth(
        position({ investments: 1000 }),
        assume({
          monthlyCashContribution: 700,
          monthlyInvestmentContribution: 300,
          annualGrowthRate: 0.06,
          months: 12,
        }),
      );
      const final = points[12];

      expect(final.contributed).toBe(12000);
      expect(final.cash + final.investments).toBeCloseTo(
        1000 + final.contributed + final.growth,
        6,
      );
    });
  });

  describe("dates", () => {
    it("advances one month per step", () => {
      const points = projectNetWorth(position(), assume({ months: 3 }));

      expect(points.map((point) => point.date.getMonth())).toEqual([6, 7, 8, 9]);
    });

    it("rolls over the year boundary", () => {
      const points = projectNetWorth(
        position(),
        assume({ months: 6, startDate: new Date("2026-10-15T00:00:00") }),
      );

      expect(points[6].date.getFullYear()).toBe(2027);
      expect(points[6].date.getMonth()).toBe(3); // April
    });
  });
});

describe("findMonthsToTarget", () => {
  const points = projectNetWorth(
    position({ cash: 1000 }),
    assume({ monthlyCashContribution: 1000, months: 12 }),
  );

  it("finds the first month the target is reached", () => {
    expect(findMonthsToTarget(points, 5000)).toBe(4);
  });

  it("returns 0 when the target is already met", () => {
    expect(findMonthsToTarget(points, 500)).toBe(0);
  });

  it("returns null rather than guessing beyond the horizon", () => {
    expect(findMonthsToTarget(points, 999999)).toBeNull();
  });
});

describe("buildGoalTrajectory", () => {
  const points = projectNetWorth(
    position({ cash: 1000 }),
    assume({ monthlyCashContribution: 1000, months: 24 }),
  );

  it("reports on track when the target is reached before its date", () => {
    const trajectory = buildGoalTrajectory(
      points,
      5000,
      new Date("2027-01-01T00:00:00"),
    );

    expect(trajectory.monthsToTarget).toBe(4);
    expect(trajectory.onTrack).toBe(true);
    expect(trajectory.monthsEarlyOrLate).toBe(2);
  });

  it("reports off track when the target is reached after its date", () => {
    const trajectory = buildGoalTrajectory(
      points,
      15000,
      new Date("2026-10-01T00:00:00"),
    );

    expect(trajectory.monthsToTarget).toBe(14);
    expect(trajectory.onTrack).toBe(false);
    expect(trajectory.monthsEarlyOrLate).toBe(-11);
  });

  it("has no verdict when the goal has no target date", () => {
    const trajectory = buildGoalTrajectory(points, 5000, null);

    expect(trajectory.onTrack).toBeNull();
    expect(trajectory.dateReached).not.toBeNull();
  });

  it("is not on track when the target is never reached in the horizon", () => {
    const trajectory = buildGoalTrajectory(
      points,
      999999,
      new Date("2027-01-01T00:00:00"),
    );

    expect(trajectory.monthsToTarget).toBeNull();
    expect(trajectory.dateReached).toBeNull();
    expect(trajectory.onTrack).toBe(false);
    expect(trajectory.monthsEarlyOrLate).toBeNull();
  });

  it("flags a target already met today", () => {
    const trajectory = buildGoalTrajectory(points, 500, null);

    expect(trajectory.alreadyReached).toBe(true);
  });
});

describe("monthsBetween", () => {
  it("counts whole calendar months forward", () => {
    expect(
      monthsBetween(new Date("2026-07-01"), new Date("2027-07-01")),
    ).toBe(12);
  });

  it("is negative for dates in the past", () => {
    expect(
      monthsBetween(new Date("2026-07-01"), new Date("2026-04-01")),
    ).toBe(-3);
  });
});
