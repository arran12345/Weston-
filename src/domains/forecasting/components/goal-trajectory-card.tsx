"use client";

import { trpc } from "@/shared/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Figure } from "@/shared/ui/figure";
import { ForecastChart } from "@/shared/charts/forecast-chart";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { AssumptionsNote } from "@/domains/forecasting/components/forecasts-screen";
import { monthsBetween } from "@/domains/forecasting/services/project";

export function GoalTrajectoryCard({ goalId }: { goalId: string }) {
  const forecast = trpc.forecasting.goal.useQuery({ goalId, months: 120 });

  if (forecast.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full bg-foreground/5" />
        </CardContent>
      </Card>
    );
  }

  if (forecast.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-negative">{forecast.error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const { trajectory, points, assumptions, goal, linksCash, linksInvestment } =
    forecast.data;

  const noContributions =
    assumptions.monthlyCashContribution === 0 &&
    assumptions.monthlyInvestmentContribution === 0;

  // The full ten-year horizon would squash the target line into the floor of
  // the chart. Show a window around when the target is actually reached (or
  // the goal's own date), so the crossing point is legible.
  const horizonMonths = Math.min(
    points.length - 1,
    Math.max(
      12,
      ((trajectory.monthsToTarget ?? 0) + 6),
      goal.targetDate
        ? monthsBetween(points[0].date, goal.targetDate) + 6
        : 0,
    ),
  );
  const visiblePoints = points.slice(0, horizonMonths + 1);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Trajectory</CardTitle>
          {trajectory.alreadyReached ? (
            <span className="text-xs uppercase tracking-widest text-positive">
              Already reached
            </span>
          ) : trajectory.onTrack === true ? (
            <span className="text-xs uppercase tracking-widest text-positive">
              On track
            </span>
          ) : trajectory.onTrack === false ? (
            <span className="text-xs uppercase tracking-widest text-negative">
              Behind
            </span>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {noContributions ? (
            <p className="text-sm text-foreground/60">
              This goal&rsquo;s linked accounts receive none of the monthly
              allocation, so the projection is flat. Link a savings or
              investment account, or adjust the allocation strategy in
              Settings.
            </p>
          ) : trajectory.monthsToTarget === null ? (
            <p className="text-sm text-foreground/60">
              At the current allocation this goal is not reached within ten
              years. It needs a larger monthly contribution or a lower target.
            </p>
          ) : (
            <p className="text-sm text-foreground/60">
              Reaches{" "}
              <Figure className="text-foreground">
                {formatCurrency(goal.targetAmount, { fractionDigits: 0 })}
              </Figure>{" "}
              in{" "}
              <Figure className="text-foreground">
                {trajectory.monthsToTarget}
              </Figure>{" "}
              month{trajectory.monthsToTarget === 1 ? "" : "s"}
              {trajectory.dateReached
                ? ` — around ${formatDate(trajectory.dateReached)}`
                : ""}
              {trajectory.monthsEarlyOrLate !== null && goal.targetDate ? (
                <>
                  {", "}
                  <Figure
                    sentiment={
                      trajectory.monthsEarlyOrLate >= 0 ? "positive" : "negative"
                    }
                  >
                    {Math.abs(trajectory.monthsEarlyOrLate)} month
                    {Math.abs(trajectory.monthsEarlyOrLate) === 1 ? "" : "s"}
                  </Figure>{" "}
                  {trajectory.monthsEarlyOrLate >= 0 ? "ahead of" : "behind"}{" "}
                  the {formatDate(goal.targetDate)} target
                </>
              ) : null}
              .
            </p>
          )}

          <ForecastChart
            projected={visiblePoints.map((point) => ({
              date: point.date,
              value: point.netWorth,
            }))}
            target={goal.targetAmount}
            height={240}
          />
        </CardContent>
      </Card>

      <AssumptionsNote
        cash={assumptions.monthlyCashContribution}
        investment={assumptions.monthlyInvestmentContribution}
        growthRate={assumptions.annualGrowthRate}
      />

      {!linksCash || !linksInvestment ? (
        <p className="max-w-prose text-xs text-foreground/40">
          Only contributions matching this goal&rsquo;s linked account types
          are counted
          {!linksInvestment
            ? " — no investment account is linked, so the investment allocation is excluded"
            : " — no savings account is linked, so the savings allocation is excluded"}
          .
        </p>
      ) : null}
    </div>
  );
}
