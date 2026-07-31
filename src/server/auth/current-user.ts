import type { PrismaClient } from "@/generated/prisma/client";

/**
 * There is no auth (docs/PRD.md Section 7 — local, single-user app).
 * Every domain row still hangs off a User so the schema doesn't need to
 * change if this ever becomes multi-user (Section 2, 18); this resolves
 * that single local user, creating it on first run.
 */
const LOCAL_USER_NAME = "Local";

export async function getCurrentUserId(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: { name: LOCAL_USER_NAME },
    select: { id: true },
  });

  return created.id;
}
