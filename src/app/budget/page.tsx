import { EmptyState } from "@/shared/ui/empty-state";

export default function BudgetPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Budget — where is my money going?
      </h1>
      <EmptyState
        title="No transactions or categories yet"
        description="Category breakdowns, budget targets vs. actuals, and spending trends will live here. Built in Milestone 3."
      />
    </div>
  );
}
