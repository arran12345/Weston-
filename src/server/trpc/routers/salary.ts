import { router, userProcedure } from "@/server/trpc/trpc";
import {
  createSalarySchema,
  deleteSalarySchema,
  updateSalarySchema,
} from "@/domains/salary/schemas/salary";
import {
  createSalaryRecord,
  deleteSalaryRecord,
  getCurrentSalary,
  listSalaryRecords,
  updateSalaryRecord,
} from "@/domains/salary/services/salary-service";

export const salaryRouter = router({
  list: userProcedure.query(({ ctx }) =>
    listSalaryRecords(ctx.prisma, ctx.userId),
  ),

  current: userProcedure.query(({ ctx }) =>
    getCurrentSalary(ctx.prisma, ctx.userId),
  ),

  create: userProcedure
    .input(createSalarySchema)
    .mutation(({ ctx, input }) =>
      createSalaryRecord(ctx.prisma, ctx.userId, input),
    ),

  update: userProcedure
    .input(updateSalarySchema)
    .mutation(({ ctx, input }) =>
      updateSalaryRecord(ctx.prisma, ctx.userId, input),
    ),

  delete: userProcedure
    .input(deleteSalarySchema)
    .mutation(({ ctx, input }) =>
      deleteSalaryRecord(ctx.prisma, ctx.userId, input.id),
    ),
});
