import type {
  BudgetInput,
  CategoryInput,
  CategoryNode,
  SpendingBreakdown,
  TransactionInput,
} from "@/domains/budgeting/types";

/**
 * Builds the category tree with spend rolled up from children to parents.
 *
 * Rollup matters because hierarchy is the point (Section 8): a budget set on
 * "Food" has to account for spending logged against "Groceries" and
 * "Takeaway", or the parent target is meaningless.
 *
 * Pure function over already-loaded rows so it can be verified directly and
 * reused by the budget screen, the drill-down, and later spending trends.
 */
export function buildSpendingBreakdown(
  categories: CategoryInput[],
  transactions: TransactionInput[],
  budgets: BudgetInput[],
): SpendingBreakdown {
  const budgetByCategory = new Map(
    budgets.map((budget) => [budget.categoryId, budget.monthlyTarget]),
  );

  const directSpend = new Map<string, number>();
  const counts = new Map<string, number>();
  let uncategorisedSpend = 0;
  let uncategorisedCount = 0;

  const known = new Set(categories.map((category) => category.id));

  for (const transaction of transactions) {
    // Spend is the negated amount — see the sign convention in types.ts.
    const spend = -transaction.amount;

    // A transaction pointing at a deleted/unknown category is treated as
    // uncategorised rather than silently dropped from the totals.
    if (transaction.categoryId === null || !known.has(transaction.categoryId)) {
      uncategorisedSpend += spend;
      uncategorisedCount += 1;
      continue;
    }

    directSpend.set(
      transaction.categoryId,
      (directSpend.get(transaction.categoryId) ?? 0) + spend,
    );
    counts.set(
      transaction.categoryId,
      (counts.get(transaction.categoryId) ?? 0) + 1,
    );
  }

  const childrenByParent = new Map<string | null, CategoryInput[]>();
  for (const category of categories) {
    // A parent that doesn't exist is treated as a root so the category can
    // still be seen and fixed, rather than vanishing from the tree.
    const parentId =
      category.parentId && known.has(category.parentId)
        ? category.parentId
        : null;

    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(parentId, siblings);
  }

  // Guards against a cycle (A parent of B, B parent of A) recursing forever.
  const visited = new Set<string>();

  // Only the outermost budgeted category on any branch counts toward the
  // comparable totals — see SpendingBreakdown.totalBudgeted.
  let totalBudgeted = 0;
  let budgetedSpend = 0;

  function build(
    category: CategoryInput,
    hasBudgetedAncestor = false,
  ): CategoryNode {
    visited.add(category.id);

    const budget = budgetByCategory.get(category.id) ?? null;
    const countsTowardTotals = budget !== null && !hasBudgetedAncestor;

    const children = (childrenByParent.get(category.id) ?? [])
      .filter((child) => !visited.has(child.id))
      .map((child) =>
        build(child, hasBudgetedAncestor || budget !== null),
      );

    const direct = directSpend.get(category.id) ?? 0;
    const totalSpend = children.reduce(
      (sum, child) => sum + child.totalSpend,
      direct,
    );

    if (countsTowardTotals) {
      totalBudgeted += budget;
      budgetedSpend += totalSpend;
    }

    return {
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      directSpend: direct,
      totalSpend,
      budget,
      variance: budget === null ? null : totalSpend - budget,
      transactionCount: children.reduce(
        (sum, child) => sum + child.transactionCount,
        counts.get(category.id) ?? 0,
      ),
      children,
    };
  }

  const roots = (childrenByParent.get(null) ?? [])
    .filter((category) => !visited.has(category.id))
    .map((category) => build(category))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  return {
    roots,
    // Summing roots (not every node) avoids double-counting rolled-up spend.
    totalSpend:
      roots.reduce((sum, node) => sum + node.totalSpend, 0) +
      uncategorisedSpend,
    totalBudgeted,
    budgetedSpend,
    uncategorisedSpend,
    uncategorisedCount,
  };
}

/** Flattens the tree depth-first, carrying depth for indented rendering. */
export function flattenTree(
  nodes: CategoryNode[],
  depth = 0,
): Array<CategoryNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children, depth + 1),
  ]);
}

/** Every descendant id of a category, including its own — used for drill-down. */
export function categoryIdsWithDescendants(
  categories: CategoryInput[],
  rootId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = childrenByParent.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenByParent.set(category.parentId, siblings);
  }

  const collected: string[] = [];
  const seen = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    collected.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }

  return collected;
}
