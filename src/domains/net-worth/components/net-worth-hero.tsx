"use client";

import { Figure } from "@/shared/ui/figure";
import {
  formatCurrency,
  formatDate,
  formatSignedCurrency,
} from "@/shared/lib/format";
import type { NetWorthSummary } from "@/domains/net-worth/types";

export function NetWorthHero({ summary }: { summary: NetWorthSummary }) {
  const hasData = summary.asOf !== null;

  return (
    <section className="border border-border px-8 py-10">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Net worth
      </h1>

      <Figure className="mt-4 block text-[80px] leading-none font-semibold">
        {hasData ? formatCurrency(summary.current, { fractionDigits: 0 }) : "—"}
      </Figure>

      {hasData ? (
        <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
          {summary.change !== null ? (
            <span className="text-foreground/60">
              <Figure
                sentiment={
                  summary.change > 0
                    ? "positive"
                    : summary.change < 0
                      ? "negative"
                      : "neutral"
                }
              >
                {formatSignedCurrency(summary.change, { fractionDigits: 0 })}
              </Figure>{" "}
              since {summary.previousDate ? formatDate(summary.previousDate) : "—"}
            </span>
          ) : (
            <span className="text-foreground/40">
              First balance logged — no change to show yet.
            </span>
          )}

          <span className="text-foreground/60">
            Assets{" "}
            <Figure>{formatCurrency(summary.assets, { fractionDigits: 0 })}</Figure>
          </span>
          <span className="text-foreground/60">
            Debt{" "}
            <Figure sentiment={summary.debts > 0 ? "negative" : "neutral"}>
              {formatCurrency(summary.debts, { fractionDigits: 0 })}
            </Figure>
          </span>
          {summary.asOf ? (
            <span className="text-foreground/40">
              as of {formatDate(summary.asOf)}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-foreground/70">
          No balances logged yet. Net worth is calculated from your latest
          account snapshots — add an account and log a balance to see this
          number move.
        </p>
      )}
    </section>
  );
}
