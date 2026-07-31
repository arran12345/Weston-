"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Field, Input } from "@/shared/ui/input";
import { Figure } from "@/shared/ui/figure";
import { formatCurrency } from "@/shared/lib/format";

type FormValues = { savingsAmount: string; investmentAmount: string };

export function StrategySettings() {
  const utils = trpc.useUtils();
  const strategy = trpc.allocation.strategy.useQuery();

  const { register, handleSubmit, reset, control } = useForm<FormValues>({
    defaultValues: { savingsAmount: "", investmentAmount: "" },
  });

  // Populate once the stored strategy arrives.
  useEffect(() => {
    if (strategy.data) {
      reset({
        savingsAmount: String(strategy.data.savingsAmount),
        investmentAmount: String(strategy.data.investmentAmount),
      });
    }
  }, [strategy.data, reset]);

  const update = trpc.allocation.updateStrategy.useMutation({
    onSuccess: async () => {
      await utils.allocation.invalidate();
    },
  });

  const [savings, investment] = useWatch({
    control,
    name: ["savingsAmount", "investmentAmount"],
  });
  const total = Number(savings || 0) + Number(investment || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-5 max-w-prose text-sm text-foreground/60">
          The standing monthly split. New months are planned against these
          amounts; months you&rsquo;ve already confirmed keep the figures they
          were planned against.
        </p>

        <form
          onSubmit={handleSubmit((values) =>
            update.mutate({
              savingsAmount: Number(values.savingsAmount),
              investmentAmount: Number(values.investmentAmount),
            }),
          )}
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="To savings / month">
              <Input type="number" step="0.01" {...register("savingsAmount")} />
            </Field>
            <Field label="To investments / month">
              <Input
                type="number"
                step="0.01"
                {...register("investmentAmount")}
              />
            </Field>
          </div>

          <p className="text-sm text-foreground/60">
            Total <Figure className="text-foreground">{formatCurrency(total)}</Figure> per
            month
          </p>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={update.isPending} className="w-fit">
              {update.isPending ? "Saving…" : "Save strategy"}
            </Button>
            {strategy.data && !strategy.data.isCustomised ? (
              <span className="text-xs text-foreground/40">
                Currently using the default.
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
