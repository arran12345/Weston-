"use client";

import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { DialogClose } from "@/shared/ui/dialog";

type LogBalanceFormValues = {
  balance: string;
  capturedAt: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function LogBalanceForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (values: { balance: number; capturedAt: Date }) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LogBalanceFormValues>({
    defaultValues: { balance: "", capturedAt: todayInputValue() },
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          balance: Number(values.balance),
          // Parsed as local midday so the date can't slide across a day
          // boundary when it's serialised to UTC.
          capturedAt: new Date(`${values.capturedAt}T12:00:00`),
        }),
      )}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label="Balance" error={errors.balance?.message}>
        <Input
          type="number"
          step="0.01"
          placeholder="0.00"
          autoFocus
          {...register("balance", {
            required: "Balance is required",
            validate: (value) =>
              Number.isFinite(Number(value)) || "Must be a number",
          })}
        />
      </Field>

      <Field label="As of" error={errors.capturedAt?.message}>
        <Input
          type="date"
          {...register("capturedAt", { required: "Date is required" })}
        />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Log balance"}
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
