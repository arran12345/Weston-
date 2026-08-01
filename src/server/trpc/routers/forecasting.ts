import { z } from "zod";

import { router, userProcedure } from "@/server/trpc/trpc";
import {
  getGoalForecast,
  getNetWorthForecast,
} from "@/domains/forecasting/services/forecast-service";

const optionsSchema = z.object({
  months: z.number().int().min(1).max(600).optional(),
  annualGrowthRate: z.number().min(-1).max(1).optional(),
  monthlyCashContribution: z.number().finite().nonnegative().optional(),
  monthlyInvestmentContribution: z.number().finite().nonnegative().optional(),
});

export const forecastingRouter = router({
  netWorth: userProcedure
    .input(optionsSchema.optional())
    .query(({ ctx, input }) =>
      getNetWorthForecast(ctx.prisma, ctx.userId, input ?? {}),
    ),

  goal: userProcedure
    .input(optionsSchema.extend({ goalId: z.string().min(1) }))
    .query(({ ctx, input }) => {
      const { goalId, ...options } = input;
      return getGoalForecast(ctx.prisma, ctx.userId, goalId, options);
    }),
});
