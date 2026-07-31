import type { PrismaClient } from "@/generated/prisma/client";
import type { SnapshotInput } from "@/domains/net-worth/types";
import {
  buildNetWorthHistory,
  summariseNetWorth,
} from "@/domains/net-worth/services/calculate";

async function loadSnapshots(
  prisma: PrismaClient,
  userId: string,
): Promise<SnapshotInput[]> {
  const rows = await prisma.accountSnapshot.findMany({
    where: { account: { userId } },
    orderBy: [{ capturedAt: "asc" }, { createdAt: "asc" }],
    select: {
      accountId: true,
      balance: true,
      capturedAt: true,
      createdAt: true,
      account: { select: { type: true } },
    },
  });

  return rows.map((row) => ({
    accountId: row.accountId,
    accountType: row.account.type,
    balance: row.balance,
    capturedAt: row.capturedAt,
    createdAt: row.createdAt,
  }));
}

export async function getNetWorthHistory(
  prisma: PrismaClient,
  userId: string,
) {
  return buildNetWorthHistory(await loadSnapshots(prisma, userId));
}

export async function getNetWorthSummary(
  prisma: PrismaClient,
  userId: string,
) {
  const history = buildNetWorthHistory(await loadSnapshots(prisma, userId));
  return summariseNetWorth(history);
}
