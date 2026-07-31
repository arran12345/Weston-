# 0002 — Transaction sign convention and budget rollup

**Status:** Accepted (Milestone 3)
**Relates to:** PRD Section 8 (hierarchical categories), Section 11 (CSV import),
Section 14 (Budget screen)

## Transaction amounts: negative is money out

`Transaction.amount` stores outflows as negative and inflows as positive.

This matches how bank CSV exports almost universally represent transactions,
which matters because Milestone 7 imports those files directly — storing the
opposite convention would mean a translation layer at the import boundary and
a standing source of sign bugs.

"Spend" for budgeting is therefore the *negated* sum of a category's
transactions. A £50 purchase (−50) plus a £10 refund (+10) nets to £40 of
spending, which is the correct answer and falls out of the arithmetic rather
than needing special handling.

A category that nets positive (income) shows **negative spend**. This is
deliberately not clamped to zero — clamping would hide the fact that money
came in, and the whole point of the app is not lying about the numbers.

**Entry is separate from storage.** The transaction form takes a positive
amount plus a Money in/Money out toggle. Requiring a typed minus sign to
record ordinary spending would be a trap, but the storage convention stays
strict.

## Budgets roll up to parent categories

Hierarchy exists so a target on "Food" covers "Groceries" and "Takeaway"
(Section 8). Each category node therefore carries both `directSpend` (its
own transactions) and `totalSpend` (itself plus all descendants), and
variance is measured against `totalSpend`.

## The screen totals compare like with like

`totalSpend` is every category's spend plus uncategorised — the real monthly
outflow.

`totalBudgeted` and `budgetedSpend` are summed over the **top-most budgeted
categories only**: a budgeted category with no budgeted ancestor. If both
"Food" and its child "Groceries" carry targets, counting both would
double-count the child's spend on one side and its target on the other.

This matters for the header tiles. Comparing total spend against total
targets is misleading whenever some spending is uncategorised or falls in
categories with no target — the first version of this screen showed
"Remaining −£27" for a month whose only budget was £9 over, because it was
subtracting unbudgeted and uncategorised spending from a single £100 target.
Scoping both sides to the same set makes "Left in budget" mean what it says.

Individual category rows still show their own target and variance regardless
of nesting; the constraint applies only to the aggregate.

## Deleting a category never deletes transactions

Deleting a category re-parents its children to its own parent and sets its
transactions' `categoryId` to null, leaving them uncategorised and visible
in the catch-all view. Cascading the delete would mean tidying up a category
list silently destroys financial history.
