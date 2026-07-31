import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import { startOfLocalMonth } from "@/domains/allocation/services/month";
import { buildSpendingBreakdown } from "@/domains/budgeting/services/breakdown";
import { listCategories } from "@/domains/budgeting/services/category-service";
import { loadMonthTransactions } from "@/domains/budgeting/services/transaction-service";
import type { SetBudgetInput } from "@/domains/budgeting/schemas/budgeting";

export async function listBudgets(
  prisma: PrismaClient,
  userId: string,
  month: Date,
) {
  return prisma.budget.findMany({
    where: { userId, period: startOfLocalMonth(month) },
    select: { categoryId: true, monthlyTarget: true },
  });
}

/** The Budget screen's whole payload: tree, spend, targets and variances. */
export async function getMonthlyBreakdown(
  prisma: PrismaClient,
  userId: string,
  month: Date,
) {
  const [categories, transactions, budgets] = await Promise.all([
    listCategories(prisma, userId),
    loadMonthTransactions(prisma, userId, month),
    listBudgets(prisma, userId, month),
  ]);

  return {
    month: startOfLocalMonth(month),
    ...buildSpendingBreakdown(categories, transactions, budgets),
  };
}

/**
 * Targets are per category per month, so changing next month's target never
 * rewrites what a past month was measured against — the same reasoning as
 * the allocation strategy in Milestone 2.
 */
export async function setBudget(
  prisma: PrismaClient,
  userId: string,
  input: SetBudgetInput,
) {
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, userId },
    select: { id: true },
  });

  if (!category) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  }

  const period = startOfLocalMonth(input.month);

  const existing = await prisma.budget.findFirst({
    where: { userId, categoryId: input.categoryId, period },
    select: { id: true },
  });

  if (input.monthlyTarget === null) {
    if (existing) {
      await prisma.budget.delete({ where: { id: existing.id } });
    }
    return { cleared: true as const };
  }

  if (existing) {
    return prisma.budget.update({
      where: { id: existing.id },
      data: { monthlyTarget: input.monthlyTarget },
    });
  }

  return prisma.budget.create({
    data: {
      userId,
      categoryId: input.categoryId,
      period,
      monthlyTarget: input.monthlyTarget,
    },
  });
}
