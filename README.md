# Finance OS

A local, single-user net-worth-first personal finance tool. See `docs/PRD.md`
for the full product/design spec.

## Stack

Next.js (App Router) + TypeScript, tRPC, Prisma + SQLite, Tailwind CSS,
React Query, Zod, Zustand, Recharts. All local — no hosting, no external
services. See `docs/PRD.md` Section 7.

## Getting started

Requires Node 20 or newer.

```bash
cp .env.example .env   # sets DATABASE_URL; required before migrating
npm install
npm run db:migrate     # creates prisma/dev.db from the schema
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). There's no login — it's a
single-user local app (PRD Section 7).

To run it as a build rather than in dev mode:

```bash
npm run build && npm start
```

### First run

The app starts empty. A sensible order:

1. **Accounts** — add your savings, investment, current and debt accounts with
   their current balances. Net worth appears on the dashboard immediately.
2. **Settings** — set the monthly allocation split and log your salary.
3. **Budget** — create the starter categories, then add transactions or import
   a CSV from your bank.
4. **Goals** — create a goal and link the accounts that count toward it.
5. **Forecasts** — projections run off your balances and allocation strategy.

Log a balance again each month; net worth history is built from those
snapshots, so the trend and forecasts get better the more you log.

## Other commands

```bash
npm test          # domain logic tests
npm run test:watch
npm run lint
npm run db:studio # browse the database
```

## Backups

The whole database is one file: `prisma/dev.db`. Copy it somewhere safe
periodically — that's the entire backup story (PRD Section 17).

## Project layout

- `src/app` — routing only (Next.js App Router)
- `src/domains` — business logic, one folder per domain (accounts, goals, etc.)
- `src/shared` — cross-domain UI primitives, hooks, and lib code
- `src/server` — tRPC router composition, Prisma client, auth
- `prisma/schema.prisma` — database schema

See `docs/PRD.md` Section 6 for the full folder structure rationale.
