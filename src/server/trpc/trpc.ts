import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import type { TRPCContext } from "@/server/trpc/context";
import { getCurrentUserId } from "@/server/auth/current-user";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Resolves the single local user (Section 7 — no auth). Procedures that
 * touch user-owned data use this instead of `publicProcedure` so the user
 * row is only created when domain data is actually accessed.
 */
export const userProcedure = t.procedure.use(async ({ ctx, next }) => {
  const userId = await getCurrentUserId(ctx.prisma);
  return next({ ctx: { ...ctx, userId } });
});
