"use client";

import { useState } from "react";

import { trpc } from "@/shared/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Figure } from "@/shared/ui/figure";
import { Field, Input, Select } from "@/shared/ui/input";
import { ForecastChart } from "@/shared/charts/forecast-chart";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { DEFAULT_ANNUAL_GROWTH_RATE } from "@/domains/forecasting/types";

const HORIZONS = [
  { months: 12, label: "1 year" },
  { months: 36, label: "3 years" },
  { months: 60, label: "5 years" },
  { months: 120, label: "10 years" },
];

export function ForecastsScreen() {
  const [months, setMonths] = useState(60);
  const [growthPct, setGrowthPct] = useState(
    String(DEFAULT_ANNUAL_GROWTH_RATE * 100),
  );

  const parsedGrowth = Number(growthPct);
  const annualGrowthRate = Number.isFinite(parsedGrowth)
    ? parsedGrowth / 100
    : DEFAULT_ANNUAL_GROWTH_RATE;

  const forecast = trpc.forecasting.netWorth.useQuery({
    months,
    annualGrowthRate,
  });
  const history = trpc.netWorth.history.useQuery();

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
          Forecasts — where will I be?
        </h1>
        <Link
          href="/forecasts/scenarios"
          className="text-sm hover:underline"
        >
          Compare scenarios →
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Horizon">
          <Select
            className="w-36"
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
          >
            {HORIZONS.map((horizon) => (
              <option key={horizon.months} value={horizon.months}>
                {horizon.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assumed growth % / year">
          <Input
            className="w-36"
            type="number"
            step="0.1"
            value={growthPct}
            onChange={(event) => setGrowthPct(event.target.value)}
          />
        </Field>
      </div>
    </div>
  );

  if (forecast.isPending) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="h-80 w-full border border-border bg-foreground/5" />
      </div>
    );
  }

  if (forecast.isError) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <p className="border border-negative px-6 py-4 text-sm text-negative">
          {forecast.error.message}
        </p>
      </div>
    );
  }

  const data = forecast.data;
  const final = data.points.at(-1)!;
  const startingNetWorth = data.points[0].netWorth;

  if (!data.hasData) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState
          title="Nothing to project yet"
          description="A forecast starts from your current balances. Add an account and log a balance, and the projection will run from there."
          action={{ label: "Go to accounts", href: "/accounts" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      <section className="border border-border px-8 py-8">
        <span className="text-xs uppercase tracking-widest text-foreground/60">
          Projected net worth in {monthsLabel(months)}
        </span>
        <Figure className="mt-3 block text-[64px] leading-none font-semibold">
          {formatCurrency(final.netWorth, { fractionDigits: 0 })}
        </Figure>
        <p className="mt-4 text-sm text-foreground/60">
          from{" "}
          <Figure className="text-foreground">
            {formatCurrency(startingNetWorth, { fractionDigits: 0 })}
          </Figure>{" "}
          today ·{" "}
          <Figure className="text-foreground">
            {formatCurrency(final.contributed, { fractionDigits: 0 })}
          </Figure>{" "}
          contributed ·{" "}
          <Figure className="text-foreground">
            {formatCurrency(final.growth, { fractionDigits: 0 })}
          </Figure>{" "}
          assumed growth
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart
            actual={(history.data ?? []).map((point) => ({
              date: point.date,
              value: point.netWorth,
            }))}
            projected={data.points.map((point) => ({
              date: point.date,
              value: point.netWorth,
            }))}
          />
        </CardContent>
      </Card>

      <AssumptionsNote
        cash={data.assumptions.monthlyCashContribution}
        investment={data.assumptions.monthlyInvestmentContribution}
        growthRate={data.assumptions.annualGrowthRate}
      />

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <table className="w-full text-sm">
            <tbody>
              {[12, 24, 36, 60, 120]
                .filter((month) => month <= months)
                .map((month) => {
                  const point = data.points[month];
                  if (!point) return null;
                  return (
                    <tr
                      key={month}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-6 py-3 text-foreground/60">
                        {monthsLabel(month)}
                      </td>
                      <td className="px-6 py-3 text-right text-foreground/50">
                        {formatDate(point.date)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Figure>
                          {formatCurrency(point.netWorth, {
                            fractionDigits: 0,
                          })}
                        </Figure>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Section 17: an assumption must never read as a promise, so the inputs
 * behind every projected figure are stated in plain terms next to it.
 */
export function AssumptionsNote({
  cash,
  investment,
  growthRate,
}: {
  cash: number;
  investment: number;
  growthRate: number;
}) {
  return (
    <p className="max-w-prose border border-border px-6 py-4 text-xs leading-relaxed text-foreground/50">
      <span className="text-foreground/70">This is a projection, not a promise.</span>{" "}
      It assumes {formatCurrency(cash, { fractionDigits: 0 })}/month into
      savings and {formatCurrency(investment, { fractionDigits: 0 })}/month into
      investments continue unchanged, investments grow at{" "}
      {(growthRate * 100).toFixed(1)}% a year (adjustable above), cash does not
      grow, and debt stays flat because 0% debt is deliberately not repaid
      early. Real returns vary and will not follow a straight line.
    </p>
  );
}

function monthsLabel(months: number) {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} months`;
}
