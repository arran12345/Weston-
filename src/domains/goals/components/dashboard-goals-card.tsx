"use client";

import Link from "next/link";

import { trpc } from "@/shared/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Figure } from "@/shared/ui/figure";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { GoalProgressBar } from "@/domains/goals/components/goal-progress-bar";

export function DashboardGoalsCard() {
  const goals = trpc.goals.list.useQuery();

  if (goals.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 w-full bg-foreground/5" />
        </CardContent>
      </Card>
    );
  }

  if (goals.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-negative">{goals.error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (goals.data.length === 0) {
    return (
      <EmptyState
        title="Goal progress"
        description="A goal is a target amount tracked against the accounts you link to it. The house deposit is the obvious first one."
        action={{ label: "Create a goal", href: "/goals" }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Goal progress</CardTitle>
        <Link
          href="/goals"
          className="text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground"
        >
          All goals →
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {goals.data.map((goal) => (
          <div key={goal.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link
                href={`/goals/${goal.id}`}
                className="text-sm font-medium hover:underline"
              >
                {goal.name}
              </Link>
              <span className="text-sm text-foreground/60">
                <Figure className="text-foreground">
                  {formatCurrency(goal.progress.currentAmount, {
                    fractionDigits: 0,
                  })}
                </Figure>{" "}
                of{" "}
                <Figure className="text-foreground">
                  {formatCurrency(goal.progress.targetAmount, {
                    fractionDigits: 0,
                  })}
                </Figure>{" "}
                · <Figure>{goal.progress.percentComplete.toFixed(0)}%</Figure>
              </span>
            </div>

            <GoalProgressBar progress={goal.progress} />

            <span className="text-xs text-foreground/40">
              {goal.progress.isComplete
                ? "Target reached"
                : goal.progress.isOverdue
                  ? `Past target date (${formatDate(goal.progress.targetDate!)})`
                  : goal.progress.requiredPerMonth !== null
                    ? `${formatCurrency(goal.progress.requiredPerMonth, { fractionDigits: 0 })}/month to stay on track`
                    : `${formatCurrency(goal.progress.remaining, { fractionDigits: 0 })} to go`}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
