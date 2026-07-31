"use client";

import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { DialogClose } from "@/shared/ui/dialog";
import { formatCurrency } from "@/shared/lib/format";
import type { MonthlyAllocationView } from "@/domains/allocation/types";

type FormValues = {
  actualSavingsAmount: string;
  actualInvestmentAmount: string;
  notes: string;
};

export function ConfirmAllocationForm({
  allocation,
  isSubmitting,
  onSubmit,
}: {
  allocation: MonthlyAllocationView;
  isSubmitting: boolean;
  onSubmit: (values: {
    actualSavingsAmount: number;
    actualInvestmentAmount: number;
    notes?: string;
  }) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    // Pre-filled with the plan — confirming an on-plan month is one click.
    defaultValues: {
      actualSavingsAmount: String(
        allocation.actualSavingsAmount ?? allocation.plannedSavingsAmount,
      ),
      actualInvestmentAmount: String(
        allocation.actualInvestmentAmount ?? allocation.plannedInvestmentAmount,
      ),
      notes: allocation.notes ?? "",
    },
  });

  const numeric = {
    required: "Required",
    validate: (value: string) =>
      Number.isFinite(Number(value)) || "Must be a number",
  };

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          actualSavingsAmount: Number(values.actualSavingsAmount),
          actualInvestmentAmount: Number(values.actualInvestmentAmount),
          notes: values.notes.trim() || undefined,
        }),
      )}
      className="flex flex-col gap-5"
      noValidate
    >
      <p className="text-sm text-foreground/60">
        Planned{" "}
        <span className="font-mono tabular-nums text-foreground">
          {formatCurrency(allocation.plannedSavingsAmount)}
        </span>{" "}
        to savings and{" "}
        <span className="font-mono tabular-nums text-foreground">
          {formatCurrency(allocation.plannedInvestmentAmount)}
        </span>{" "}
        to investments. Adjust if what actually moved was different.
      </p>

      <Field
        label="Actually moved to savings"
        error={errors.actualSavingsAmount?.message}
      >
        <Input
          type="number"
          step="0.01"
          {...register("actualSavingsAmount", numeric)}
        />
      </Field>

      <Field
        label="Actually moved to investments"
        error={errors.actualInvestmentAmount?.message}
      >
        <Input
          type="number"
          step="0.01"
          {...register("actualInvestmentAmount", numeric)}
        />
      </Field>

      <Field label="Notes (optional)">
        <Input {...register("notes")} placeholder="e.g. bonus month" />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Confirm allocation"}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
      </div>
    </form>
  );
}
