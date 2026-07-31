import { cn } from "@/shared/lib/cn";
import { progressBarPercent } from "@/domains/goals/services/progress";
import type { GoalProgress } from "@/domains/goals/types";

/**
 * Flat, hard-edged bar — a filled rectangle inside a bordered track, no
 * rounding or gradient (Section 13).
 */
export function GoalProgressBar({
  progress,
  className,
}: {
  progress: GoalProgress;
  className?: string;
}) {
  const percent = progressBarPercent(progress);

  return (
    <div
      className={cn("h-3 w-full border border-border", className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-300",
          progress.isComplete ? "bg-positive" : "bg-foreground",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
