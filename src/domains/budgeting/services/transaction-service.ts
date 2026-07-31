import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import { startOfLocalDay } from "@/domains/accounts/services/captured-at";
import { startOfLocalMonth } from "@/domains/allocation/services/month";
import { categoryIdsWithDescendants } from "@/domains/budgeting/services/breakdown";
import { listCategories } from "@/domains/budgeting/services/category-service";
import type {
  CreateTransactionInput,
  ListTransactionsInput,
  UpdateTransactionInput,
} from "@/domains/budgeting/schemas/budgeting";

export function monthRange(month: Date) {
  const start = startOfLocalMonth(month);
  const end = startOfLocalMonth(month);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

async function assertOwnedAccount(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });

  if (!account) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
  }
}

async function assertOwnedCategory(
  prisma: PrismaClient,
  userId: string,
  categoryId: string,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });

  if (!category) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  }
}

/** Transactions for a month, optionally narrowed to a category subtree. */
export async function listTransactions(
  prisma: PrismaClient,
  userId: string,
  input: ListTransactionsInput,
) {
  const { start, end } = monthRange(input.month);

  let categoryFilter: { categoryId?: { in: string[] } | null } = {};

  if (input.uncategorisedOnly) {
    categoryFilter = { categoryId: null };
  } else if (input.categoryId) {
    const categories = await listCategories(prisma, userId);
    categoryFilter = {
      categoryId: {
        in: categoryIdsWithDescendants(categories, input.categoryId),
      },
    };
  }

  return prisma.transaction.findMany({
    where: {
      account: { userId },
      date: { gte: start, lt: end },
      ...categoryFilter,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      account: { select: { id: true, name: true, currency: true } },
      category: { select: { id: true, name: true } },
    },
  });
}

/** Raw rows for the breakdown — kept lean since it only needs two fields. */
export async function loadMonthTransactions(
  prisma: PrismaClient,
  userId: string,
  month: Date,
) {
  const { start, end } = monthRange(month);

  return prisma.transaction.findMany({
    where: { account: { userId }, date: { gte: start, lt: end } },
    select: { categoryId: true, amount: true },
  });
}

export async function createTransaction(
  prisma: PrismaClient,
  userId: string,
  input: CreateTransactionInput,
) {
  await assertOwnedAccount(prisma, userId, input.accountId);
  if (input.categoryId) {
    await assertOwnedCategory(prisma, userId, input.categoryId);
  }

  return prisma.transaction.create({
    data: {
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      amount: input.amount,
      date: startOfLocalDay(input.date),
      description: input.description,
      source: "MANUAL",
    },
  });
}

export async function updateTransaction(
  prisma: PrismaClient,
  userId: string,
  input: UpdateTransactionInput,
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: input.id, account: { userId } },
    select: { id: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
  }

  await assertOwnedAccount(prisma, userId, input.accountId);
  if (input.categoryId) {
    await assertOwnedCategory(prisma, userId, input.categoryId);
  }

  return prisma.transaction.update({
    where: { id: input.id },
    data: {
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      amount: input.amount,
      date: startOfLocalDay(input.date),
      description: input.description,
    },
  });
}

export async function deleteTransaction(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const result = await prisma.transaction.deleteMany({
    where: { id, account: { userId } },
  });

  if (result.count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
  }

  return { id };
}
