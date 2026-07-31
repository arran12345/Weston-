import { z } from "zod";

import { GoalType } from "@/domains/goals/types";

export const goalTypeSchema = z.enum([GoalType.HOUSE_DEPOSIT, GoalType.CUSTOM]);

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  type: goalTypeSchema,
  targetAmount: z.number().finite().positive("Target must be more than zero"),
  targetDate: z.date().nullable().optional(),
  /** Accounts whose balances count toward this goal. */
  linkedAccountIds: z.array(z.string().min(1)).default([]),
});

export const updateGoalSchema = createGoalSchema.extend({
  id: z.string().min(1),
});

export const goalIdSchema = z.object({
  id: z.string().min(1),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
