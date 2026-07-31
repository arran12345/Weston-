"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/shared/ui/button";
import { Field, Input, Select } from "@/shared/ui/input";
import { DialogClose } from "@/shared/ui/dialog";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ORDER,
  AccountType,
} from "@/domains/accounts/types";
import {
  createAccountSchema,
  type CreateAccountInput,
} from "@/domains/accounts/schemas/account";

export type AccountFormValues = CreateAccountInput;

export function AccountForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  showOpeningBalance = true,
}: {
  defaultValues?: Partial<AccountFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: AccountFormValues) => void;
  showOpeningBalance?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      type: AccountType.SAVINGS,
      provider: "",
      currency: "GBP",
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label="Name" error={errors.name?.message}>
        <Input {...register("name")} placeholder="e.g. Vanguard S&S ISA" />
      </Field>

      <Field label="Type" error={errors.type?.message}>
        <Select {...register("type")}>
          {ACCOUNT_TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {ACCOUNT_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Provider (optional)" error={errors.provider?.message}>
        <Input {...register("provider")} placeholder="e.g. Vanguard" />
      </Field>

      <Field label="Currency" error={errors.currency?.message}>
        <Input {...register("currency")} maxLength={3} />
      </Field>

      {showOpeningBalance ? (
        <Field
          label="Opening balance (optional)"
          error={errors.openingBalance?.message}
        >
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("openingBalance", {
              setValueAs: (value) =>
                value === "" || value === null ? undefined : Number(value),
            })}
          />
          <span className="block text-xs text-foreground/50">
            Debt accounts take a positive amount owed.
          </span>
        </Field>
      ) : null}

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
