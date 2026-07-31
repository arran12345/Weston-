import { GoalType } from "@/generated/prisma/enums";

export { GoalType };

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  [GoalType.HOUSE_DEPOSIT]: "House deposit",
  [GoalType.CUSTOM]: "Custom",
};

export type GoalProgress = {
  /** Sum of the linked accounts' latest balances (debt subtracts). */
  currentAmount: number;
  targetAmount: number;
  /** Never below zero — how much is still needed. */
  remaining: number;
  /** Real percentage; can exceed 100 when a goal is overshot. */
  percentComplete: number;
  isComplete: boolean;
  targetDate: Date | null;
  /** Whole months from today to the target date; negative once overdue. */
  monthsRemaining: number | null;
  /**
   * remaining ÷ monthsRemaining — plain arithmetic, NOT a forecast. It
   * assumes no growth and no further spending, which is why it's labelled
   * as a required contribution rather than a projection (Section 17).
   */
  requiredPerMonth: number | null;
  isOverdue: boolean;
};

export type GoalWithProgress = {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  targetDate: Date | null;
  linkedAccountIds: string[];
  linkedAccountNames: string[];
  progress: GoalProgress;
};

export type LinkedAccountBalance = {
  accountId: string;
  balance: number;
  isDebt: boolean;
};
