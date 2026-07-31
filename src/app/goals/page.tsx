import { EmptyState } from "@/shared/ui/empty-state";

export default function GoalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
        Goals — how close am I?
      </h1>
      <EmptyState
        title="No goals yet"
        description="A goal is a target amount and, optionally, a target date — house deposit, emergency fund, or anything else. Progress and trajectory will show here. Built in Milestone 4."
      />
    </div>
  );
}
