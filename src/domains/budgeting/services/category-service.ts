import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/domains/budgeting/schemas/budgeting";
import { categoryIdsWithDescendants } from "@/domains/budgeting/services/breakdown";

export async function listCategories(prisma: PrismaClient, userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });
}

async function assertOwnedCategory(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const category = await prisma.category.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!category) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  }
}

export async function createCategory(
  prisma: PrismaClient,
  userId: string,
  input: CreateCategoryInput,
) {
  if (input.parentId) {
    await assertOwnedCategory(prisma, userId, input.parentId);
  }

  return prisma.category.create({
    data: {
      userId,
      name: input.name,
      parentId: input.parentId ?? null,
    },
  });
}

export async function updateCategory(
  prisma: PrismaClient,
  userId: string,
  input: UpdateCategoryInput,
) {
  await assertOwnedCategory(prisma, userId, input.id);

  if (input.parentId) {
    await assertOwnedCategory(prisma, userId, input.parentId);

    // Reparenting a category under itself or one of its own descendants
    // would create a cycle the tree builder would have to defend against.
    const categories = await listCategories(prisma, userId);
    const descendants = categoryIdsWithDescendants(categories, input.id);

    if (descendants.includes(input.parentId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A category cannot be moved under itself or its own child",
      });
    }
  }

  return prisma.category.update({
    where: { id: input.id },
    data: { name: input.name, parentId: input.parentId ?? null },
  });
}

/**
 * Deleting a category re-parents its children to its own parent and leaves
 * its transactions uncategorised, rather than cascading the delete — losing
 * transactions because a category was tidied up would be data loss.
 */
export async function deleteCategory(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const category = await prisma.category.findFirst({
    where: { id, userId },
    select: { id: true, parentId: true },
  });

  if (!category) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  }

  await prisma.$transaction([
    prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: category.parentId },
    }),
    prisma.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    }),
    prisma.budget.deleteMany({ where: { categoryId: id } }),
    prisma.category.delete({ where: { id } }),
  ]);

  return { id };
}

/**
 * A starter tree so a fresh Budget screen has something to categorise
 * against — Section 14 wants empty states that offer the obvious next
 * action rather than just reporting emptiness.
 */
const STARTER_CATEGORIES: Array<{ name: string; children: string[] }> = [
  { name: "Food", children: ["Groceries", "Takeaway"] },
  { name: "Housing", children: ["Rent/Mortgage", "Bills", "Council Tax"] },
  { name: "Transport", children: ["Fuel", "Public Transport"] },
  { name: "Lifestyle", children: ["Eating Out", "Subscriptions", "Shopping"] },
  { name: "Income", children: ["Salary"] },
];

export async function createStarterCategories(
  prisma: PrismaClient,
  userId: string,
) {
  const existing = await prisma.category.count({ where: { userId } });

  if (existing > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Categories already exist",
    });
  }

  for (const parent of STARTER_CATEGORIES) {
    await prisma.category.create({
      data: {
        userId,
        name: parent.name,
        children: {
          create: parent.children.map((name) => ({ userId, name })),
        },
      },
    });
  }

  return listCategories(prisma, userId);
}
