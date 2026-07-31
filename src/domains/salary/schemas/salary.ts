import { z } from "zod";

export const createSalarySchema = z.object({
  amount: z.number().finite().nonnegative(),
  effectiveDate: z.date(),
  notes: z.string().trim().max(200).optional(),
});

export const updateSalarySchema = createSalarySchema.extend({
  id: z.string().min(1),
});

export const deleteSalarySchema = z.object({
  id: z.string().min(1),
});

export type CreateSalaryInput = z.infer<typeof createSalarySchema>;
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>;
