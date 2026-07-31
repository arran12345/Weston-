import { z } from "zod";

import { router, userProcedure } from "@/server/trpc/trpc";
import {
  createAccountSchema,
  deleteAccountSchema,
  updateAccountSchema,
} from "@/domains/accounts/schemas/account";
import {
  createSnapshotSchema,
  deleteSnapshotSchema,
} from "@/domains/accounts/schemas/snapshot";
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  updateAccount,
} from "@/domains/accounts/services/account-service";
import {
  createSnapshot,
  deleteSnapshot,
} from "@/domains/accounts/services/snapshot-service";

export const accountsRouter = router({
  list: userProcedure.query(({ ctx }) => listAccounts(ctx.prisma, ctx.userId)),

  byId: userProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) => getAccount(ctx.prisma, ctx.userId, input.id)),

  create: userProcedure
    .input(createAccountSchema)
    .mutation(({ ctx, input }) => createAccount(ctx.prisma, ctx.userId, input)),

  update: userProcedure
    .input(updateAccountSchema)
    .mutation(({ ctx, input }) => updateAccount(ctx.prisma, ctx.userId, input)),

  delete: userProcedure
    .input(deleteAccountSchema)
    .mutation(({ ctx, input }) =>
      deleteAccount(ctx.prisma, ctx.userId, input.id),
    ),

  logBalance: userProcedure
    .input(createSnapshotSchema)
    .mutation(({ ctx, input }) => createSnapshot(ctx.prisma, ctx.userId, input)),

  deleteSnapshot: userProcedure
    .input(deleteSnapshotSchema)
    .mutation(({ ctx, input }) =>
      deleteSnapshot(ctx.prisma, ctx.userId, input.id),
    ),
});
