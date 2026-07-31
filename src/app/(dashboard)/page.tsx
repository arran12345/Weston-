import { Figure } from "@/shared/ui/figure";
import { EmptyState } from "@/shared/ui/empty-state";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="border border-border px-8 py-10">
        <h1 className="text-xs font-medium uppercase tracking-widest text-foreground/60">
          Net worth
        </h1>
        <Figure className="mt-4 block text-[80px] leading-none font-semibold">
          &mdash;
        </Figure>
        <p className="mt-4 text-sm text-foreground/70">
          No accounts logged yet. Net worth is calculated from your latest
          account snapshots — add an account to see this number move.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <EmptyState
          title="This month's allocation"
          description="Once you log an account and confirm a monthly allocation, this will show whether your savings/investment split executed as planned."
        />
        <EmptyState
          title="Goal progress"
          description="Create a goal — house deposit or otherwise — to see trajectory and progress here."
        />
      </div>
    </div>
  );
}
