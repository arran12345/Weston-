import { AccountType } from "@/generated/prisma/enums";

export { AccountType };

/**
 * Debt balances are entered and stored as a positive "amount owed" and
 * subtracted when net worth is calculated — see net-worth/services.
 */
export const ASSET_ACCOUNT_TYPES = [
  AccountType.SAVINGS,
  AccountType.INVESTMENT,
  AccountType.CURRENT,
] as const;

export function isDebtAccount(type: AccountType) {
  return type === AccountType.DEBT;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.SAVINGS]: "Savings",
  [AccountType.INVESTMENT]: "Investment",
  [AccountType.CURRENT]: "Current",
  [AccountType.DEBT]: "Debt",
};

/** Display order on the Accounts screen — assets first, debt last. */
export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  AccountType.SAVINGS,
  AccountType.INVESTMENT,
  AccountType.CURRENT,
  AccountType.DEBT,
];

export type AccountWithBalance = {
  id: string;
  name: string;
  type: AccountType;
  provider: string | null;
  currency: string;
  /** Latest snapshot balance, or null if no balance has been logged yet. */
  latestBalance: number | null;
  latestCapturedAt: Date | null;
};
