import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import { startOfLocalDay } from "@/domains/accounts/services/captured-at";
import type {
  CreateSalaryInput,
  UpdateSalaryInput,
} from "@/domains/salary/schemas/salary";

/** Salary history, newest first — it's an effective-dated log, not a single value. */
export async function listSalaryRecords(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.salaryRecord.findMany({
    where: { userId },
    orderBy: { effectiveDate: "desc" },
  });
}

/** The salary in effect right now, i.e. the latest record dated on or before today. */
export async function getCurrentSalary(prisma: PrismaClient, userId: string) {
  return prisma.salaryRecord.findFirst({
    where: { userId, effectiveDate: { lte: new Date() } },
    orderBy: { effectiveDate: "desc" },
  });
}

export async function createSalaryRecord(
  prisma: PrismaClient,
  userId: string,
  input: CreateSalaryInput,
) {
  return prisma.salaryRecord.create({
    data: {
      userId,
      amount: input.amount,
      effectiveDate: startOfLocalDay(input.effectiveDate),
      notes: input.notes || null,
    },
  });
}

export async function updateSalaryRecord(
  prisma: PrismaClient,
  userId: string,
  input: UpdateSalaryInput,
) {
  const result = await prisma.salaryRecord.updateMany({
    where: { id: input.id, userId },
    data: {
      amount: input.amount,
      effectiveDate: startOfLocalDay(input.effectiveDate),
      notes: input.notes || null,
    },
  });

  if (result.count === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Salary record not found",
    });
  }

  return prisma.salaryRecord.findFirstOrThrow({
    where: { id: input.id, userId },
  });
}

export async function deleteSalaryRecord(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const result = await prisma.salaryRecord.deleteMany({ where: { id, userId } });

  if (result.count === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Salary record not found",
    });
  }

  return { id };
}
