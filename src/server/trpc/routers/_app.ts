import { router, publicProcedure } from "@/server/trpc/trpc";
import { accountsRouter } from "@/server/trpc/routers/accounts";
import { netWorthRouter } from "@/server/trpc/routers/net-worth";
import { salaryRouter } from "@/server/trpc/routers/salary";
import { allocationRouter } from "@/server/trpc/routers/allocation";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const })),
  accounts: accountsRouter,
  netWorth: netWorthRouter,
  salary: salaryRouter,
  allocation: allocationRouter,
});

export type AppRouter = typeof appRouter;
