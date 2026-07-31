"use client";

import { useState } from "react";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Figure } from "@/shared/ui/figure";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ORDER,
  AccountType,
  type AccountWithBalance,
} from "@/domains/accounts/types";
import { AccountForm } from "@/domains/accounts/components/account-form";
import { LogBalanceForm } from "@/domains/accounts/components/log-balance-form";

export function AccountsScreen() {
  const utils = trpc.useUtils();
  const accounts = trpc.accounts.list.useQuery();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);
  const [logging, setLogging] = useState<AccountWithBalance | null>(null);

  const invalidate = async () => {
    await Promise.all([
      utils.accounts.list.invalidate(),
      utils.netWorth.invalidate(),
    ]);
  };

  const createAccount = trpc.accounts.create.useMutation({
    onSuccess: async () => {
      setAddOpen(false);
      await invalidate();
    },
  });

  const updateAccount = trpc.accounts.update.useMutation({
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
  });

  const deleteAccount = trpc.accounts.delete.useMutation({
    onSuccess: invalidate,
  });

  const logBalance = trpc.accounts.logBalance.useMutation({
    onSuccess: async () => {
      setLogging(null);
      await invalidate();
    },
  });

  if (accounts.isPending) {
    return <AccountsSkeleton />;
  }

  if (accounts.isError) {
    return (
      <p className="border border-negative px-6 py-4 text-sm text-negative">
        Could not load accounts: {accounts.error.message}
      </p>
    );
  }

  const rows = accounts.data;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
          Accounts — where is my money?
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>Add account</Button>
          </DialogTrigger>
          <DialogContent title="Add account">
            <AccountForm
              submitLabel="Add account"
              isSubmitting={createAccount.isPending}
              onSubmit={(values) => createAccount.mutate(values)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add your savings, investment, current, and debt accounts. Each one holds a history of logged balances — that history is what net worth is calculated from."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {ACCOUNT_TYPE_ORDER.map((type) => {
            const group = rows.filter((account) => account.type === type);
            if (group.length === 0) return null;

            return (
              <AccountGroup
                key={type}
                type={type}
                accounts={group}
                onEdit={setEditing}
                onLog={setLogging}
                onDelete={(id) => deleteAccount.mutate({ id })}
              />
            );
          })}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent title="Edit account">
          {editing ? (
            <AccountForm
              key={editing.id}
              submitLabel="Save changes"
              showOpeningBalance={false}
              isSubmitting={updateAccount.isPending}
              defaultValues={{
                name: editing.name,
                type: editing.type,
                provider: editing.provider ?? "",
                currency: editing.currency,
              }}
              onSubmit={(values) =>
                updateAccount.mutate({
                  id: editing.id,
                  name: values.name,
                  type: values.type,
                  provider: values.provider,
                  currency: values.currency,
                })
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={logging !== null}
        onOpenChange={(open) => !open && setLogging(null)}
      >
        <DialogContent title={`Log balance — ${logging?.name ?? ""}`}>
          {logging ? (
            <LogBalanceForm
              key={logging.id}
              isSubmitting={logBalance.isPending}
              onSubmit={(values) =>
                logBalance.mutate({ accountId: logging.id, ...values })
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountGroup({
  type,
  accounts,
  onEdit,
  onLog,
  onDelete,
}: {
  type: AccountType;
  accounts: AccountWithBalance[];
  onEdit: (account: AccountWithBalance) => void;
  onLog: (account: AccountWithBalance) => void;
  onDelete: (id: string) => void;
}) {
  const isDebt = type === AccountType.DEBT;
  const subtotal = accounts.reduce(
    (total, account) => total + (account.latestBalance ?? 0),
    0,
  );

  return (
    <section className="border border-border">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest">
          {ACCOUNT_TYPE_LABELS[type]}
        </h2>
        <Figure
          className="text-sm"
          sentiment={isDebt && subtotal > 0 ? "negative" : "neutral"}
        >
          {isDebt && subtotal > 0
            ? `−${formatCurrency(subtotal)}`
            : formatCurrency(subtotal)}
        </Figure>
      </header>

      <table className="w-full text-sm">
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-border last:border-b-0">
              <td className="px-6 py-4 align-middle">
                <div className="font-medium">{account.name}</div>
                {account.provider ? (
                  <div className="text-xs text-foreground/50">
                    {account.provider}
                  </div>
                ) : null}
              </td>
              <td className="px-6 py-4 text-right align-middle">
                {account.latestBalance === null ? (
                  <span className="text-xs text-foreground/40">
                    No balance logged
                  </span>
                ) : (
                  <>
                    <Figure
                      className="block"
                      sentiment={isDebt ? "negative" : "neutral"}
                    >
                      {isDebt
                        ? `−${formatCurrency(account.latestBalance, { currency: account.currency })}`
                        : formatCurrency(account.latestBalance, {
                            currency: account.currency,
                          })}
                    </Figure>
                    {account.latestCapturedAt ? (
                      <span className="text-xs text-foreground/40">
                        as of {formatDate(account.latestCapturedAt)}
                      </span>
                    ) : null}
                  </>
                )}
              </td>
              <td className="w-px whitespace-nowrap px-6 py-4 text-right align-middle">
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => onLog(account)}>
                    Log balance
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(account)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete "${account.name}"? Its balance history will be deleted too.`,
                        )
                      ) {
                        onDelete(account.id);
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
    </section>
  );
}

/** Skeleton matching the final layout, per Section 14. */
function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-4 w-64 bg-foreground/10" />
      <div className="border border-border">
        <div className="border-b border-border px-6 py-3">
          <div className="h-3 w-24 bg-foreground/10" />
        </div>
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between border-b border-border px-6 py-6 last:border-b-0"
          >
            <div className="h-4 w-40 bg-foreground/10" />
            <div className="h-4 w-24 bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
