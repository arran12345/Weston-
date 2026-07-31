import { router, userProcedure } from "@/server/trpc/trpc";
import {
  createCategorySchema,
  createTransactionSchema,
  deleteCategorySchema,
  deleteTransactionSchema,
  listTransactionsSchema,
  monthQuerySchema,
  setBudgetSchema,
  updateCategorySchema,
  updateTransactionSchema,
} from "@/domains/budgeting/schemas/budgeting";
import {
  createCategory,
  createStarterCategories,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/domains/budgeting/services/category-service";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "@/domains/budgeting/services/transaction-service";
import {
  getMonthlyBreakdown,
  setBudget,
} from "@/domains/budgeting/services/budget-service";

export const budgetingRouter = router({
  categories: userProcedure.query(({ ctx }) =>
    listCategories(ctx.prisma, ctx.userId),
  ),

  createCategory: userProcedure
    .input(createCategorySchema)
    .mutation(({ ctx, input }) =>
      createCategory(ctx.prisma, ctx.userId, input),
    ),

  updateCategory: userProcedure
    .input(updateCategorySchema)
    .mutation(({ ctx, input }) =>
      updateCategory(ctx.prisma, ctx.userId, input),
    ),

  deleteCategory: userProcedure
    .input(deleteCategorySchema)
    .mutation(({ ctx, input }) =>
      deleteCategory(ctx.prisma, ctx.userId, input.id),
    ),

  createStarterCategories: userProcedure.mutation(({ ctx }) =>
    createStarterCategories(ctx.prisma, ctx.userId),
  ),

  breakdown: userProcedure
    .input(monthQuerySchema)
    .query(({ ctx, input }) =>
      getMonthlyBreakdown(ctx.prisma, ctx.userId, input.month),
    ),

  setBudget: userProcedure
    .input(setBudgetSchema)
    .mutation(({ ctx, input }) => setBudget(ctx.prisma, ctx.userId, input)),

  transactions: userProcedure
    .input(listTransactionsSchema)
    .query(({ ctx, input }) =>
      listTransactions(ctx.prisma, ctx.userId, input),
    ),

  createTransaction: userProcedure
    .input(createTransactionSchema)
    .mutation(({ ctx, input }) =>
      createTransaction(ctx.prisma, ctx.userId, input),
    ),

  updateTransaction: userProcedure
    .input(updateTransactionSchema)
    .mutation(({ ctx, input }) =>
      updateTransaction(ctx.prisma, ctx.userId, input),
    ),

  deleteTransaction: userProcedure
    .input(deleteTransactionSchema)
    .mutation(({ ctx, input }) =>
      deleteTransaction(ctx.prisma, ctx.userId, input.id),
    ),
});
