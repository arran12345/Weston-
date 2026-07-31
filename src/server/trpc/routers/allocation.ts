import { router, userProcedure } from "@/server/trpc/trpc";
import {
  confirmAllocationSchema,
  monthSchema,
  updateStrategySchema,
} from "@/domains/allocation/schemas/allocation";
import {
  confirmAllocation,
  getMonthlyAllocation,
  getStrategy,
  listAllocations,
  updateStrategy,
} from "@/domains/allocation/services/allocation-service";

export const allocationRouter = router({
  strategy: userProcedure.query(({ ctx }) =>
    getStrategy(ctx.prisma, ctx.userId),
  ),

  updateStrategy: userProcedure
    .input(updateStrategySchema)
    .mutation(({ ctx, input }) =>
      updateStrategy(ctx.prisma, ctx.userId, input),
    ),

  currentMonth: userProcedure.query(({ ctx }) =>
    getMonthlyAllocation(ctx.prisma, ctx.userId),
  ),

  forMonth: userProcedure
    .input(monthSchema)
    .query(({ ctx, input }) =>
      getMonthlyAllocation(ctx.prisma, ctx.userId, input.month),
    ),

  list: userProcedure.query(({ ctx }) => listAllocations(ctx.prisma, ctx.userId)),

  confirm: userProcedure
    .input(confirmAllocationSchema)
    .mutation(({ ctx, input }) =>
      confirmAllocation(ctx.prisma, ctx.userId, input),
    ),
});
