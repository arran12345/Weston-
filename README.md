# Finance OS

A local, single-user net-worth-first personal finance tool. See `docs/PRD.md`
for the full product/design spec.

## Stack

Next.js (App Router) + TypeScript, tRPC, Prisma + SQLite, Tailwind CSS,
React Query, Zod, Zustand, Recharts. All local — no hosting, no external
services. See `docs/PRD.md` Section 7.

## Getting started

```bash
npm install
npm run db:migrate   # applies the Prisma schema to a local SQLite file
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `src/app` — routing only (Next.js App Router)
- `src/domains` — business logic, one folder per domain (accounts, goals, etc.)
- `src/shared` — cross-domain UI primitives, hooks, and lib code
- `src/server` — tRPC router composition, Prisma client, auth
- `prisma/schema.prisma` — database schema

See `docs/PRD.md` Section 6 for the full folder structure rationale.
