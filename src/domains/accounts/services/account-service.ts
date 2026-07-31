import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import { AccountType, type AccountWithBalance } from "@/domains/accounts/types";
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "@/domains/accounts/schemas/account";
import { startOfLocalDay } from "@/domains/accounts/services/captured-at";

/**
 * Lists accounts with their latest logged balance. The balance is read from
 * the most recent AccountSnapshot rather than stored on the account, so the
 * history stays a genuine time series (docs/PRD.md Section 8).
 */
export async function listAccounts(
  prisma: PrismaClient,
  userId: string,
): Promise<AccountWithBalance[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      snapshots: {
        orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });

  return accounts.map((account) => {
    const latest = account.snapshots[0];
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      provider: account.provider,
      currency: account.currency,
      latestBalance: latest?.balance ?? null,
      latestCapturedAt: latest?.capturedAt ?? null,
      interestRatePct: account.interestRatePct,
      termEndDate: account.termEndDate,
    };
  });
}

export async function getAccount(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const account = await prisma.account.findFirst({
    where: { id, userId },
    include: {
      snapshots: {
        orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!account) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
  }

  return account;
}

/**
 * Debt terms only mean anything on a DEBT account — clear them otherwise so
 * changing an account's type can't leave a stale term behind.
 */
function debtTermFields(input: {
  type: AccountType;
  interestRatePct?: number;
  termEndDate?: Date;
}) {
  if (input.type !== AccountType.DEBT) {
    return { interestRatePct: null, termEndDate: null };
  }

  return {
    interestRatePct: input.interestRatePct ?? null,
    termEndDate: input.termEndDate ? startOfLocalDay(input.termEndDate) : null,
  };
}

export async function createAccount(
  prisma: PrismaClient,
  userId: string,
  input: CreateAccountInput,
) {
  const { openingBalance, interestRatePct, termEndDate, ...accountData } =
    input;

  return prisma.account.create({
    data: {
      ...accountData,
      ...debtTermFields({ type: input.type, interestRatePct, termEndDate }),
      provider: accountData.provider || null,
      userId,
      snapshots:
        openingBalance === undefined
          ? undefined
          : {
              create: {
                balance: openingBalance,
                capturedAt: startOfLocalDay(new Date()),
              },
            },
    },
  });
}

export async function updateAccount(
  prisma: PrismaClient,
  userId: string,
  input: UpdateAccountInput,
) {
  const { id, interestRatePct, termEndDate, ...data } = input;

  // Scope the write to this user — updateMany so a mismatched userId is a
  // no-op rather than an update of someone else's row.
  const result = await prisma.account.updateMany({
    where: { id, userId },
    data: {
      ...data,
      ...debtTermFields({ type: input.type, interestRatePct, termEndDate }),
      provider: data.provider || null,
    },
  });

  if (result.count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
  }

  return prisma.account.findFirstOrThrow({ where: { id, userId } });
}

/** Deleting an account cascades to its snapshots and transactions. */
export async function deleteAccount(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const result = await prisma.account.deleteMany({ where: { id, userId } });

  if (result.count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
  }

  return { id };
}
