import { AccountType } from "@/domains/accounts/types";
import type {
  NetWorthPoint,
  NetWorthSummary,
  SnapshotInput,
} from "@/domains/net-worth/types";

/**
 * Net worth is derived, never stored (docs/PRD.md Section 8). These are pure
 * functions over snapshot rows so the same logic serves the dashboard hero,
 * the history chart, and later the forecasting engine (Section 12).
 *
 * Sign convention: debt balances are entered as a positive "amount owed" and
 * subtracted here. Assets are everything that isn't a DEBT account.
 */

function isDebt(type: AccountType) {
  return type === AccountType.DEBT;
}

/** Later capturedAt wins; ties broken by createdAt so a correction supersedes. */
function bySnapshotOrder(a: SnapshotInput, b: SnapshotInput) {
  const byCaptured = a.capturedAt.getTime() - b.capturedAt.getTime();
  if (byCaptured !== 0) return byCaptured;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Builds the net worth time series.
 *
 * At any given date, net worth is the sum of each account's most recent
 * snapshot at or before that date — accounts with no snapshot yet simply
 * don't contribute. A point is emitted per distinct snapshot date, which
 * makes the series a step function: the value only moves when a balance was
 * actually logged, never interpolated. That honesty is deliberate and is
 * what the flat, unsmoothed chart in Section 13 renders.
 */
export function buildNetWorthHistory(
  snapshots: SnapshotInput[],
): NetWorthPoint[] {
  const ordered = [...snapshots].sort(bySnapshotOrder);

  const latestPerAccount = new Map<
    string,
    { balance: number; accountType: AccountType }
  >();
  const points: NetWorthPoint[] = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const snapshot = ordered[i];
    latestPerAccount.set(snapshot.accountId, {
      balance: snapshot.balance,
      accountType: snapshot.accountType,
    });

    // Only emit once all snapshots sharing this timestamp are applied.
    const next = ordered[i + 1];
    if (next && next.capturedAt.getTime() === snapshot.capturedAt.getTime()) {
      continue;
    }

    let assets = 0;
    let debts = 0;

    for (const entry of latestPerAccount.values()) {
      if (isDebt(entry.accountType)) {
        debts += entry.balance;
      } else {
        assets += entry.balance;
      }
    }

    points.push({
      date: snapshot.capturedAt,
      assets,
      debts,
      netWorth: assets - debts,
    });
  }

  return points;
}

/** Current net worth plus the change since the previous logged point. */
export function summariseNetWorth(history: NetWorthPoint[]): NetWorthSummary {
  const latest = history.at(-1);
  const previous = history.at(-2);

  if (!latest) {
    return {
      current: 0,
      assets: 0,
      debts: 0,
      change: null,
      previousDate: null,
      asOf: null,
    };
  }

  return {
    current: latest.netWorth,
    assets: latest.assets,
    debts: latest.debts,
    change: previous ? latest.netWorth - previous.netWorth : null,
    previousDate: previous?.date ?? null,
    asOf: latest.date,
  };
}
