"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Figure } from "@/shared/ui/figure";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { GOAL_TYPE_LABELS } from "@/domains/goals/types";
import { GoalProgressBar } from "@/domains/goals/components/goal-progress-bar";
import { GoalTrajectoryCard } from "@/domains/forecasting/components/goal-trajectory-card";

export function GoalDetailScreen({ goalId }: { goalId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const goal = trpc.goals.byId.useQuery({ id: goalId });

  const remove = trpc.goals.delete.useMutation({
    onSuccess: async () => {
      await utils.goals.invalidate();
      router.push("/goals");
    },
  });

  if (goal.isPending) {
    return <div className="h-64 w-full border border-border bg-foreground/5" />;
  }

  if (goal.isError) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/goals"
          className="text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground"
        >
          ← Goals
        </Link>
        <p className="border border-negative px-6 py-4 text-sm text-negative">
          {goal.error.message}
        </p>
      </div>
    );
  }

  const { progress } = goal.data;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href="/goals"
            className="text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground"
          >
            ← Goals
          </Link>
          <h1 className="text-2xl font-semibold">{goal.data.name}</h1>
          <span className="text-xs uppercase tracking-widest text-foreground/50">
            {GOAL_TYPE_LABELS[goal.data.type]}
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm(`Delete "${goal.data.name}"?`)) {
              remove.mutate({ id: goal.data.id });
            }
          }}
        >
          Delete goal
        </Button>
      </div>

      <section className="border border-border px-5 py-6 sm:px-8 sm:py-8">
        <span className="text-xs uppercase tracking-widest text-foreground/60">
          Progress
        </span>
        <Figure className="mt-3 block text-5xl leading-none font-semibold sm:text-[64px]">
          {progress.percentComplete.toFixed(1)}%
        </Figure>
        <GoalProgressBar progress={progress} className="mt-6" />
        <p className="mt-4 text-sm text-foreground/60">
          <Figure className="text-foreground">
            {formatCurrency(progress.currentAmount)}
          </Figure>{" "}
          of{" "}
          <Figure className="text-foreground">
            {formatCurrency(progress.targetAmount)}
          </Figure>
          {progress.isComplete ? (
            <span className="text-positive"> — target reached</span>
          ) : (
            <>
              {" · "}
              <Figure className="text-foreground">
                {formatCurrency(progress.remaining)}
              </Figure>{" "}
              still to go
            </>
          )}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat
          label="Target date"
          value={
            progress.targetDate ? formatDate(progress.targetDate) : "None set"
          }
          tone={progress.isOverdue ? "negative" : "neutral"}
        />
        <Stat
          label="Months remaining"
          value={
            progress.monthsRemaining === null
              ? "—"
              : progress.monthsRemaining > 0
                ? String(progress.monthsRemaining)
                : "Past due"
          }
          tone={progress.isOverdue ? "negative" : "neutral"}
        />
        <Stat
          label="Needed per month"
          value={
            progress.requiredPerMonth === null
              ? "—"
              : formatCurrency(progress.requiredPerMonth, { fractionDigits: 0 })
          }
        />
      </div>

      <GoalTrajectoryCard goalId={goal.data.id} />

      {progress.requiredPerMonth !== null ? (
        <p className="max-w-prose text-xs text-foreground/40">
          &ldquo;Needed per month&rdquo; is simple division — the remaining
          amount spread over the months left, assuming no growth and no
          withdrawals. The trajectory above is the projection that does account
          for growth; this figure is the flat contribution the target implies.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Linked accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {goal.data.linkedAccountNames.length === 0 ? (
            <p className="text-sm text-foreground/50">
              No accounts linked. Progress is calculated from linked account
              balances, so it will stay at zero until you link one.
            </p>
          ) : (
            <ul className="text-sm">
              {goal.data.linkedAccountNames.map((name) => (
                <li
                  key={name}
                  className="border-b border-border py-3 last:border-b-0"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "negative";
}) {
  return (
    <div className="border border-border px-6 py-5">
      <span className="text-xs uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      <Figure
        sentiment={tone === "negative" ? "negative" : "neutral"}
        className="mt-2 block text-xl"
      >
        {value}
      </Figure>
    </div>
  );
}
