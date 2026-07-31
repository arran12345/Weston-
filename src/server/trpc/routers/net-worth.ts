import { router, userProcedure } from "@/server/trpc/trpc";
import {
  getNetWorthHistory,
  getNetWorthSummary,
} from "@/domains/net-worth/services/net-worth-service";

export const netWorthRouter = router({
  summary: userProcedure.query(({ ctx }) =>
    getNetWorthSummary(ctx.prisma, ctx.userId),
  ),

  history: userProcedure.query(({ ctx }) =>
    getNetWorthHistory(ctx.prisma, ctx.userId),
  ),
});
