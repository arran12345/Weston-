import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  AccountType,
  type AccountWithBalance,
} from "@/domains/accounts/types";
import { startOfLocalDay } from "@/domains/accounts/services/captured-at";
import { listAccounts } from "@/domains/accounts/services/account-service";
import { calculateGoalProgress } from "@/domains/goals/services/progress";
import type {
  GoalWithProgress,
  LinkedAccountBalance,
} from "@/domains/goals/types";
import type {
  CreateGoalInput,
  UpdateGoalInput,
} from "@/domains/goals/schemas/goal";

type GoalRow = {
  id: string;
  name: string;
  type: GoalWithProgress["type"];
  targetAmount: number;
  targetDate: Date | null;
  linkedAccounts: Array<{ accountId: string }>;
};

/**
 * Joined in memory against the accounts list rather than via a nested
 * include: `listAccounts` already resolves each account's latest snapshot,
 * so this reuses that one rule for "current balance" instead of restating
 * it in a second query.
 */
function toView(
  goal: GoalRow,
  accountsById: Map<string, AccountWithBalance>,
): GoalWithProgress {
  const linked = goal.linkedAccounts
    .map((link) => accountsById.get(link.accountId))
    .filter((account): account is AccountWithBalance => account !== undefined);

  const balances: LinkedAccountBalance[] = linked.map((account) => ({
    accountId: account.id,
    // An account with no snapshot yet contributes nothing rather than
    // guessing — same rule as the net worth series.
    balance: account.latestBalance ?? 0,
    isDebt: account.type === AccountType.DEBT,
  }));

  return {
    id: goal.id,
    name: goal.name,
    type: goal.type,
    targetAmount: goal.targetAmount,
    targetDate: goal.targetDate,
    linkedAccountIds: linked.map((account) => account.id),
    linkedAccountNames: linked.map((account) => account.name),
    progress: calculateGoalProgress(
      goal.targetAmount,
      goal.targetDate,
      balances,
    ),
  };
}

async function loadAccountsById(prisma: PrismaClient, userId: string) {
  const accounts = await listAccounts(prisma, userId);
  return new Map(accounts.map((account) => [account.id, account]));
}

export async function listGoals(
  prisma: PrismaClient,
  userId: string,
): Promise<GoalWithProgress[]> {
  const [goals, accountsById] = await Promise.all([
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { linkedAccounts: { select: { accountId: true } } },
    }),
    loadAccountsById(prisma, userId),
  ]);

  return goals.map((goal) => toView(goal, accountsById));
}

export async function getGoal(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<GoalWithProgress> {
  const [goal, accountsById] = await Promise.all([
    prisma.goal.findFirst({
      where: { id, userId },
      include: { linkedAccounts: { select: { accountId: true } } },
    }),
    loadAccountsById(prisma, userId),
  ]);

  if (!goal) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
  }

  return toView(goal, accountsById);
}

/** Rejects account ids that aren't this user's, rather than silently dropping them. */
async function assertOwnedAccounts(
  prisma: PrismaClient,
  userId: string,
  accountIds: string[],
) {
  if (accountIds.length === 0) return;

  const owned = await prisma.account.count({
    where: { id: { in: accountIds }, userId },
  });

  if (owned !== new Set(accountIds).size) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "One or more accounts not found",
    });
  }
}

export async function createGoal(
  prisma: PrismaClient,
  userId: string,
  input: CreateGoalInput,
) {
  await assertOwnedAccounts(prisma, userId, input.linkedAccountIds);

  return prisma.goal.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate
        ? startOfLocalDay(input.targetDate)
        : null,
      linkedAccounts: {
        create: input.linkedAccountIds.map((accountId) => ({ accountId })),
      },
    },
  });
}

export async function updateGoal(
  prisma: PrismaClient,
  userId: string,
  input: UpdateGoalInput,
) {
  const existing = await prisma.goal.findFirst({
    where: { id: input.id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
  }

  await assertOwnedAccounts(prisma, userId, input.linkedAccountIds);

  // Links are replaced wholesale — simpler and less error-prone than
  // diffing, and the set is tiny.
  return prisma.$transaction(async (tx) => {
    await tx.goalAccount.deleteMany({ where: { goalId: input.id } });

    return tx.goal.update({
      where: { id: input.id },
      data: {
        name: input.name,
        type: input.type,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate
          ? startOfLocalDay(input.targetDate)
          : null,
        linkedAccounts: {
          create: input.linkedAccountIds.map((accountId) => ({ accountId })),
        },
      },
    });
  });
}

export async function deleteGoal(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const result = await prisma.goal.deleteMany({ where: { id, userId } });

  if (result.count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
  }

  return { id };
}
