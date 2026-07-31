/**
 * Sign convention for Transaction.amount: **negative is money out, positive
 * is money in** — the way bank CSV exports almost universally represent it,
 * so the Milestone 7 importer needs no conversion layer.
 *
 * "Spend" for budgeting purposes is therefore the negated sum of a
 * category's transactions: a £50 purchase (−50) plus a £10 refund (+10)
 * nets to £40 of spending. A category that nets positive shows negative
 * spend, which is the honest reading rather than something to clamp at zero.
 */

export type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  /** Spend on this category itself, excluding descendants. */
  directSpend: number;
  /** directSpend plus every descendant's totalSpend. */
  totalSpend: number;
  /** Monthly target for this category, if one is set for the period. */
  budget: number | null;
  /** totalSpend − budget; positive means over budget. Null without a budget. */
  variance: number | null;
  transactionCount: number;
  children: CategoryNode[];
};

export type SpendingBreakdown = {
  roots: CategoryNode[];
  /** Every category's spend plus uncategorised — the true monthly outflow. */
  totalSpend: number;
  /**
   * Targets and their matching spend, summed over the *top-most* budgeted
   * categories only. If both "Food" and its child "Groceries" carry targets,
   * counting both would double-count the child's spend on one side and its
   * target on the other, so only the outermost budgeted category counts.
   * These two are therefore always comparable to each other.
   */
  totalBudgeted: number;
  budgetedSpend: number;
  /** Spend on transactions with no category assigned. */
  uncategorisedSpend: number;
  uncategorisedCount: number;
};

export type TransactionInput = {
  categoryId: string | null;
  amount: number;
};

export type CategoryInput = {
  id: string;
  name: string;
  parentId: string | null;
};

export type BudgetInput = {
  categoryId: string;
  monthlyTarget: number;
};
