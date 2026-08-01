import { describe, expect, it } from "vitest";

import { AccountType } from "@/domains/accounts/types";
import type { SnapshotInput } from "@/domains/net-worth/types";
import {
  buildNetWorthHistory,
  summariseNetWorth,
} from "@/domains/net-worth/services/calculate";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

function snapshot(
  accountId: string,
  accountType: AccountType,
  balance: number,
  captured: string,
  created = captured,
): SnapshotInput {
  return {
    accountId,
    accountType,
    balance,
    capturedAt: d(captured),
    createdAt: d(created),
  };
}

const savings = (id: string, balance: number, at: string, created?: string) =>
  snapshot(id, AccountType.SAVINGS, balance, at, created);

describe("buildNetWorthHistory", () => {
  it("returns nothing when there are no snapshots", () => {
    expect(buildNetWorthHistory([])).toEqual([]);
  });

  it("emits a point per logged balance", () => {
    const history = buildNetWorthHistory([
      savings("a", 1000, "2026-01-31"),
      savings("a", 1700, "2026-02-28"),
    ]);

    expect(history.map((point) => point.netWorth)).toEqual([1000, 1700]);
  });

  it("subtracts debt from assets", () => {
    const history = buildNetWorthHistory([
      savings("a", 5000, "2026-01-31"),
      snapshot("d", AccountType.DEBT, 2000, "2026-01-31"),
    ]);

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      assets: 5000,
      debts: 2000,
      netWorth: 3000,
    });
  });

  it("collapses snapshots sharing a timestamp into one point", () => {
    const history = buildNetWorthHistory([
      savings("a", 5000, "2026-01-31"),
      savings("b", 1000, "2026-01-31"),
    ]);

    expect(history).toHaveLength(1);
    expect(history[0].netWorth).toBe(6000);
  });

  it("carries each account's last known balance forward", () => {
    // "b" has no snapshot in January, so January must not include it — and
    // "a" must keep contributing in February when only "b" was logged.
    const history = buildNetWorthHistory([
      savings("a", 1000, "2026-01-31"),
      snapshot("b", AccountType.INVESTMENT, 500, "2026-02-28"),
      savings("a", 1200, "2026-03-31"),
    ]);

    expect(history.map((point) => point.netWorth)).toEqual([1000, 1500, 1700]);
  });

  it("lets a correction entered later supersede the same day's value", () => {
    const history = buildNetWorthHistory([
      savings("a", 999, "2026-01-31", "2026-01-31"),
      savings("a", 1000, "2026-01-31", "2026-02-01"),
    ]);

    expect(history.map((point) => point.netWorth)).toEqual([1000]);
  });

  it("sorts input that arrives out of order", () => {
    const history = buildNetWorthHistory([
      savings("a", 1700, "2026-02-28"),
      savings("a", 1000, "2026-01-31"),
    ]);

    expect(history.map((point) => point.netWorth)).toEqual([1000, 1700]);
  });

  it("reports a negative net worth when debt exceeds assets", () => {
    const history = buildNetWorthHistory([
      snapshot("d", AccountType.DEBT, 3000, "2026-01-31"),
    ]);

    expect(history[0].netWorth).toBe(-3000);
  });
});

describe("summariseNetWorth", () => {
  it("is empty and zeroed with no history", () => {
    expect(summariseNetWorth([])).toMatchObject({
      current: 0,
      change: null,
      asOf: null,
    });
  });

  it("reports the change since the previous logged point", () => {
    const history = buildNetWorthHistory([
      savings("a", 1000, "2026-01-31"),
      savings("a", 1700, "2026-02-28"),
    ]);

    expect(summariseNetWorth(history)).toMatchObject({
      current: 1700,
      change: 700,
    });
  });

  it("has no change to report from a single point", () => {
    const history = buildNetWorthHistory([savings("a", 1000, "2026-01-31")]);

    expect(summariseNetWorth(history).change).toBeNull();
  });
});
