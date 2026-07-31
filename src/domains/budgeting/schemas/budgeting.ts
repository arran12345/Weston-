import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  parentId: z.string().min(1).nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().min(1),
});

export const deleteCategorySchema = z.object({
  id: z.string().min(1),
});

export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1).nullable().optional(),
  /** Negative is money out, positive is money in — see budgeting/types.ts. */
  amount: z.number().finite(),
  date: z.date(),
  description: z.string().trim().min(1, "Description is required").max(200),
});

export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().min(1),
});

export const deleteTransactionSchema = z.object({
  id: z.string().min(1),
});

export const listTransactionsSchema = z.object({
  month: z.date(),
  /** Restrict to a category and its descendants (drill-down). */
  categoryId: z.string().min(1).nullable().optional(),
  /** Only transactions with no category. */
  uncategorisedOnly: z.boolean().optional(),
});

export const setBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: z.date(),
  /** Null clears the target for that month. */
  monthlyTarget: z.number().finite().nonnegative().nullable(),
});

export const monthQuerySchema = z.object({
  month: z.date(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
