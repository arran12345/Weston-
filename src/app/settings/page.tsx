import { StrategySettings } from "@/domains/allocation/components/strategy-settings";
import { SalarySettings } from "@/domains/salary/components/salary-settings";
import { EmptyState } from "@/shared/ui/empty-state";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Settings
      </h1>

      <StrategySettings />
      <SalarySettings />

      <EmptyState
        title="Categories"
        description="Spending categories, hierarchical from the start, become editable here once transactions land. Built in Milestone 3."
      />
    </div>
  );
}
