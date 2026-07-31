import { EmptyState } from "@/shared/ui/empty-state";

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Accounts — where is my money?
      </h1>
      <EmptyState
        title="No accounts yet"
        description="Savings, investment, current, and debt accounts will live here — balances, per-account history, and manual add/edit. Built in Milestone 1."
      />
    </div>
  );
}
