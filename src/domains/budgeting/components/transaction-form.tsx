"use client";

import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Field, Input, Select } from "@/shared/ui/input";
import { DialogClose } from "@/shared/ui/dialog";
import { flattenTree } from "@/domains/budgeting/services/breakdown";
import type { CategoryNode } from "@/domains/budgeting/types";

type FormValues = {
  accountId: string;
  categoryId: string;
  amount: string;
  direction: "OUT" | "IN";
  date: string;
  description: string;
};

export type TransactionFormSubmit = {
  accountId: string;
  categoryId: string | null;
  amount: number;
  date: Date;
  description: string;
};

export function TransactionForm({
  accounts,
  categoryTree,
  defaultValues,
  defaultMonth,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  accounts: Array<{ id: string; name: string }>;
  categoryTree: CategoryNode[];
  defaultValues?: Partial<TransactionFormSubmit>;
  defaultMonth: Date;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: TransactionFormSubmit) => void;
}) {
  const initialAmount = defaultValues?.amount;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      accountId: defaultValues?.accountId ?? accounts[0]?.id ?? "",
      categoryId: defaultValues?.categoryId ?? "",
      // Amount is entered as a positive figure with a direction toggle —
      // typing a minus sign to record spending is a needless trap.
      amount:
        initialAmount === undefined ? "" : String(Math.abs(initialAmount)),
      direction: initialAmount !== undefined && initialAmount > 0 ? "IN" : "OUT",
      date: toDateInput(defaultValues?.date ?? defaultOf(defaultMonth)),
      description: defaultValues?.description ?? "",
    },
  });

  const options = flattenTree(categoryTree);

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          accountId: values.accountId,
          categoryId: values.categoryId || null,
          amount:
            values.direction === "OUT"
              ? -Math.abs(Number(values.amount))
              : Math.abs(Number(values.amount)),
          date: new Date(`${values.date}T00:00:00`),
          description: values.description.trim(),
        }),
      )}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label="Description" error={errors.description?.message}>
        <Input
          autoFocus
          placeholder="e.g. Tesco"
          {...register("description", { required: "Description is required" })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount" error={errors.amount?.message}>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("amount", {
              required: "Amount is required",
              validate: (value) =>
                Number.isFinite(Number(value)) || "Must be a number",
            })}
          />
        </Field>

        <Field label="Direction">
          <Select {...register("direction")}>
            <option value="OUT">Money out</option>
            <option value="IN">Money in</option>
          </Select>
        </Field>
      </div>

      <Field label="Account" error={errors.accountId?.message}>
        <Select {...register("accountId", { required: "Account is required" })}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Category">
        <Select {...register("categoryId")}>
          <option value="">Uncategorised</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {"— ".repeat(option.depth)}
              {option.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Date" error={errors.date?.message}>
        <Input type="date" {...register("date", { required: "Date is required" })} />
      </Field>

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

/** Default to today when adding within the current month, else the 1st. */
function defaultOf(month: Date) {
  const today = new Date();
  const sameMonth =
    today.getFullYear() === month.getFullYear() &&
    today.getMonth() === month.getMonth();
  return sameMonth ? today : month;
}

function toDateInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
