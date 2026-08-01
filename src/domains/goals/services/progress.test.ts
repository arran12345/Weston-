import { describe, expect, it } from "vitest";

import {
  calculateGoalProgress,
  progressBarPercent,
  wholeMonthsBetween,
} from "@/domains/goals/services/progress";

const now = new Date("2026-07-31T10:00:00");
const on = (iso: string) => new Date(`${iso}T00:00:00`);

const account = (balance: number, isDebt = false) => ({
  accountId: `acct-${balance}-${isDebt}`,
  balance,
  isDebt,
});

describe("calculateGoalProgress", () => {
  it("sums the linked account balances", () => {
    const progress = calculateGoalProgress(
      20000,
      null,
      [account(12000), account(3000)],
      now,
    );

    expect(progress.currentAmount).toBe(15000);
    expect(progress.remaining).toBe(5000);
    expect(progress.percentComplete).toBe(75);
    expect(progress.isComplete).toBe(false);
  });

  it("subtracts debt, matching the net worth convention", () => {
    const progress = calculateGoalProgress(
      20000,
      null,
      [account(12000), account(2000, true)],
      now,
    );

    expect(progress.currentAmount).toBe(10000);
  });

  it("counts nothing when no accounts are linked", () => {
    const progress = calculateGoalProgress(5000, null, [], now);

    expect(progress.currentAmount).toBe(0);
    expect(progressBarPercent(progress)).toBe(0);
  });

  describe("edges that could produce NaN or Infinity", () => {
    it("treats a zero target as met rather than dividing by zero", () => {
      const progress = calculateGoalProgress(0, null, [account(100)], now);

      expect(progress.percentComplete).toBe(100);
      expect(progress.isComplete).toBe(true);
      expect(Number.isFinite(progress.percentComplete)).toBe(true);
    });

    it("reports a negative position without breaking the bar", () => {
      const progress = calculateGoalProgress(
        10000,
        null,
        [account(500), account(3000, true)],
        now,
      );

      expect(progress.currentAmount).toBe(-2500);
      expect(progress.percentComplete).toBe(-25);
      expect(progressBarPercent(progress)).toBe(0);
    });
  });

  describe("overshooting the target", () => {
    it("keeps the real percentage above 100", () => {
      const progress = calculateGoalProgress(10000, null, [account(12500)], now);

      expect(progress.percentComplete).toBe(125);
      expect(progress.isComplete).toBe(true);
    });

    it("floors remaining at zero and clamps the bar at 100", () => {
      const progress = calculateGoalProgress(10000, null, [account(12500)], now);

      expect(progress.remaining).toBe(0);
      expect(progressBarPercent(progress)).toBe(100);
    });
  });

  describe("required contribution", () => {
    it("spreads the shortfall over the months left", () => {
      const progress = calculateGoalProgress(
        20000,
        on("2027-07-31"),
        [account(8000)],
        now,
      );

      expect(progress.monthsRemaining).toBe(13);
      expect(progress.requiredPerMonth).toBeCloseTo(12000 / 13, 6);
    });

    it("is absent without a target date", () => {
      const progress = calculateGoalProgress(20000, null, [account(8000)], now);

      expect(progress.monthsRemaining).toBeNull();
      expect(progress.requiredPerMonth).toBeNull();
    });

    it("is absent once the goal is already met", () => {
      const progress = calculateGoalProgress(
        5000,
        on("2027-01-31"),
        [account(6000)],
        now,
      );

      expect(progress.requiredPerMonth).toBeNull();
    });

    it("is absent once the date has passed, rather than dividing by a negative", () => {
      const progress = calculateGoalProgress(
        20000,
        on("2026-05-31"),
        [account(8000)],
        now,
      );

      expect(progress.requiredPerMonth).toBeNull();
    });
  });

  describe("overdue", () => {
    it("flags an unmet goal past its date", () => {
      const progress = calculateGoalProgress(
        20000,
        on("2026-05-31"),
        [account(8000)],
        now,
      );

      expect(progress.isOverdue).toBe(true);
    });

    it("does not flag a goal that was met, even past its date", () => {
      const progress = calculateGoalProgress(
        5000,
        on("2026-05-31"),
        [account(8000)],
        now,
      );

      expect(progress.isOverdue).toBe(false);
    });

    it("does not flag a goal with no date at all", () => {
      const progress = calculateGoalProgress(20000, null, [account(1)], now);

      expect(progress.isOverdue).toBe(false);
    });
  });
});

describe("wholeMonthsBetween", () => {
  it("counts the rest of the current month as one", () => {
    expect(wholeMonthsBetween(now, on("2026-07-31"))).toBe(1);
  });

  it("is zero once the day has passed this month", () => {
    expect(wholeMonthsBetween(now, on("2026-07-15"))).toBe(0);
  });

  it("counts a full month ahead", () => {
    expect(wholeMonthsBetween(now, on("2026-08-31"))).toBe(2);
    expect(wholeMonthsBetween(now, on("2026-08-15"))).toBe(1);
  });

  it("is negative for dates in the past", () => {
    expect(wholeMonthsBetween(now, on("2026-05-31"))).toBe(-2);
  });
});
