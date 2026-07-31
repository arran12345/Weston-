import { router, publicProcedure } from "@/server/trpc/trpc";
import { accountsRouter } from "@/server/trpc/routers/accounts";
import { netWorthRouter } from "@/server/trpc/routers/net-worth";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const })),
  accounts: accountsRouter,
  netWorth: netWorthRouter,
});

export type AppRouter = typeof appRouter;
