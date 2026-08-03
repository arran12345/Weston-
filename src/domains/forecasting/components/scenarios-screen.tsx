"use client";

import { useState } from "react";
import Link from "next/link";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Figure } from "@/shared/ui/figure";
import { Field, Input, Select } from "@/shared/ui/input";
import { ScenarioChart } from "@/shared/charts/scenario-chart";
import { formatCurrency, formatSignedCurrency } from "@/shared/lib/format";
import { DEFAULT_ANNUAL_GROWTH_RATE } from "@/domains/forecasting/types";

type ScenarioDraft = {
  id: string;
  label: string;
  cash: string;
  investment: string;
  growthPct: string;
};

const HORIZONS = [12, 36, 60, 120];

function draft(id: string, label: string, cash: number, investment: number) {
  return {
    id,
    label,
    cash: String(cash),
    investment: String(investment),
    growthPct: String(DEFAULT_ANNUAL_GROWTH_RATE * 100),
  };
}

export function ScenariosScreen() {
  const strategy = trpc.allocation.strategy.useQuery();

  const [months, setMonths] = useState(60);
  const [scenarios, setScenarios] = useState<ScenarioDraft[] | null>(null);

  // Seed from the real strategy once it loads: the baseline is what you're
  // actually doing, and the comparison is a raised version of it.
  const drafts =
    scenarios ??
    (strategy.data
      ? [
          draft(
            "baseline",
            "Current plan",
            strategy.data.savingsAmount,
            strategy.data.investmentAmount,
          ),
          draft(
            "alt",
            "If I saved more",
            strategy.data.savingsAmount + 200,
            strategy.data.investmentAmount + 100,
          ),
        ]
      : []);

  const compare = trpc.forecasting.compare.useQuery(
    {
      months,
      scenarios: drafts.map((scenario) => ({
        id: scenario.id,
        label: scenario.label,
        monthlyCashContribution: Number(scenario.cash) || 0,
        monthlyInvestmentContribution: Number(scenario.investment) || 0,
        annualGrowthRate:
          (Number(scenario.growthPct) || 0) / 100,
      })),
    },
    { enabled: drafts.length > 0 },
  );

  const update = (id: string, patch: Partial<ScenarioDraft>) => {
    setScenarios(
      drafts.map((scenario) =>
        scenario.id === id ? { ...scenario, ...patch } : scenario,
      ),
    );
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Link
          href="/forecasts"
          className="text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground"
        >
          ← Forecasts
        </Link>
        <h1 className="text-2xl font-semibold">Scenarios</h1>
      </div>
      <div className="flex items-end gap-4">
        <Field label="Horizon">
          <Select
            className="w-36"
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
          >
            {HORIZONS.map((option) => (
              <option key={option} value={option}>
                {option / 12} year{option === 12 ? "" : "s"}
              </option>
            ))}
          </Select>
        </Field>
        {drafts.length < 4 ? (
          <Button
            variant="outline"
            onClick={() =>
              setScenarios([
                ...drafts,
                draft(
                  `s${Date.now()}`,
                  `Scenario ${drafts.length + 1}`,
                  Number(drafts[0]?.cash ?? 0),
                  Number(drafts[0]?.investment ?? 0),
                ),
              ])
            }
          >
            Add scenario
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (compare.isPending || strategy.isPending) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="h-80 w-full border border-border bg-foreground/5" />
      </div>
    );
  }

  if (compare.isError) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <p className="border border-negative px-6 py-4 text-sm text-negative">
          {compare.error.message}
        </p>
      </div>
    );
  }

  if (!compare.data.hasData) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState
          title="Nothing to compare yet"
          description="Scenarios project forward from your current balances. Add an account and log a balance first."
          action={{ label: "Go to accounts", href: "/accounts" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      <Card>
        <CardHeader>
          <CardTitle>Projected net worth</CardTitle>
        </CardHeader>
        <CardContent>
          <ScenarioChart
            series={compare.data.scenarios.map((scenario) => ({
              id: scenario.id,
              label: scenario.label,
              points: scenario.points.map((point) => ({
                date: point.date,
                value: point.netWorth,
              })),
            }))}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {drafts.map((scenario, index) => {
          const result = compare.data.scenarios.find(
            (candidate) => candidate.id === scenario.id,
          );

          return (
            <section key={scenario.id} className="border border-border">
              <header className="flex items-center justify-between border-b border-border px-6 py-3">
                <input
                  value={scenario.label}
                  aria-label={`Scenario ${index + 1} name`}
                  onChange={(event) =>
                    update(scenario.id, { label: event.target.value })
                  }
                  className="bg-transparent text-xs font-bold uppercase tracking-widest text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                />
                <div className="flex items-center gap-4">
                  {index === 0 ? (
                    <span className="text-xs uppercase tracking-widest text-foreground/40">
                      Baseline
                    </span>
                  ) : result ? (
                    <Figure
                      sentiment={
                        result.deltaVsBaseline > 0
                          ? "positive"
                          : result.deltaVsBaseline < 0
                            ? "negative"
                            : "neutral"
                      }
                      className="text-sm"
                    >
                      {formatSignedCurrency(result.deltaVsBaseline, {
                        fractionDigits: 0,
                      })}
                    </Figure>
                  ) : null}
                  {drafts.length > 1 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setScenarios(
                          drafts.filter(
                            (candidate) => candidate.id !== scenario.id,
                          ),
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </header>

              <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-4">
                <Field label="Savings / month">
                  <Input
                    type="number"
                    step="10"
                    value={scenario.cash}
                    onChange={(event) =>
                      update(scenario.id, { cash: event.target.value })
                    }
                  />
                </Field>
                <Field label="Investments / month">
                  <Input
                    type="number"
                    step="10"
                    value={scenario.investment}
                    onChange={(event) =>
                      update(scenario.id, { investment: event.target.value })
                    }
                  />
                </Field>
                <Field label="Growth % / year">
                  <Input
                    type="number"
                    step="0.1"
                    value={scenario.growthPct}
                    onChange={(event) =>
                      update(scenario.id, { growthPct: event.target.value })
                    }
                  />
                </Field>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-foreground/60">
                    Projected
                  </span>
                  <Figure className="text-xl">
                    {result
                      ? formatCurrency(result.finalNetWorth, {
                          fractionDigits: 0,
                        })
                      : "—"}
                  </Figure>
                  {result ? (
                    <span className="text-xs text-foreground/40">
                      {formatCurrency(result.contributed, { fractionDigits: 0 })}{" "}
                      in ·{" "}
                      {formatCurrency(result.growth, { fractionDigits: 0 })}{" "}
                      growth
                    </span>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <p className="max-w-prose border border-border px-6 py-4 text-xs leading-relaxed text-foreground/50">
        <span className="text-foreground/70">These are projections, not promises.</span>{" "}
        Every scenario is the same arithmetic run with different inputs: cash
        contributions don&rsquo;t grow, investments compound monthly at the rate
        you set, and debt stays flat. Real returns vary and will not follow a
        straight line.
      </p>
    </div>
  );
}
