import { EmptyState } from "@/shared/ui/empty-state";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Settings
      </h1>
      <EmptyState
        title="Nothing to configure yet"
        description="Account management, categories, allocation strategy (the £700/£300 split), and salary history will be editable here as those milestones land."
      />
    </div>
  );
}
