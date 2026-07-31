"use client";

import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Field, Input, Select } from "@/shared/ui/input";
import { DialogClose } from "@/shared/ui/dialog";
import { GOAL_TYPE_LABELS, GoalType } from "@/domains/goals/types";

type FormValues = {
  name: string;
  type: GoalType;
  targetAmount: string;
  targetDate: string;
};

export type GoalFormSubmit = {
  name: string;
  type: GoalType;
  targetAmount: number;
  targetDate: Date | null;
  linkedAccountIds: string[];
};

export function GoalForm({
  accounts,
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  accounts: Array<{ id: string; name: string }>;
  defaultValues?: Partial<GoalFormSubmit>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: GoalFormSubmit) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: defaultValues?.type ?? GoalType.HOUSE_DEPOSIT,
      targetAmount:
        defaultValues?.targetAmount === undefined
          ? ""
          : String(defaultValues.targetAmount),
      targetDate: defaultValues?.targetDate
        ? toDateInput(defaultValues.targetDate)
        : "",
    },
  });

  const linkedDefaults = new Set(defaultValues?.linkedAccountIds ?? []);

  return (
    <form
      onSubmit={handleSubmit((values, event) => {
        // Checkbox group is read from the form directly — react-hook-form
        // arrays add ceremony for no benefit at this size.
        const formData = new FormData(event?.target as HTMLFormElement);
        const linkedAccountIds = formData.getAll("linkedAccountIds") as string[];

        onSubmit({
          name: values.name.trim(),
          type: values.type,
          targetAmount: Number(values.targetAmount),
          targetDate: values.targetDate
            ? new Date(`${values.targetDate}T00:00:00`)
            : null,
          linkedAccountIds,
        });
      })}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label="Name" error={errors.name?.message}>
        <Input
          autoFocus
          placeholder="e.g. House deposit"
          {...register("name", { required: "Name is required" })}
        />
      </Field>

      <Field label="Type">
        <Select {...register("type")}>
          {Object.values(GoalType).map((type) => (
            <option key={type} value={type}>
              {GOAL_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Target amount" error={errors.targetAmount?.message}>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...register("targetAmount", {
            required: "Target is required",
            validate: (value) =>
              Number(value) > 0 || "Target must be more than zero",
          })}
        />
      </Field>

      <Field label="Target date (optional)">
        <Input type="date" {...register("targetDate")} />
        <span className="block text-xs text-foreground/50">
          Leave blank for a goal with no deadline.
        </span>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-foreground/60">
          Accounts counting toward this goal
        </legend>
        {accounts.length === 0 ? (
          <p className="text-xs text-foreground/50">
            No accounts yet — add one first and progress will track its balance.
          </p>
        ) : (
          accounts.map((account) => (
            <label
              key={account.id}
              className="flex items-center gap-3 text-sm"
            >
              <input
                type="checkbox"
                name="linkedAccountIds"
                value={account.id}
                defaultChecked={linkedDefaults.has(account.id)}
                className="size-4 accent-white"
              />
              {account.name}
            </label>
          ))
        )}
      </fieldset>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
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

function toDateInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
