import { StrategySettings } from "@/domains/allocation/components/strategy-settings";
import { SalarySettings } from "@/domains/salary/components/salary-settings";
import { CategorySettings } from "@/domains/budgeting/components/category-settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Settings
      </h1>

      <StrategySettings />
      <SalarySettings />
      <CategorySettings />
    </div>
  );
}
