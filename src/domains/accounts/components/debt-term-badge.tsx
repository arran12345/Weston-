import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { debtTermStatus } from "@/domains/accounts/services/debt-term";

/**
 * Surfaces a debt's term status. Warning only — no repayment advice, which is
 * an explicit scope cut (Section 4).
 */
export function DebtTermBadge({
  termEndDate,
  interestRatePct,
  className,
}: {
  termEndDate: Date | null;
  interestRatePct: number | null;
  className?: string;
}) {
  const { status, daysRemaining } = debtTermStatus(termEndDate);

  if (status === "NONE") {
    return interestRatePct === null ? null : (
      <span className={cn("text-xs text-foreground/50", className)}>
        {interestRatePct}% interest
      </span>
    );
  }

  const rateLabel =
    interestRatePct === null ? "Term" : `${interestRatePct}% term`;

  if (status === "ENDED") {
    return (
      <span
        className={cn(
          "inline-block border border-negative px-2 py-1 text-xs text-negative",
          className,
        )}
      >
        {rateLabel} ended {formatDate(termEndDate!)}
      </span>
    );
  }

  if (status === "ENDING_SOON") {
    return (
      <span
        className={cn(
          "inline-block border border-negative px-2 py-1 text-xs text-negative",
          className,
        )}
      >
        {rateLabel} ends in {daysRemaining} day{daysRemaining === 1 ? "" : "s"} (
        {formatDate(termEndDate!)})
      </span>
    );
  }

  return (
    <span className={cn("text-xs text-foreground/50", className)}>
      {rateLabel} ends {formatDate(termEndDate!)}
    </span>
  );
}
