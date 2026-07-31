"use client";

import { useState } from "react";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Figure } from "@/shared/ui/figure";
import { formatCurrency, formatSignedCurrency } from "@/shared/lib/format";
import {
  ALLOCATION_STATUS_LABELS,
  type AllocationStatus,
} from "@/domains/allocation/types";
import { ConfirmAllocationForm } from "@/domains/allocation/components/confirm-allocation-form";

const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const statusTone: Record<AllocationStatus, "neutral" | "positive" | "negative"> =
  {
    PLANNED: "neutral",
    ON_PLAN: "positive",
    UNDER_PLAN: "negative",
    OVER_PLAN: "positive",
  };

export function AllocationCard() {
  const utils = trpc.useUtils();
  const allocation = trpc.allocation.currentMonth.useQuery();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirm = trpc.allocation.confirm.useMutation({
    onSuccess: async () => {
      setConfirmOpen(false);
      await utils.allocation.invalidate();
    },
  });

  if (allocation.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This month&rsquo;s allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 w-full bg-foreground/5" />
        </CardContent>
      </Card>
    );
  }

  if (allocation.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This month&rsquo;s allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-negative">{allocation.error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const data = allocation.data;
  const isConfirmed = data.confirmedAt !== null;

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>
            Allocation — {monthLabel.format(data.month)}
          </CardTitle>
          <span
            className={
              statusTone[data.status] === "positive"
                ? "text-xs uppercase tracking-widest text-positive"
                : statusTone[data.status] === "negative"
                  ? "text-xs uppercase tracking-widest text-negative"
                  : "text-xs uppercase tracking-widest text-foreground/50"
            }
          >
            {ALLOCATION_STATUS_LABELS[data.status]}
          </span>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-6">
            <Split
              label="Savings"
              planned={data.plannedSavingsAmount}
              actual={data.actualSavingsAmount}
            />
            <Split
              label="Investments"
              planned={data.plannedInvestmentAmount}
              actual={data.actualInvestmentAmount}
            />
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-border pt-4">
            <span className="text-sm text-foreground/60">
              {isConfirmed ? "Moved" : "Planned"}{" "}
              <Figure className="text-foreground">
                {formatCurrency(data.actualTotal ?? data.plannedTotal, {
                  fractionDigits: 0,
                })}
              </Figure>
              {isConfirmed && data.variance !== null && data.variance !== 0 ? (
                <>
                  {" — "}
                  <Figure
                    sentiment={data.variance < 0 ? "negative" : "positive"}
                  >
                    {formatSignedCurrency(data.variance, { fractionDigits: 0 })}
                  </Figure>{" "}
                  vs plan
                </>
              ) : null}
            </span>

            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              {isConfirmed ? "Update" : "Confirm allocation"}
            </Button>
          </div>

          {data.notes ? (
            <p className="text-xs text-foreground/50">{data.notes}</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title={`Confirm ${monthLabel.format(data.month)}`}>
          <ConfirmAllocationForm
            allocation={data}
            isSubmitting={confirm.isPending}
            onSubmit={(values) =>
              confirm.mutate({ month: data.month, ...values })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Split({
  label,
  planned,
  actual,
}: {
  label: string;
  planned: number;
  actual: number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      <Figure className="text-2xl">
        {formatCurrency(actual ?? planned, { fractionDigits: 0 })}
      </Figure>
      {actual !== null && actual !== planned ? (
        <span className="text-xs text-foreground/40">
          planned {formatCurrency(planned, { fractionDigits: 0 })}
        </span>
      ) : null}
    </div>
  );
}
