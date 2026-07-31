import { EmptyState } from "@/shared/ui/empty-state";

export default function ForecastsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Forecasts — where will I be?
      </h1>
      <EmptyState
        title="No projection yet"
        description="A deterministic net worth projection, plus scenario comparisons against your allocation assumptions. Built in Milestones 5–6."
      />
    </div>
  );
}
