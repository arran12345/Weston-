"use client";

import { useState } from "react";
import Link from "next/link";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Figure } from "@/shared/ui/figure";
import { MonthSelector } from "@/shared/ui/month-selector";
import { Input } from "@/shared/ui/input";
import { formatCurrency } from "@/shared/lib/format";
import { startOfLocalMonth } from "@/domains/allocation/services/month";
import { flattenTree } from "@/domains/budgeting/services/breakdown";
import type { CategoryNode } from "@/domains/budgeting/types";
import {
  TransactionForm,
  type TransactionFormSubmit,
} from "@/domains/budgeting/components/transaction-form";

export function BudgetScreen() {
  const utils = trpc.useUtils();
  const [month, setMonth] = useState(() => startOfLocalMonth(new Date()));
  const [addOpen, setAddOpen] = useState(false);

  const breakdown = trpc.budgeting.breakdown.useQuery({ month });
  const accounts = trpc.accounts.list.useQuery();

  const invalidate = () => utils.budgeting.invalidate();

  const createTransaction = trpc.budgeting.createTransaction.useMutation({
    onSuccess: async () => {
      setAddOpen(false);
      await invalidate();
    },
  });

  const createStarter = trpc.budgeting.createStarterCategories.useMutation({
    onSuccess: invalidate,
  });

  const setBudget = trpc.budgeting.setBudget.useMutation({
    onSuccess: invalidate,
  });

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Budget — where is my money going?
      </h1>
      <div className="flex items-center gap-4">
        <MonthSelector month={month} onChange={setMonth} />
        <Button
          onClick={() => setAddOpen(true)}
          disabled={!accounts.data || accounts.data.length === 0}
        >
          Add transaction
        </Button>
      </div>
    </div>
  );

  if (breakdown.isPending) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="h-64 w-full border border-border bg-foreground/5" />
      </div>
    );
  }

  if (breakdown.isError) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <p className="border border-negative px-6 py-4 text-sm text-negative">
          {breakdown.error.message}
        </p>
      </div>
    );
  }

  const data = breakdown.data;
  const rows = flattenTree(data.roots);
  const hasCategories = rows.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Totals label="Spent (all)" value={data.totalSpend} />
        <Totals
          label="Budgeted"
          value={data.totalBudgeted}
          // Spend is scoped to budgeted categories so the two are comparable.
          caption={
            data.totalBudgeted > 0
              ? `${formatCurrency(data.budgetedSpend, { fractionDigits: 0 })} spent against targets`
              : "No targets set"
          }
        />
        <Totals
          label="Left in budget"
          value={data.totalBudgeted - data.budgetedSpend}
          sentiment={
            data.totalBudgeted === 0
              ? "neutral"
              : data.totalBudgeted - data.budgetedSpend < 0
                ? "negative"
                : "positive"
          }
        />
      </div>

      {!hasCategories ? (
        <div className="flex flex-col gap-4 border border-border px-6 py-8">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            No categories yet
          </h2>
          <p className="max-w-prose text-sm text-foreground/70">
            Categories are how spending gets grouped, and they nest — a target
            on &ldquo;Food&rdquo; counts everything under Groceries and
            Takeaway too. Start from a standard set and edit it, or build your
            own in Settings.
          </p>
          <Button
            className="w-fit"
            disabled={createStarter.isPending}
            onClick={() => createStarter.mutate()}
          >
            {createStarter.isPending ? "Creating…" : "Create starter categories"}
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-widest text-foreground/50">
                  <th className="px-6 py-3 text-left font-medium">Category</th>
                  <th className="px-6 py-3 text-right font-medium">Spent</th>
                  <th className="px-6 py-3 text-right font-medium">Target</th>
                  <th className="px-6 py-3 text-right font-medium">Variance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <CategoryRow
                    key={row.id}
                    row={row}
                    month={month}
                    onSetBudget={(target) =>
                      setBudget.mutate({
                        categoryId: row.id,
                        month,
                        monthlyTarget: target,
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data.uncategorisedCount > 0 ? (
        <Link
          href={`/budget/uncategorised?month=${month.toISOString()}`}
          className="flex items-center justify-between border border-border px-6 py-4 text-sm transition-colors hover:bg-foreground/5"
        >
          <span>
            {data.uncategorisedCount} uncategorised transaction
            {data.uncategorisedCount === 1 ? "" : "s"} — categorise them to see
            them in the breakdown
          </span>
          <Figure>{formatCurrency(data.uncategorisedSpend)}</Figure>
        </Link>
      ) : null}

      {accounts.data && accounts.data.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Transactions belong to an account, so add one first."
          action={{ label: "Go to accounts", href: "/accounts" }}
        />
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add transaction">
          {accounts.data && accounts.data.length > 0 ? (
            <TransactionForm
              accounts={accounts.data}
              categoryTree={data.roots}
              defaultMonth={month}
              submitLabel="Add transaction"
              isSubmitting={createTransaction.isPending}
              onSubmit={(values: TransactionFormSubmit) =>
                createTransaction.mutate(values)
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Totals({
  label,
  value,
  sentiment = "neutral",
  caption,
}: {
  label: string;
  value: number;
  sentiment?: "neutral" | "positive" | "negative";
  caption?: string;
}) {
  return (
    <div className="border border-border px-6 py-5">
      <span className="text-xs uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      <Figure sentiment={sentiment} className="mt-2 block text-3xl">
        {formatCurrency(value, { fractionDigits: 0 })}
      </Figure>
      {caption ? (
        <span className="mt-2 block text-xs text-foreground/40">{caption}</span>
      ) : null}
    </div>
  );
}

function CategoryRow({
  row,
  month,
  onSetBudget,
}: {
  row: CategoryNode & { depth: number };
  month: Date;
  onSetBudget: (target: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.budget === null ? "" : String(row.budget));

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && !Number.isFinite(next)) return;
    if (next === row.budget) return;
    onSetBudget(next);
  };

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-6 py-3">
        <Link
          href={`/budget/${row.id}?month=${month.toISOString()}`}
          className="hover:underline"
          style={{ paddingLeft: `${row.depth * 20}px` }}
        >
          {row.name}
        </Link>
        {row.transactionCount > 0 ? (
          <span className="ml-2 text-xs text-foreground/40">
            {row.transactionCount}
          </span>
        ) : null}
      </td>

      <td className="px-6 py-3 text-right">
        <Figure>{formatCurrency(row.totalSpend)}</Figure>
      </td>

      <td className="px-6 py-3 text-right">
        {editing ? (
          <Input
            autoFocus
            type="number"
            step="0.01"
            className="h-8 w-28 text-right"
            value={draft}
            aria-label={`Target for ${row.name}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            aria-label={`Set target for ${row.name}`}
            className="text-foreground/70 hover:text-foreground hover:underline"
            onClick={() => {
              setDraft(row.budget === null ? "" : String(row.budget));
              setEditing(true);
            }}
          >
            {row.budget === null ? (
              <span className="text-foreground/30">Set</span>
            ) : (
              <Figure>{formatCurrency(row.budget)}</Figure>
            )}
          </button>
        )}
      </td>

      <td className="px-6 py-3 text-right">
        {row.variance === null ? (
          <span className="text-foreground/30">—</span>
        ) : (
          <Figure sentiment={row.variance > 0 ? "negative" : "positive"}>
            {row.variance > 0 ? "+" : ""}
            {formatCurrency(row.variance)}
          </Figure>
        )}
      </td>
    </tr>
  );
}
