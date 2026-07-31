"use client";

import { useState } from "react";
import Link from "next/link";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Figure } from "@/shared/ui/figure";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { GoalType, type GoalWithProgress } from "@/domains/goals/types";
import { GoalForm, type GoalFormSubmit } from "@/domains/goals/components/goal-form";
import { GoalProgressBar } from "@/domains/goals/components/goal-progress-bar";

export function GoalsScreen() {
  const utils = trpc.useUtils();
  const goals = trpc.goals.list.useQuery();
  const accounts = trpc.accounts.list.useQuery();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<GoalWithProgress | null>(null);

  const invalidate = () => utils.goals.invalidate();

  const create = trpc.goals.create.useMutation({
    onSuccess: async () => {
      setAddOpen(false);
      await invalidate();
    },
  });

  const update = trpc.goals.update.useMutation({
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
  });

  const header = (
    <div className="flex items-center justify-between">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Goals — how close am I?
      </h1>
      <Button onClick={() => setAddOpen(true)}>Add goal</Button>
    </div>
  );

  if (goals.isPending) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="h-40 w-full border border-border bg-foreground/5" />
      </div>
    );
  }

  if (goals.isError) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <p className="border border-negative px-6 py-4 text-sm text-negative">
          {goals.error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      {goals.data.length === 0 ? (
        <div className="flex flex-col gap-4 border border-border px-6 py-8">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            No goals yet
          </h2>
          <p className="max-w-prose text-sm text-foreground/70">
            A goal is a target amount, optionally with a date, tracked against
            the balances of whichever accounts you link to it. Progress is
            derived from those balances — nothing to keep updating by hand.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="w-fit"
              onClick={() => setAddOpen(true)}
              disabled={create.isPending}
            >
              Create house deposit goal
            </Button>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => setAddOpen(true)}
            >
              Create another goal
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {goals.data.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={setEditing} />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add goal">
          <GoalForm
            accounts={accounts.data ?? []}
            defaultValues={{
              name: "House deposit",
              type: GoalType.HOUSE_DEPOSIT,
            }}
            submitLabel="Add goal"
            isSubmitting={create.isPending}
            onSubmit={(values: GoalFormSubmit) => create.mutate(values)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent title="Edit goal">
          {editing ? (
            <GoalForm
              key={editing.id}
              accounts={accounts.data ?? []}
              defaultValues={editing}
              submitLabel="Save changes"
              isSubmitting={update.isPending}
              onSubmit={(values) => update.mutate({ id: editing.id, ...values })}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
}: {
  goal: GoalWithProgress;
  onEdit: (goal: GoalWithProgress) => void;
}) {
  const { progress } = goal;

  return (
    <section className="border border-border">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-6 py-4">
        <Link href={`/goals/${goal.id}`} className="hover:underline">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            {goal.name}
          </h2>
        </Link>
        <div className="flex items-center gap-4">
          {progress.isComplete ? (
            <span className="text-xs uppercase tracking-widest text-positive">
              Reached
            </span>
          ) : progress.isOverdue ? (
            <span className="text-xs uppercase tracking-widest text-negative">
              Past target date
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => onEdit(goal)}>
            Edit
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Figure className="text-3xl">
            {formatCurrency(progress.currentAmount, { fractionDigits: 0 })}
          </Figure>
          <span className="text-sm text-foreground/60">
            of{" "}
            <Figure className="text-foreground">
              {formatCurrency(progress.targetAmount, { fractionDigits: 0 })}
            </Figure>{" "}
            · <Figure>{progress.percentComplete.toFixed(1)}%</Figure>
          </span>
        </div>

        <GoalProgressBar progress={progress} />

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-foreground/60">
          {!progress.isComplete ? (
            <span>
              <Figure className="text-foreground">
                {formatCurrency(progress.remaining, { fractionDigits: 0 })}
              </Figure>{" "}
              to go
            </span>
          ) : null}

          {progress.targetDate ? (
            <span>
              by {formatDate(progress.targetDate)}
              {progress.monthsRemaining !== null && progress.monthsRemaining > 0
                ? ` · ${progress.monthsRemaining} month${progress.monthsRemaining === 1 ? "" : "s"} left`
                : ""}
            </span>
          ) : (
            <span className="text-foreground/40">No target date</span>
          )}

          {progress.requiredPerMonth !== null ? (
            <span>
              needs{" "}
              <Figure className="text-foreground">
                {formatCurrency(progress.requiredPerMonth, {
                  fractionDigits: 0,
                })}
              </Figure>
              /month
            </span>
          ) : null}
        </div>

        <p className="text-xs text-foreground/40">
          {goal.linkedAccountNames.length > 0
            ? `Tracking ${goal.linkedAccountNames.join(", ")}`
            : "No accounts linked — progress stays at zero until you link one."}
        </p>
      </div>
    </section>
  );
}
