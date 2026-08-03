import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@/generated/prisma/client";
import { listCategories } from "@/domains/budgeting/services/category-service";
import { readCsv } from "@/domains/statements/services/parse-csv";
import {
  duplicateKey,
  normaliseRows,
  partitionDuplicates,
  type ColumnMapping,
} from "@/domains/statements/services/normalise";
import { suggestCategory } from "@/domains/statements/services/categorise";

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

/** Just the headers and a few rows, so column mapping can be chosen. */
export function inspectCsv(csv: string, sampleSize = 5) {
  const { headers, rows } = readCsv(csv);

  return {
    headers,
    sample: rows.slice(0, sampleSize),
    totalRows: rows.length,
  };
}

/**
 * Everything the confirmation step needs to show before anything is written:
 * what will import, what was already there, and what couldn't be read.
 * Nothing is persisted here — Section 11 makes this a confirmed step.
 */
export async function previewImport(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
  csv: string,
  mapping: ColumnMapping,
) {
  await assertOwnedAccount(prisma, userId, accountId);

  const { rows } = readCsv(csv);
  const { rows: normalised, errors } = normaliseRows(rows, mapping);

  // Existing keys are scoped to this account, so the same transaction in a
  // different account isn't treated as a duplicate.
  const existing = await prisma.transaction.findMany({
    where: { accountId },
    select: { date: true, amount: true, description: true },
  });

  const existingKeys = new Set(
    existing.map((transaction) =>
      duplicateKey(
        accountId,
        transaction.date,
        transaction.amount,
        transaction.description,
      ),
    ),
  );

  const { toImport, duplicates } = partitionDuplicates(
    normalised,
    accountId,
    existingKeys,
  );

  const categories = await listCategories(prisma, userId);

  return {
    errors,
    duplicateCount: duplicates.length,
    duplicates: duplicates.slice(0, 20),
    rows: toImport.map((row) => ({
      ...row,
      suggestedCategoryId: suggestCategory(row.description, categories),
    })),
  };
}

export type ImportRow = {
  date: Date;
  description: string;
  amount: number;
  categoryId: string | null;
};

/**
 * Writes the confirmed rows. Duplicate detection runs again here rather than
 * trusting the preview: the preview may be minutes old, and re-checking is
 * cheap next to importing a transaction twice.
 */
export async function commitImport(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
  rows: ImportRow[],
) {
  await assertOwnedAccount(prisma, userId, accountId);

  const existing = await prisma.transaction.findMany({
    where: { accountId },
    select: { date: true, amount: true, description: true },
  });

  const existingKeys = new Set(
    existing.map((transaction) =>
      duplicateKey(
        accountId,
        transaction.date,
        transaction.amount,
        transaction.description,
      ),
    ),
  );

  const { toImport, duplicates } = partitionDuplicates(
    rows.map((row, rowIndex) => ({ ...row, rowIndex })),
    accountId,
    existingKeys,
  );

  const categoryByKey = new Map(
    rows.map((row) => [
      duplicateKey(accountId, row.date, row.amount, row.description),
      row.categoryId,
    ]),
  );

  if (toImport.length > 0) {
    await prisma.transaction.createMany({
      data: toImport.map((row) => ({
        accountId,
        date: row.date,
        description: row.description,
        amount: row.amount,
        categoryId:
          categoryByKey.get(
            duplicateKey(accountId, row.date, row.amount, row.description),
          ) ?? null,
        source: "IMPORT" as const,
      })),
    });
  }

  return {
    imported: toImport.length,
    skippedAsDuplicate: duplicates.length,
  };
}
