import { z } from "zod";

import { router, userProcedure } from "@/server/trpc/trpc";
import {
  commitImport,
  inspectCsv,
  previewImport,
} from "@/domains/statements/services/import-service";

// Bank exports are small; this bounds a paste that clearly isn't a statement.
const csvSchema = z.string().min(1).max(5_000_000);

const mappingSchema = z
  .object({
    date: z.number().int().min(0),
    description: z.number().int().min(0),
    amount: z.number().int().min(0).optional(),
    debit: z.number().int().min(0).optional(),
    credit: z.number().int().min(0).optional(),
  })
  .refine(
    (mapping) =>
      mapping.amount !== undefined ||
      mapping.debit !== undefined ||
      mapping.credit !== undefined,
    { message: "Map either an amount column or debit/credit columns" },
  );

export const statementsRouter = router({
  inspect: userProcedure
    .input(z.object({ csv: csvSchema }))
    .mutation(({ input }) => inspectCsv(input.csv)),

  preview: userProcedure
    .input(
      z.object({
        accountId: z.string().min(1),
        csv: csvSchema,
        mapping: mappingSchema,
      }),
    )
    .mutation(({ ctx, input }) =>
      previewImport(
        ctx.prisma,
        ctx.userId,
        input.accountId,
        input.csv,
        input.mapping,
      ),
    ),

  commit: userProcedure
    .input(
      z.object({
        accountId: z.string().min(1),
        rows: z
          .array(
            z.object({
              date: z.date(),
              description: z.string().trim().min(1).max(200),
              amount: z.number().finite(),
              categoryId: z.string().min(1).nullable(),
            }),
          )
          .min(1)
          .max(10000),
      }),
    )
    .mutation(({ ctx, input }) =>
      commitImport(ctx.prisma, ctx.userId, input.accountId, input.rows),
    ),
});
