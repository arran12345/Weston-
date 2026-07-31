import { z } from "zod";

export const updateStrategySchema = z.object({
  savingsAmount: z.number().finite().nonnegative(),
  investmentAmount: z.number().finite().nonnegative(),
});

export const monthSchema = z.object({
  month: z.date(),
});

/**
 * Confirming a month records what actually moved. Planned amounts are seeded
 * from the strategy when the row is first created and are not overwritten
 * afterwards, so a later strategy change never rewrites history.
 */
export const confirmAllocationSchema = z.object({
  month: z.date(),
  actualSavingsAmount: z.number().finite().nonnegative(),
  actualInvestmentAmount: z.number().finite().nonnegative(),
  notes: z.string().trim().max(200).optional(),
});

export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
export type ConfirmAllocationInput = z.infer<typeof confirmAllocationSchema>;
