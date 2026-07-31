import { z } from "zod";

export const createSnapshotSchema = z.object({
  accountId: z.string().min(1),
  /** Debt accounts take a positive "amount owed". */
  balance: z.number().finite(),
  capturedAt: z.date().default(() => new Date()),
});

export const deleteSnapshotSchema = z.object({
  id: z.string().min(1),
});

export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;
