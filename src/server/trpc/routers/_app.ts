import { router, publicProcedure } from "@/server/trpc/trpc";
import { accountsRouter } from "@/server/trpc/routers/accounts";
import { netWorthRouter } from "@/server/trpc/routers/net-worth";
import { salaryRouter } from "@/server/trpc/routers/salary";
import { allocationRouter } from "@/server/trpc/routers/allocation";
import { budgetingRouter } from "@/server/trpc/routers/budgeting";
import { goalsRouter } from "@/server/trpc/routers/goals";
import { forecastingRouter } from "@/server/trpc/routers/forecasting";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const })),
  accounts: accountsRouter,
  netWorth: netWorthRouter,
  salary: salaryRouter,
  allocation: allocationRouter,
  budgeting: budgetingRouter,
  goals: goalsRouter,
  forecasting: forecastingRouter,
});

export type AppRouter = typeof appRouter;
