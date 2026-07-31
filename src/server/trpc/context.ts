import { prisma } from "@/server/db/client";

export function createTRPCContext() {
  return { prisma };
}

export type TRPCContext = ReturnType<typeof createTRPCContext>;
