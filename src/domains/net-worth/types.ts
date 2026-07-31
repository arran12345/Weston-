import type { AccountType } from "@/domains/accounts/types";

/** A single snapshot row, flattened with its account's type. */
export type SnapshotInput = {
  accountId: string;
  accountType: AccountType;
  balance: number;
  capturedAt: Date;
  createdAt: Date;
};

export type NetWorthPoint = {
  date: Date;
  assets: number;
  debts: number;
  netWorth: number;
};

export type NetWorthSummary = {
  current: number;
  assets: number;
  debts: number;
  /** Absolute change vs. the previous point in the series, null if none. */
  change: number | null;
  previousDate: Date | null;
  asOf: Date | null;
};
