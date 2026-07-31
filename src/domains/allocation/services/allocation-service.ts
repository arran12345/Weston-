import type { PrismaClient } from "@/generated/prisma/client";
import type { MonthlyAllocationModel } from "@/generated/prisma/models";
import type {
  AllocationStatus,
  MonthlyAllocationView,
} from "@/domains/allocation/types";
import type {
  ConfirmAllocationInput,
  UpdateStrategyInput,
} from "@/domains/allocation/schemas/allocation";
import {
  currentMonth,
  startOfLocalMonth,
} from "@/domains/allocation/services/month";

/**
 * The strategy the PRD builds around (Section 1: "£700 → savings, £300 →
 * investments"). Used until the user edits it in Settings, so the concept is
 * visible from day one rather than starting at zero.
 */
export const DEFAULT_STRATEGY = {
  savingsAmount: 700,
  investmentAmount: 300,
} as const;

export async function getStrategy(prisma: PrismaClient, userId: string) {
  const stored = await prisma.allocationStrategy.findUnique({
    where: { userId },
  });

  return {
    savingsAmount: stored?.savingsAmount ?? DEFAULT_STRATEGY.savingsAmount,
    investmentAmount:
      stored?.investmentAmount ?? DEFAULT_STRATEGY.investmentAmount,
    isCustomised: stored !== null,
  };
}

export async function updateStrategy(
  prisma: PrismaClient,
  userId: string,
  input: UpdateStrategyInput,
) {
  return prisma.allocationStrategy.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
}

/** Floats: treat anything under half a penny as equal. */
const EPSILON = 0.005;

function statusFor(
  allocation: MonthlyAllocationModel | null,
  variance: number | null,
): AllocationStatus {
  if (!allocation?.confirmedAt || variance === null) return "PLANNED";
  if (Math.abs(variance) < EPSILON) return "ON_PLAN";
  return variance < 0 ? "UNDER_PLAN" : "OVER_PLAN";
}

function buildView(
  month: Date,
  allocation: MonthlyAllocationModel | null,
  strategy: { savingsAmount: number; investmentAmount: number },
): MonthlyAllocationView {
  // A month with no row yet is shown as planned against the current
  // strategy — nothing is written until it's actually confirmed.
  const plannedSavingsAmount =
    allocation?.plannedSavingsAmount ?? strategy.savingsAmount;
  const plannedInvestmentAmount =
    allocation?.plannedInvestmentAmount ?? strategy.investmentAmount;
  const plannedTotal = plannedSavingsAmount + plannedInvestmentAmount;

  const actualSavingsAmount = allocation?.actualSavingsAmount ?? null;
  const actualInvestmentAmount = allocation?.actualInvestmentAmount ?? null;
  const actualTotal =
    actualSavingsAmount === null && actualInvestmentAmount === null
      ? null
      : (actualSavingsAmount ?? 0) + (actualInvestmentAmount ?? 0);

  const variance = actualTotal === null ? null : actualTotal - plannedTotal;

  return {
    id: allocation?.id ?? null,
    month,
    plannedSavingsAmount,
    plannedInvestmentAmount,
    plannedTotal,
    actualSavingsAmount,
    actualInvestmentAmount,
    actualTotal,
    confirmedAt: allocation?.confirmedAt ?? null,
    notes: allocation?.notes ?? null,
    status: statusFor(allocation, variance),
    variance,
  };
}

export async function getMonthlyAllocation(
  prisma: PrismaClient,
  userId: string,
  month: Date = currentMonth(),
): Promise<MonthlyAllocationView> {
  const normalisedMonth = startOfLocalMonth(month);

  const [allocation, strategy] = await Promise.all([
    prisma.monthlyAllocation.findFirst({
      where: { userId, month: normalisedMonth },
    }),
    getStrategy(prisma, userId),
  ]);

  return buildView(normalisedMonth, allocation, strategy);
}

/** Allocation history, newest month first. */
export async function listAllocations(
  prisma: PrismaClient,
  userId: string,
): Promise<MonthlyAllocationView[]> {
  const [allocations, strategy] = await Promise.all([
    prisma.monthlyAllocation.findMany({
      where: { userId },
      orderBy: { month: "desc" },
    }),
    getStrategy(prisma, userId),
  ]);

  return allocations.map((allocation) =>
    buildView(allocation.month, allocation, strategy),
  );
}

/**
 * Records what actually moved for a month. Planned amounts are frozen at the
 * strategy in force when the row is first created, so editing the strategy
 * later never rewrites what a past month was measured against.
 */
export async function confirmAllocation(
  prisma: PrismaClient,
  userId: string,
  input: ConfirmAllocationInput,
) {
  const month = startOfLocalMonth(input.month);
  const strategy = await getStrategy(prisma, userId);

  const existing = await prisma.monthlyAllocation.findFirst({
    where: { userId, month },
    select: { id: true },
  });

  if (existing) {
    return prisma.monthlyAllocation.update({
      where: { id: existing.id },
      data: {
        actualSavingsAmount: input.actualSavingsAmount,
        actualInvestmentAmount: input.actualInvestmentAmount,
        notes: input.notes || null,
        confirmedAt: new Date(),
      },
    });
  }

  return prisma.monthlyAllocation.create({
    data: {
      userId,
      month,
      plannedSavingsAmount: strategy.savingsAmount,
      plannedInvestmentAmount: strategy.investmentAmount,
      actualSavingsAmount: input.actualSavingsAmount,
      actualInvestmentAmount: input.actualInvestmentAmount,
      notes: input.notes || null,
      confirmedAt: new Date(),
    },
  });
}
