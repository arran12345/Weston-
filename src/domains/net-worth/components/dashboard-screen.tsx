"use client";

import { trpc } from "@/shared/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { FlatLineChart } from "@/shared/charts/line-chart";
import { NetWorthHero } from "@/domains/net-worth/components/net-worth-hero";

export function DashboardScreen() {
  const summary = trpc.netWorth.summary.useQuery();
  const history = trpc.netWorth.history.useQuery();

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
          <CardTitle>Net worth history</CardTitle>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <p className="py-8 text-sm text-foreground/60">
              History appears once balances are logged. Each point is a balance
              you actually recorded — the line never interpolates between them.
            </p>
          ) : points.length === 1 ? (
            <p className="py-8 text-sm text-foreground/60">
              One balance logged. Log another to start a trend.
            </p>
          ) : (
            <FlatLineChart data={points} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <EmptyState
          title="This month's allocation"
          description="Once you log a monthly allocation, this will show whether your savings/investment split executed as planned. Built in Milestone 2."
        />
        <EmptyState
          title="Goal progress"
          description="Create a goal — house deposit or otherwise — to see trajectory and progress here. Built in Milestone 4."
        />
      </div>
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
