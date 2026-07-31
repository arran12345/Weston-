export type AllocationStatus =
  /** No allocation row for the month yet. */
  | "PLANNED"
  /** Confirmed and actuals matched the plan. */
  | "ON_PLAN"
  /** Confirmed but actuals came in under plan. */
  | "UNDER_PLAN"
  /** Confirmed and actuals came in over plan. */
  | "OVER_PLAN";

export type MonthlyAllocationView = {
  id: string | null;
  month: Date;
  plannedSavingsAmount: number;
  plannedInvestmentAmount: number;
  plannedTotal: number;
  actualSavingsAmount: number | null;
  actualInvestmentAmount: number | null;
  actualTotal: number | null;
  confirmedAt: Date | null;
  notes: string | null;
  status: AllocationStatus;
  /** actual − planned, once confirmed. */
  variance: number | null;
};

export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
  PLANNED: "Not confirmed",
  ON_PLAN: "On plan",
  UNDER_PLAN: "Under plan",
  OVER_PLAN: "Over plan",
};
