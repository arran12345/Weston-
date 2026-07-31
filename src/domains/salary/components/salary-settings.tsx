"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogClose } from "@/shared/ui/dialog";
import { Field, Input } from "@/shared/ui/input";
import { Figure } from "@/shared/ui/figure";
import { formatCurrency, formatDate } from "@/shared/lib/format";

type FormValues = { amount: string; effectiveDate: string; notes: string };

export function SalarySettings() {
  const utils = trpc.useUtils();
  const records = trpc.salary.list.useQuery();
  const [addOpen, setAddOpen] = useState(false);

  const create = trpc.salary.create.useMutation({
    onSuccess: async () => {
      setAddOpen(false);
      await utils.salary.invalidate();
    },
  });

  const remove = trpc.salary.delete.useMutation({
    onSuccess: async () => {
      await utils.salary.invalidate();
    },
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Salary history</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          Log salary
        </Button>
      </CardHeader>

      <CardContent>
        <p className="mb-5 max-w-prose text-sm text-foreground/60">
          An effective-dated log, not a single value — each entry records what
          you earned from that date onward.
        </p>

        {records.isPending ? (
          <div className="h-12 w-full bg-foreground/5" />
        ) : records.isError ? (
          <p className="text-sm text-negative">{records.error.message}</p>
        ) : records.data.length === 0 ? (
          <p className="text-sm text-foreground/50">
            No salary logged yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {records.data.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="py-3">
                    <Figure>{formatCurrency(record.amount)}</Figure>
                    {record.notes ? (
                      <div className="text-xs text-foreground/50">
                        {record.notes}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 text-right text-foreground/60">
                    from {formatDate(record.effectiveDate)}
                  </td>
                  <td className="w-px py-3 pl-6 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Delete this salary record?")) {
                          remove.mutate({ id: record.id });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Log salary">
          <SalaryForm
            isSubmitting={create.isPending}
            onSubmit={(values) => create.mutate(values)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SalaryForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (values: {
    amount: number;
    effectiveDate: Date;
    notes?: string;
  }) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      amount: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          amount: Number(values.amount),
          effectiveDate: new Date(`${values.effectiveDate}T00:00:00`),
          notes: values.notes.trim() || undefined,
        }),
      )}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label="Amount" error={errors.amount?.message}>
        <Input
          type="number"
          step="0.01"
          autoFocus
          {...register("amount", {
            required: "Amount is required",
            validate: (value) =>
              Number.isFinite(Number(value)) || "Must be a number",
          })}
        />
      </Field>

      <Field label="Effective from" error={errors.effectiveDate?.message}>
        <Input
          type="date"
          {...register("effectiveDate", { required: "Date is required" })}
        />
      </Field>

      <Field label="Notes (optional)">
        <Input {...register("notes")} placeholder="e.g. promotion" />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Log salary"}
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
