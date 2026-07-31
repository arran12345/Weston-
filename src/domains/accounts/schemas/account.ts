import { z } from "zod";

import { AccountType } from "@/domains/accounts/types";

export const accountTypeSchema = z.enum([
  AccountType.SAVINGS,
  AccountType.INVESTMENT,
  AccountType.CURRENT,
  AccountType.DEBT,
]);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  type: accountTypeSchema,
  provider: z.string().trim().max(80).optional(),
  // Required rather than defaulted so the schema's input and output types
  // match — react-hook-form resolves against the input type.
  currency: z.string().trim().length(3),
  /**
   * Optional opening balance — logged as the account's first snapshot.
   * Debt accounts take a positive "amount owed".
   */
  openingBalance: z.number().finite().optional(),
});

export const updateAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(80),
  type: accountTypeSchema,
  provider: z.string().trim().max(80).optional(),
  currency: z.string().trim().length(3),
});

export const deleteAccountSchema = z.object({
  id: z.string().min(1),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
