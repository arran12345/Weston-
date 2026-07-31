import { router, userProcedure } from "@/server/trpc/trpc";
import {
  createGoalSchema,
  goalIdSchema,
  updateGoalSchema,
} from "@/domains/goals/schemas/goal";
import {
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
} from "@/domains/goals/services/goal-service";

export const goalsRouter = router({
  list: userProcedure.query(({ ctx }) => listGoals(ctx.prisma, ctx.userId)),

  byId: userProcedure
    .input(goalIdSchema)
    .query(({ ctx, input }) => getGoal(ctx.prisma, ctx.userId, input.id)),

  create: userProcedure
    .input(createGoalSchema)
    .mutation(({ ctx, input }) => createGoal(ctx.prisma, ctx.userId, input)),

  update: userProcedure
    .input(updateGoalSchema)
    .mutation(({ ctx, input }) => updateGoal(ctx.prisma, ctx.userId, input)),

  delete: userProcedure
    .input(goalIdSchema)
    .mutation(({ ctx, input }) => deleteGoal(ctx.prisma, ctx.userId, input.id)),
});
