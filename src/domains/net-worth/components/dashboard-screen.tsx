"use client";

import Link from "next/link";

import { trpc } from "@/shared/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ForecastChart } from "@/shared/charts/forecast-chart";
import { NetWorthHero } from "@/domains/net-worth/components/net-worth-hero";
import { AllocationCard } from "@/domains/allocation/components/allocation-card";
import { DashboardGoalsCard } from "@/domains/goals/components/dashboard-goals-card";

export function DashboardScreen() {
  const summary = trpc.netWorth.summary.useQuery();
  const history = trpc.netWorth.history.useQuery();
  const forecast = trpc.forecasting.netWorth.useQuery({ months: 24 });

  if (summary.isPending || history.isPending) {
    return <DashboardSkeleton />;
  }

  if (summary.isError || history.isError) {
    const message = summary.error?.message ?? history.error?.message;
    return (
      <p className="border border-negative px-6 py-4 text-sm text-negative">
        Could not load dashboard: {message}
      </p>
    );
  }

  const points = history.data.map((point) => ({
    date: point.date,
    value: point.netWorth,
  }));

  return (
    <div className="flex flex-col gap-10">
      <NetWorthHero summary={summary.data} />

      <Card>
        <CardHeader>
          <CardTitle>Net worth — recorded and projected</CardTitle>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <p className="py-8 text-sm text-foreground/60">
              History appears once balances are logged. Each point is a balance
              you actually recorded — the line never interpolates between them.
            </p>
          ) : (
            <>
              <ForecastChart
                actual={points}
                projected={(forecast.data?.points ?? []).map((point) => ({
                  date: point.date,
                  value: point.netWorth,
                }))}
              />
              <p className="mt-4 text-xs text-foreground/40">
                Solid is recorded, dashed is projected at{" "}
                {((forecast.data?.assumptions.annualGrowthRate ?? 0) * 100).toFixed(
                  1,
                )}
                % assumed annual growth —{" "}
                <Link href="/forecasts" className="hover:text-foreground">
                  adjust in Forecasts
                </Link>
                .
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <AllocationCard />

      <DashboardGoalsCard />
    </div>
  );
}

/** Skeleton matching the final layout, per Section 14. */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div className="border border-border px-8 py-10">
        <div className="h-3 w-24 bg-foreground/10" />
        <div className="mt-6 h-20 w-96 max-w-full bg-foreground/10" />
        <div className="mt-6 h-4 w-72 bg-foreground/10" />
      </div>
      <div className="border border-border">
        <div className="border-b border-border px-6 py-4">
          <div className="h-3 w-40 bg-foreground/10" />
        </div>
        <div className="px-6 py-4">
          <div className="h-[280px] w-full bg-foreground/5" />
        </div>
      </div>
    </div>
  );
}
