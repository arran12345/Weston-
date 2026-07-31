import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import type { CreateSnapshotInput } from "@/domains/accounts/schemas/snapshot";
import { startOfLocalDay } from "@/domains/accounts/services/captured-at";

async function assertAccountOwned(
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

/** Logs a balance for an account at a point in time. */
export async function createSnapshot(
  prisma: PrismaClient,
  userId: string,
  input: CreateSnapshotInput,
) {
  await assertAccountOwned(prisma, userId, input.accountId);

  return prisma.accountSnapshot.create({
    data: {
      accountId: input.accountId,
      balance: input.balance,
      capturedAt: startOfLocalDay(input.capturedAt),
    },
  });
}

export async function deleteSnapshot(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const snapshot = await prisma.accountSnapshot.findFirst({
    where: { id, account: { userId } },
    select: { id: true },
  });

  if (!snapshot) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Snapshot not found" });
  }

  await prisma.accountSnapshot.delete({ where: { id } });

  return { id };
}
