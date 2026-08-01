import { describe, expect, it } from "vitest";

import {
  buildSpendingBreakdown,
  categoryIdsWithDescendants,
  flattenTree,
} from "@/domains/budgeting/services/breakdown";
import type { CategoryInput } from "@/domains/budgeting/types";

const cats: CategoryInput[] = [
  { id: "food", name: "Food", parentId: null },
  { id: "groc", name: "Groceries", parentId: "food" },
  { id: "take", name: "Takeaway", parentId: "food" },
  { id: "trans", name: "Transport", parentId: null },
];

/** Outflows are negative — see docs/decisions/0002. */
const out = (categoryId: string | null, amount: number) => ({
  categoryId,
  amount: -amount,
});
const income = (categoryId: string | null, amount: number) => ({
  categoryId,
  amount,
});

describe("buildSpendingBreakdown", () => {
  it("is empty for no categories or transactions", () => {
    const result = buildSpendingBreakdown([], [], []);

    expect(result.roots).toEqual([]);
    expect(result.totalSpend).toBe(0);
  });

  it("rolls child spend up into the parent", () => {
    const result = buildSpendingBreakdown(
      cats,
      [out("groc", 80), out("take", 25), out("food", 10)],
      [],
    );
    const food = result.roots.find((node) => node.id === "food")!;

    expect(food.directSpend).toBe(10);
    expect(food.totalSpend).toBe(115);
    expect(food.transactionCount).toBe(3);
  });

  it("does not double-count rolled-up spend in the grand total", () => {
    const result = buildSpendingBreakdown(
      cats,
      [out("groc", 80), out("take", 25), out("food", 10), out("trans", 40)],
      [],
    );

    expect(result.totalSpend).toBe(155);
  });

  it("nets refunds off against spending", () => {
    const result = buildSpendingBreakdown(
      cats,
      [out("groc", 50), income("groc", 10)],
      [],
    );

    expect(result.roots.find((node) => node.id === "food")!.totalSpend).toBe(40);
  });

  it("shows a net inflow as negative spend rather than clamping to zero", () => {
    const result = buildSpendingBreakdown(
      [{ id: "sal", name: "Salary", parentId: null }],
      [income("sal", 2000)],
      [],
    );

    expect(result.roots[0].totalSpend).toBe(-2000);
  });

  it("sorts roots by spend, biggest first", () => {
    const result = buildSpendingBreakdown(
      cats,
      [out("groc", 80), out("trans", 200)],
      [],
    );

    expect(result.roots.map((node) => node.id)).toEqual(["trans", "food"]);
  });

  describe("uncategorised", () => {
    it("counts transactions with no category", () => {
      const result = buildSpendingBreakdown(cats, [out(null, 30)], []);

      expect(result.uncategorisedSpend).toBe(30);
      expect(result.uncategorisedCount).toBe(1);
    });

    it("treats an unknown category as uncategorised rather than dropping it", () => {
      const result = buildSpendingBreakdown(
        cats,
        [out("deleted-category", 20), out("groc", 5)],
        [],
      );

      expect(result.uncategorisedSpend).toBe(20);
      expect(result.totalSpend).toBe(25);
    });
  });

  describe("malformed trees", () => {
    it("surfaces a category whose parent is missing as a root", () => {
      const result = buildSpendingBreakdown(
        [{ id: "orphan", name: "Orphan", parentId: "gone" }],
        [out("orphan", 12)],
        [],
      );

      expect(result.roots.map((node) => node.id)).toEqual(["orphan"]);
      expect(result.totalSpend).toBe(12);
    });

    it("terminates on a parent cycle instead of recursing forever", () => {
      const result = buildSpendingBreakdown(
        [
          { id: "a", name: "A", parentId: "b" },
          { id: "b", name: "B", parentId: "a" },
        ],
        [out("a", 7)],
        [],
      );

      expect(Array.isArray(result.roots)).toBe(true);
    });
  });

  describe("budget targets", () => {
    it("measures variance against rolled-up spend", () => {
      const result = buildSpendingBreakdown(
        cats,
        [out("groc", 80), out("take", 25), out("food", 10)],
        [{ categoryId: "food", monthlyTarget: 100 }],
      );

      expect(result.roots.find((node) => node.id === "food")!.variance).toBe(15);
    });

    it("leaves variance null without a target", () => {
      const result = buildSpendingBreakdown(cats, [out("trans", 40)], []);

      expect(result.roots.find((node) => node.id === "trans")!.variance).toBeNull();
    });

    // The comparable-totals rule: both sides scoped to the same categories.
    it("excludes unbudgeted and uncategorised spend from the budgeted total", () => {
      const result = buildSpendingBreakdown(
        cats,
        [out("groc", 80), out("trans", 40), out(null, 18)],
        [{ categoryId: "food", monthlyTarget: 100 }],
      );

      expect(result.totalSpend).toBe(138);
      expect(result.budgetedSpend).toBe(80);
      expect(result.totalBudgeted - result.budgetedSpend).toBe(20);
    });

    it("does not double-count a target nested under another target", () => {
      const result = buildSpendingBreakdown(
        cats,
        [out("groc", 80), out("take", 25)],
        [
          { categoryId: "food", monthlyTarget: 100 },
          { categoryId: "groc", monthlyTarget: 60 },
        ],
      );

      expect(result.totalBudgeted).toBe(100);
      expect(result.budgetedSpend).toBe(105);
    });

    it("still shows a nested category's own target and variance", () => {
      const result = buildSpendingBreakdown(
        cats,
        [out("groc", 80), out("take", 25)],
        [
          { categoryId: "food", monthlyTarget: 100 },
          { categoryId: "groc", monthlyTarget: 60 },
        ],
      );
      const groceries = result.roots
        .find((node) => node.id === "food")!
        .children.find((child) => child.id === "groc")!;

      expect(groceries.budget).toBe(60);
      expect(groceries.variance).toBe(20);
    });

    it("counts sibling targets on both sides", () => {
      const result = buildSpendingBreakdown(
        cats,
        [out("groc", 80), out("trans", 40)],
        [
          { categoryId: "food", monthlyTarget: 100 },
          { categoryId: "trans", monthlyTarget: 50 },
        ],
      );

      expect(result.totalBudgeted).toBe(150);
      expect(result.budgetedSpend).toBe(120);
    });
  });
});

describe("flattenTree", () => {
  it("carries nesting depth for indented rendering", () => {
    const result = buildSpendingBreakdown(cats, [out("groc", 1)], []);

    expect(
      flattenTree(result.roots).map((node) => [node.id, node.depth]),
    ).toEqual([
      ["food", 0],
      ["groc", 1],
      ["take", 1],
      ["trans", 0],
    ]);
  });
});

describe("categoryIdsWithDescendants", () => {
  it("includes the category itself and all descendants", () => {
    expect(categoryIdsWithDescendants(cats, "food").sort()).toEqual([
      "food",
      "groc",
      "take",
    ]);
  });

  it("returns just the category when it has no children", () => {
    expect(categoryIdsWithDescendants(cats, "trans")).toEqual(["trans"]);
  });
});
