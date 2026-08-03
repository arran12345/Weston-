/**
 * Rule-based categorisation (Section 11): merchant/description keyword →
 * category. Deliberately simple and inspectable — Section 17 wants
 * correcting a misclassification to be a fast, first-class interaction, and
 * a rule you can read is one you can fix.
 *
 * Rules are derived from the user's own category names, so they adapt to
 * whatever tree exists rather than assuming a fixed taxonomy.
 */

export type CategoryRef = { id: string; name: string };

/** Keyword → the category name it implies, matched case-insensitively. */
export const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    category: "Groceries",
    keywords: ["tesco", "sainsbury", "aldi", "lidl", "asda", "waitrose", "morrisons", "co-op", "coop"],
  },
  {
    category: "Takeaway",
    keywords: ["deliveroo", "just eat", "justeat", "uber eats", "ubereats"],
  },
  {
    category: "Eating Out",
    keywords: ["restaurant", "cafe", "coffee", "costa", "pret", "starbucks", "nando"],
  },
  {
    category: "Fuel",
    keywords: ["shell", "bp", "esso", "texaco", "petrol"],
  },
  {
    category: "Public Transport",
    keywords: ["tfl", "trainline", "national rail", "railway", "uber trip"],
  },
  {
    category: "Subscriptions",
    keywords: ["netflix", "spotify", "amazon prime", "disney", "icloud", "adobe"],
  },
  {
    category: "Shopping",
    keywords: ["amazon", "argos", "ikea", "john lewis", "ebay"],
  },
  {
    category: "Bills",
    keywords: ["british gas", "octopus energy", "edf", "thames water", "vodafone", "ee", "o2", "sky"],
  },
  {
    category: "Rent/Mortgage",
    keywords: ["rent", "mortgage"],
  },
  {
    category: "Council Tax",
    keywords: ["council tax", "council"],
  },
  {
    category: "Salary",
    keywords: ["salary", "payroll", "wages"],
  },
];

/**
 * Suggests a category id for a description, or null when no rule matches —
 * leaving it uncategorised is better than guessing, since an uncategorised
 * transaction is visible and correctable while a wrong one hides.
 */
/**
 * Keywords match on word boundaries, never as bare substrings. A plain
 * `includes` misfires badly on short keywords: "tfl" is inside "ne(tfl)ix",
 * so NETFLIX.COM was being filed under Public Transport. Boundaries mean
 * "bp" matches "BP GARAGE" but not "ABPQ".
 */
function matchesKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (escaped === "") return false;

  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

export function suggestCategory(
  description: string,
  categories: CategoryRef[],
): string | null {
  const haystack = description.toLowerCase();

  const byName = new Map(
    categories.map((category) => [category.name.toLowerCase(), category.id]),
  );

  for (const rule of KEYWORD_RULES) {
    const categoryId = byName.get(rule.category.toLowerCase());
    if (!categoryId) continue;

    if (rule.keywords.some((keyword) => matchesKeyword(haystack, keyword))) {
      return categoryId;
    }
  }

  // Fall back to a direct name match, so a user-created category called
  // "Gym" catches a "GYM MEMBERSHIP" line without needing a built-in rule.
  for (const category of categories) {
    const name = category.name.toLowerCase();
    if (name.length >= 3 && matchesKeyword(haystack, name)) {
      return category.id;
    }
  }

  return null;
}
