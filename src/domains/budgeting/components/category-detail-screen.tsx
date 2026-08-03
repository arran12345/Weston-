"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Figure } from "@/shared/ui/figure";
import { MonthSelector } from "@/shared/ui/month-selector";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { startOfLocalMonth } from "@/domains/allocation/services/month";
import { flattenTree } from "@/domains/budgeting/services/breakdown";
import {
  TransactionForm,
  type TransactionFormSubmit,
} from "@/domains/budgeting/components/transaction-form";

const UNCATEGORISED = "uncategorised";

type EditingTransaction = TransactionFormSubmit & { id: string };

/**
 * Journey C: drill from a category into the transactions that made it up.
 * `categoryId` may be the sentinel "uncategorised" for the catch-all view.
 */
export function CategoryDetailScreen({ categoryId }: { categoryId: string }) {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");

  const [month, setMonth] = useState(() =>
    startOfLocalMonth(monthParam ? new Date(monthParam) : new Date()),
  );
  const [editing, setEditing] = useState<EditingTransaction | null>(null);

  const utils = trpc.useUtils();
  const isUncategorised = categoryId === UNCATEGORISED;

  const transactions = trpc.budgeting.transactions.useQuery({
    month,
    categoryId: isUncategorised ? null : categoryId,
    uncategorisedOnly: isUncategorised,
  });
  const breakdown = trpc.budgeting.breakdown.useQuery({ month });
  const accounts = trpc.accounts.list.useQuery();

  const invalidate = () => utils.budgeting.invalidate();

  const updateTransaction = trpc.budgeting.updateTransaction.useMutation({
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
  });

  const deleteTransaction = trpc.budgeting.deleteTransaction.useMutation({
    onSuccess: invalidate,
  });

  const node = breakdown.data
    ? flattenTree(breakdown.data.roots).find((row) => row.id === categoryId)
    : undefined;

  const title = isUncategorised ? "Uncategorised" : (node?.name ?? "Category");

  const total = isUncategorised
    ? (breakdown.data?.uncategorisedSpend ?? 0)
    : (node?.totalSpend ?? 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href="/budget"
            className="text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground"
          >
            ← Budget
          </Link>
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="border border-border px-6 py-5">
          <span className="text-xs uppercase tracking-widest text-foreground/50">
            Spent
          </span>
          <Figure className="mt-2 block text-3xl">
            {formatCurrency(total, { fractionDigits: 0 })}
          </Figure>
        </div>
        {!isUncategorised && node?.budget !== null && node?.budget !== undefined ? (
          <>
            <div className="border border-border px-6 py-5">
              <span className="text-xs uppercase tracking-widest text-foreground/50">
                Target
              </span>
              <Figure className="mt-2 block text-3xl">
                {formatCurrency(node.budget, { fractionDigits: 0 })}
              </Figure>
            </div>
            <div className="border border-border px-6 py-5">
              <span className="text-xs uppercase tracking-widest text-foreground/50">
                Variance
              </span>
              <Figure
                sentiment={(node.variance ?? 0) > 0 ? "negative" : "positive"}
                className="mt-2 block text-3xl"
              >
                {(node.variance ?? 0) > 0 ? "+" : ""}
                {formatCurrency(node.variance ?? 0, { fractionDigits: 0 })}
              </Figure>
            </div>
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Transactions
            {!isUncategorised && node && node.children.length > 0
              ? " (including sub-categories)"
              : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 py-0">
          {transactions.isPending ? (
            <div className="h-40 w-full bg-foreground/5" />
          ) : transactions.isError ? (
            <p className="px-6 py-4 text-sm text-negative">
              {transactions.error.message}
            </p>
          ) : transactions.data.length === 0 ? (
            <p className="px-6 py-8 text-sm text-foreground/50">
              No transactions in this category for this month.
            </p>
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <tbody>
                {transactions.data.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-6 py-3">
                      <div className="font-medium">
                        {transaction.description}
                      </div>
                      <div className="text-xs text-foreground/50">
                        {transaction.account.name}
                        {transaction.category
                          ? ` · ${transaction.category.name}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-foreground/60">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Figure
                        sentiment={
                          transaction.amount > 0 ? "positive" : "neutral"
                        }
                      >
                        {formatCurrency(transaction.amount, {
                          currency: transaction.account.currency,
                        })}
                      </Figure>
                    </td>
                    <td className="w-px whitespace-nowrap px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditing({
                              id: transaction.id,
                              accountId: transaction.accountId,
                              categoryId: transaction.categoryId,
                              amount: transaction.amount,
                              date: transaction.date,
                              description: transaction.description,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm("Delete this transaction?")) {
                              deleteTransaction.mutate({ id: transaction.id });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent title="Edit transaction">
          {editing && accounts.data && breakdown.data ? (
            <TransactionForm
              key={editing.id}
              accounts={accounts.data}
              categoryTree={breakdown.data.roots}
              defaultMonth={month}
              defaultValues={editing}
              submitLabel="Save changes"
              isSubmitting={updateTransaction.isPending}
              onSubmit={(values) =>
                updateTransaction.mutate({ id: editing.id, ...values })
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
