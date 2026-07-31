# Finance OS
## Product Requirements Document & Software Design Document — v1.0
**Status:** Foundation document — pre-implementation
**Scope:** Planning and architecture only. No code in this session.

---

## 0. How to read this document

This is a founding document, not a spec frozen in stone. Sections 1–4 are product
thinking. Sections 5–15 are architecture. Sections 16–18 are how we sequence and de-risk
the build. Wherever your original brief and my recommendation diverge, I've said so
explicitly and explained why — you make the final call, but I'm not going to silently
architect around a decision I think is wrong.

Two decisions in here matter more than the rest and are worth reading carefully even
if you skim everything else:

1. **This is a local, single-user tool — not a hosted product.** (Section 7)
2. **Net worth, not budgeting, is the organising concept of the whole app.** (Section 1)

**Note on AI:** cut from the product entirely — you're using Cowork as your AI layer
rather than building AI into Finance OS itself. No AI provider integration, no
insight jobs, no AI-specific schema or UI. Section 10 is a short note, not a design
section.

**Note on statement import:** simplified to manual CSV upload rather than a live
Open Banking integration (TrueLayer). Given this runs locally for one person, not as
a hosted product, the OAuth consent flow, third-party API dependency, and ongoing
account management that Open Banking requires isn't worth the complexity — occasional
CSV export from your bank app and upload is a much smaller surface area for the value
it delivers. See Section 11.

---

## 1. Product Vision

### The actual problem

You don't need software that recreates a spreadsheet. A spreadsheet already does
arithmetic fine. What a spreadsheet *can't* do is:

- Answer "how am I doing?" in under two seconds, without you opening a file and
  remembering which tab has the latest numbers.
- Enforce a strategy automatically (£700 → savings, £300 → investments) instead of
  relying on you to move the money and log it correctly every month.
- Show you the future, not just the past — a spreadsheet is a ledger, not a forecast.
- Survive contact with real, messy financial data (multiple accounts, irregular income,
  statements) without you manually reconciling everything.

So the vision isn't "digital spreadsheet." It's: **a system that tells you the truth
about your money faster than you could work it out yourself, and shows you where a
decision today leads in five years.**

### Positioning

Closer to **Trading 212's clarity** and **Linear's speed** than to Mint/YNAB's
category-obsessed budgeting-first model. Budgeting is one feature among many here, not
the spine of the product. The spine is **net worth over time**.

### Why net worth is the organising concept, not budgeting

This is the first place I'd challenge the framing in your brief. You listed budgeting
and net worth as parallel features. I don't think they're parallel — I think net worth
is the parent metric and everything else (savings, investments, debt, budget adherence)
is an input to it.

Reasoning: your own strategy proves this. You're not optimising "stay under £X on
groceries this month" — you're optimising "£1,000/month moved into appreciating assets,
debt left alone because it's free money." That's a net-worth-first mental model, not a
budget-first one. If the dashboard's hero number is "you spent £340 on takeaways this
month," it's answering the wrong question for how you actually think about money.
If the hero number is "net worth: £X, +£Y this month, on track for £Z by [house deposit
date]," that matches your actual strategy.

**Decision:** Net worth is the dashboard's primary metric. Budgeting exists as a
supporting feature (spending visibility) but is not the app's identity.

### Target user (see Section 2) implication

Because you're the only user for the foreseeable future, we can build for *your*
strategy specifically rather than a generic "everyone budgets differently" abstraction.
That's a real advantage — most personal finance apps have to be neutral about strategy.
We don't. We can bake "debt is deprioritised deliberately, allocation is 70/30
savings/investment" in as a first-class, visible concept rather than something you'd
configure in settings and never look at again.

---

## 2. Target User

**Primary (and only, for v1–v3): you.**

Profile: technically capable, engineering background, comfortable with data and
structure, currently using spreadsheets, wants automation without losing visibility
into the underlying numbers (i.e. not a black box). Values speed and clarity over
hand-holding. Wants the tool to have opinions (recommend, flag, challenge) rather than
be a passive ledger.

This matters architecturally: **we are not designing for a novice**. We don't need
extensive onboarding flows, tooltips explaining what "net worth" means, or a simplified
mode. We can show real numbers, real charts, and real detail from screen one. This
simplifies the UI work considerably and is worth stating explicitly so we don't
accidentally build hand-holding UX that has no user.

**Future user (v4+, if this ever becomes multi-user):** someone financially literate
but not necessarily an engineer — a partner, a friend, eventually possibly a small
paid product. We shouldn't design *for* this user yet, but we shouldn't design
anything in the architecture that makes multi-tenancy retroactively painful either
(see Section 6, Section 8).

---

## 3. Core User Journeys

These are the flows the whole architecture has to serve well. If a technical decision
makes one of these worse, that's a strong signal to reconsider it.

### Journey A — "How am I doing?" (daily/weekly check-in, <10 seconds)
Open app → see net worth, trend, and whether this month's £1,000 allocation happened →
close app. This has to be near-instant. No spinners on the number that matters most.

### Journey B — Monthly close-out (once a month, ~5 minutes)
Log salary for the month → confirm £700/£300 split executed → see updated net worth →
see updated house deposit progress → see any budget categories that ran hot.

### Journey C — "Where did my money go?" (occasional, investigative)
Something felt expensive this month → open Budget/Spending → drill from category into
transactions → identify the cause.

### Journey D — Goal planning ("when can I afford a house?")
Open Goals → house deposit goal → see current trajectory vs. target date → adjust an
assumption (e.g. "what if I saved £900 instead of £700?") → see the forecast update.

### Journey E — Statement import (periodic, currently manual/spreadsheet-driven pain)
Connect or upload → transactions appear categorised → confirm/correct a few edge cases
→ done. This is the journey most likely to feel bad if we get the architecture wrong,
which is why Section 11 gets its own deep treatment.

---

## 4. Feature Breakdown

Organised by the milestone tier they belong to (full sequencing in Section 16), not by
your original list order — grouping this way makes the dependency chain visible.

### Tier 1 — Foundation (must exist before anything else is useful)
- Authentication & single-user account
- Accounts (manual: savings, investment, current, debt)
- Net worth calculation & history (time-series snapshot)
- Dashboard (net worth hero metric + trend)

### Tier 2 — Core tracking
- Salary history (log income over time)
- Monthly allocation tracking (the £700/£300 split, logged or confirmed monthly)
- Debt tracking (balance, 0% terms/end date, *not* a repayment planner — see below)
- Manual transaction entry + categories
- Basic budgeting (category targets vs. actuals)

### Tier 3 — Goals & forecasting
- Goal engine (generic — house deposit is the first instance, not a special case)
- Forecasting engine (deterministic net worth projection)
- Scenario comparison ("what if" adjustments)

### Tier 4 — Automation
- Statement/transaction import (Open Banking — see Section 11)
- Automatic categorisation
- Spending analysis & trends

### Two deliberate scope cuts
**Debt repayment planning is explicitly out of scope as a "planner."** You've already
made the strategic call — 0% debt, not prioritised, cash performs better invested.
Building a debt-payoff optimiser (snowball/avalanche calculators etc.) would be
solving a problem you've already solved. We track the debt (balance, term end date,
so you get warned before it stops being 0%) but we don't build a feature to help you
decide *whether* to pay it off. If that strategic decision changes, that's a future
feature, not a v1 one.

**No built-in AI.** No in-app insights engine, no chat assistant. You're using Cowork
as the AI layer for this project — analysis, one-off questions, ad-hoc changes — so
Finance OS itself stays a clean data application: input, storage, calculation,
visualisation. This also removes a real chunk of complexity (Section 10) and a
recurring cost/latency risk (Section 17) that would otherwise need managing.

---

## 5. Application Architecture

### High-level shape

```
┌─────────────────────────────────────────────┐
│         Client (Next.js App — runs locally)     │
│  - Server Components for data-heavy screens    │
│  - Client Components for interactive widgets   │
└───────────────────┬─────────────────────────┘
                    │ tRPC (typed RPC, no REST boilerplate)
┌───────────────────▼─────────────────────────┐
│              Application Layer                 │
│  - Domain services (accounts, goals, forecast) │
│  - Validation (zod schemas shared client/server)│
│  - CSV import/parsing (Section 11)             │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│         Data Layer (Prisma ORM + SQLite)       │
│              — single local file                │
└─────────────────────────────────────────────┘
```

No external services, no third-party API dependency, no network calls except your own
machine talking to itself. That's a deliberate consequence of "local, single-user,
never published" — the architecture has no reason to reach outside your computer.

### Why this shape

**Modular monolith, not microservices.** You are one user. Microservices solve
organisational and scaling problems you don't have and won't have for years, if ever.
A monolith with clean internal domain boundaries (Section 7 folder structure) gives you
90% of the maintainability benefit of microservices with none of the operational
overhead (multiple deployments, network calls between services, distributed debugging).
If this ever needs to scale to many users, the domain boundaries we set up now are
exactly what you'd split along later — so we're not sacrificing future scalability,
just not paying for it prematurely.

**tRPC over a REST API.** Because client and server are both TypeScript in this
architecture, tRPC gives end-to-end type safety with no schema duplication, no OpenAPI
generation step, and no risk of client/server drifting out of sync. The cost is that
it's TypeScript-only — but nothing in your requirements needs a non-TS client, so that
constraint costs nothing today.

**Server Components for data display, Client Components for interaction.** Dashboard,
net worth history, transaction lists — these are read-heavy and benefit from rendering
on the server (faster first paint, less client JS). Forms, the scenario planner sliders,
anything with local interactive state — these are client components. This isn't
dogma, it's just "render where the work naturally happens."

---

## 6. Folder Structure

Domain-first, not type-first. The failure mode of a type-first structure
(`/components`, `/hooks`, `/utils` as flat top-level folders) is that as the app grows,
every folder becomes a junk drawer with 40 unrelated files and no clear ownership.
Domain-first means everything related to "goals" lives together, and someone (you, six
months from now) can find and reason about a whole feature in one place.

```
finance-os/
├── src/
│   ├── app/                          # Next.js App Router — routing only
│   │   ├── (dashboard)/
│   │   ├── accounts/
│   │   ├── budget/
│   │   ├── goals/
│   │   ├── forecasts/
│   │   ├── ai/
│   │   └── settings/
│   │
│   ├── domains/                      # Business logic, organised by domain
│   │   ├── accounts/
│   │   │   ├── services/             # server-side business logic
│   │   │   ├── components/           # domain-specific UI
│   │   │   ├── schemas/              # zod validation, shared client/server
│   │   │   └── types.ts
│   │   ├── net-worth/
│   │   ├── budgeting/
│   │   ├── goals/
│   │   ├── forecasting/
│   │   ├── statements/               # import + categorisation
│   │   └── salary/
│   │
│   ├── shared/                       # Genuinely cross-domain only
│   │   ├── ui/                       # design system primitives (Button, Card, etc.)
│   │   ├── charts/                   # reusable chart wrappers
│   │   ├── hooks/
│   │   └── lib/                      # date/currency formatting, etc.
│   │
│   ├── server/
│   │   ├── trpc/                     # router composition, context
│   │   ├── db/                       # Prisma client, migrations
│   │   └── auth/
│   │
│   └── styles/                       # design tokens, Tailwind config
│
├── prisma/
│   └── schema.prisma
│
└── docs/                              # living documentation (Section 19 references this)
    ├── architecture.md
    ├── roadmap.md
    ├── changelog.md
    └── decisions/                     # one file per significant architectural decision
```

**Rule of thumb going forward:** if a piece of code is used by exactly one domain, it
lives in that domain's folder. It only graduates to `shared/` once a second domain
needs it. This avoids premature abstraction — don't build the shared version until
there are two real callers.

---

## 7. Technology Stack Recommendations

### Local-only changes the calculus

You've told me two things that matter a lot here: this runs on your machine only, and
it's never going to have a second user. That removes real complexity from the stack
I'd otherwise recommend — no cloud hosting, no production auth system, no multi-tenant
database service. Building those anyway would be solving problems you don't have.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Still the right call even running locally — `npm run dev` (or a simple local production build) is all you need; no code changes vs. a hosted setup. |
| API layer | **tRPC** | End-to-end type safety, no schema duplication — same reasoning as before, unaffected by local-only. |
| Database | **SQLite** (via Prisma) | Cloud Postgres (Supabase/Neon) was solving "multiple users, hosted uptime" — problems you don't have. SQLite is a single file on disk, zero setup, zero ongoing service, trivially backed up (copy the file). If this ever becomes multi-user or hosted, Prisma makes migrating to Postgres later a config change, not a rewrite — so nothing is lost by starting simple. |
| ORM | **Prisma** | Type-safe queries, painless migrations, and the SQLite→Postgres portability mentioned above. |
| Auth | **None (v1), or a single local passphrase gate at most** | Clerk/Auth.js were solving "who is this user, keep others out" — irrelevant on a local single-machine app only you access. Skip it entirely unless you want a lightweight lock screen; don't build real multi-user auth infrastructure for a problem that doesn't exist. |
| Styling | **Tailwind CSS + shadcn/ui** | Unaffected by local-only — still the right choice for a fast, fully custom, accessible UI. |
| Charts | **Recharts** | Unaffected — covers net worth trends, allocation breakdowns, forecasts. |
| Validation | **Zod** | Unaffected — shared schemas between forms and server input validation. |
| Background jobs | **Cut** | Was needed for scheduled Open Banking syncs and AI insight generation — both now cut. Monthly net worth snapshots can just be a manual "log this month" action, or a simple scheduled task if you want it later, not infrastructure to build now. |
| Statement import | **Manual CSV upload** | See Section 11 — replaces the Open Banking integration originally recommended. |
| Hosting | **None — runs locally** | `npm run build && npm start` on your machine, or run in dev mode. No Vercel, no deployment pipeline, no environment secrets to manage for a hosted service that doesn't exist. |

**What this simplifies vs. the original recommendation:** no third-party accounts to
set up (Supabase, Vercel, TrueLayer, Anthropic API), no hosting costs, no OAuth flows,
no background job runner. The whole stack is now: Next.js + SQLite + Prisma, running
on your machine. That's a meaningfully smaller thing to build and maintain.

---

## 8. Database Design

Core entities and relationships — not a full schema, but the shape that everything
else depends on.

```
User
 ├── Account (1-to-many)
 │     type: savings | investment | current | debt
 │     provider, name, currency, is_manual
 │
 ├── AccountSnapshot (1-to-many, per Account)
 │     balance, captured_at
 │     → this is how net worth history is built: a time series, not a
 │       recalculated-from-scratch number
 │
 ├── Transaction (1-to-many, per Account)
 │     amount, date, description, category_id, source (manual|import)
 │
 ├── Category (1-to-many, hierarchical: parent_category_id)
 │
 ├── Budget (1-to-many)
 │     category_id, monthly_target, period
 │
 ├── SalaryRecord (1-to-many)
 │     amount, effective_date, notes
 │
 ├── MonthlyAllocation (1-to-many)
 │     month, savings_amount, investment_amount, actual_vs_planned
 │
 └── Goal (1-to-many)
       type: house_deposit | custom
       target_amount, target_date, linked_account_ids[]
```

### Key design decisions worth explaining

**Net worth is derived, never stored as a single mutable field.** It's computed from
the latest `AccountSnapshot` per account, summed. This means net worth history is a
genuine time series (queryable, chartable, auditable) rather than a single number that
gets overwritten and loses its past. This is the single most important schema decision
in the whole app — get this wrong and forecasting, goal tracking, and the dashboard
trend all become harder or impossible to build well later.

**Transactions reference accounts, not the other way round.** Standard, but worth
stating: an account doesn't "contain" a list, it's the parent in a foreign key
relationship. This is what makes multi-account aggregation (net worth, spending across
accounts) a straightforward query rather than app-level merging of separate lists.

**Categories are hierarchical from day one.** Even in v1 with basic budgeting, model
`Category` with a self-referencing `parent_category_id` (e.g. "Food" → "Groceries" /
"Takeaway"). Retrofitting hierarchy into a flat category table later means migrating
every existing transaction. Cheap to build in now, expensive to bolt on later.

**Goals are generic, house deposit is an instance.** Rather than a `HouseDepositGoal`
table, `Goal` is generic with a `type` field and optional metadata. This means "save
for a car," "emergency fund target," or anything you think of in six months is a new
`Goal` row, not a schema migration and a new UI section.

---

## 9. State Management Strategy

Three distinct kinds of state, three distinct tools — resist the urge to reach for one
global store for everything, which is the most common state-management mistake in
apps like this.

1. **Server state (the vast majority of this app's data: accounts, transactions,
   goals, net worth history)** → **React Query** (via tRPC's built-in integration).
   This isn't really "client state" at all — it's a cached, synced view of server data.
   Treating it as such gets you caching, background refetching, and optimistic updates
   for free.

2. **Form state** → **react-hook-form + zod**. Local to the form, validated against
   the same schema the server uses. Never lifted into global state — a form for adding
   a transaction has no business being readable from an unrelated part of the app.

3. **Ephemeral UI state** (modal open/closed, selected date range on a chart, sidebar
   collapsed) → **local component state** (`useState`) or, where genuinely shared
   across distant components, a small **Zustand** store. This should be a short list —
   if you find yourself putting server data into Zustand, that's a sign the boundary
   has blurred.

**No Redux.** Redux solves problems (large teams, complex client-only state graphs,
time-travel debugging needs) this project doesn't have. React Query + narrow local
state covers everything here with far less boilerplate.

---

## 10. AI Strategy — Cowork, Not In-App AI

Cut from product scope. No AI provider integration, no insight-generation jobs, no
chat UI, no AI-specific schema.

Finance OS's job is to be a clean, well-modelled data application — input, storage,
calculation, visualisation, forecasting. Cowork (or Claude directly) is where the
actual thinking happens: querying the database, spotting trends, making one-off
changes, answering "what does this mean" questions. That division keeps the app
itself simple and dependency-light, and keeps the AI layer flexible — it can evolve
independently of the product without a schema migration or a new domain.

If this ever changes (e.g. you want in-app insights without leaving Finance OS), the
groundwork in Section 8 — clean, well-typed data with real relationships — is exactly
what an AI layer would need to query well later. Nothing here forecloses that option;
it's just not being built now.

---

## 11. Statement Upload Architecture

### Revised for local, single-user use

I originally recommended Open Banking (TrueLayer) over building your own parser,
reasoning that PDF parsing is brittle and in-house categorisation logic is a lot of
maintenance for something a dedicated provider already solves well.

That reasoning still holds if this were a hosted product with automatic daily sync
as a real requirement. But you've clarified this runs locally, just for you, and you
want it simple — and Open Banking brings its own weight that isn't worth it here:
registering as a developer, an OAuth consent flow with your bank, a live API
dependency, and a service you'd need to keep authenticated indefinitely. That's real
infrastructure for a benefit ("I don't have to export a CSV occasionally") that's
fairly small for a single user who's happy to check in monthly.

**Revised recommendation: manual CSV upload, nothing more.**

- You export a CSV from your bank/investment platform's app (every bank supports
  this) and upload it in Finance OS.
- The app parses the CSV, maps columns (date, description, amount — a small,
  one-time-per-bank mapping since formats differ by provider), and inserts
  transactions.
- Duplicate detection on import (matching date + amount + description) so
  re-uploading an overlapping date range doesn't create duplicate transactions.
- Categorisation stays rule-based (merchant/description keyword → category), refined
  as you correct it over time — same as originally planned, just without the
  Open Banking source feeding it.

**What's explicitly cut:** Open Banking integration (TrueLayer), PDF parsing, and any
automatic/scheduled sync. If you ever want automatic sync without manual export, that
door isn't closed — Open Banking can be added later as an additional import source
without touching the transaction model — but it's not part of this build.

This is a meaningfully smaller feature now: a file upload, a column-mapping step, a
parser, and a dedupe check. No third-party account, no OAuth, no ongoing dependency.

---

## 12. Forecasting Architecture

### Deterministic, not machine-learned

Forecasting here should be a transparent projection engine, not a predictive model.
This is a deliberate choice: for a financial product, "why does it think this" needs
to always be answerable in plain arithmetic, not "the model learned a pattern."

**Core model:**

```
projected_net_worth(month) =
    current_net_worth
  + Σ (monthly_savings_contribution × months)
  + Σ (monthly_investment_contribution × months × (1 + assumed_growth_rate)^months)
  - Σ (any modelled debt changes, currently flat since debt isn't repaid early)
```

This is compound growth projection with configurable assumptions (default investment
growth rate, e.g. a conservative long-run average — clearly labelled as an assumption,
not a promise), applied against your actual logged allocation behaviour.

**Scenario comparison** (Journey D) is the same engine run twice with different input
parameters (e.g. £700/£300 vs. £900/£400), rendered as two overlaid lines on the same
chart. No new engine needed — the "what if" feature is a UI layer over parameterising
the same deterministic function, which keeps this cheap to build once the core engine
exists.

**Goal trajectory** (house deposit) is the inverse question: given the projection
engine, at what month does `projected_net_worth ≥ goal_target`? Same underlying
function, different question asked of it.

This keeps the forecasting engine as a single, well-tested, pure function — easy to
verify by hand, easy to explain, and reusable across three different UI features
(dashboard trend, goal tracking, scenario planner) rather than three separate
implementations.

---

## 13. Design System

### Direction: True Brutalist

Not neo-brutalism (the trendy thick-coloured-border, pastel-block SaaS look) —
**true brutalist**: stark, flat, honest about the numbers, no ornamentation. This was
chosen deliberately over the Linear/Trading 212-style direction explored earlier
because it fits the actual function of the app better: a tool that enforces a
strategy and tells you the truth about your money shouldn't soften that with rounded
corners and gradients pretending to be friendly.

**Colour**
- Background: pure black (`#000000`) or near-black (`#0A0A0A`) — no charcoal
  gradients, no layered dark greys for elevation.
- Text: off-white (`#F5F5F0`) — a slight warm tint rather than pure white, which
  reduces eye strain at high contrast over long daily use without softening the look.
- One functional accent colour only: a flat, undiluted green for positive movement
  and the same intensity of red for negative. No third colour, no pastels, no tints
  or shades of either — flat and literal.
- No shadows, no blur, no glassmorphism, no gradients anywhere in the system.

**Typography**
- One typeface for everything; weight (not font family) does all the
  differentiation. Suisse Int'l or Neue Montreal if licensed fonts are in budget;
  Space Grotesk or IBM Plex Mono as strong free alternatives.
- All numerals are tabular and monospaced, even where body text isn't — non-negotiable,
  this is what makes columns of figures actually line up and read fast (Journey A).
- Hero figures (net worth on the dashboard) are oversized — realistically 72–96px.
- No italics, no decorative weights. A "heading" is just bigger and bolder text in the
  same face, not a different font doing the signalling.

**Structure**
- **Zero border-radius, everywhere, no exceptions.** This is the single rule that
  defines the whole system — the moment a rounded corner creeps in, the system has
  drifted back toward generic SaaS.
- Sections are separated by thick solid borders (1–2px) instead of shadows or spacing
  alone — cards read as bounded, deliberate rectangles.
- Grid lines are visible rather than hidden: thin hairlines structuring the layout,
  not purely decorative — this is where the earlier "Blueprint" instinct survives
  inside the brutalist system, as structure rather than skin.
- Charts are flat and literal: straight segment-to-segment lines, no smoothed/curved
  interpolation, no gradient fill under the line. This isn't just aesthetic — a
  smoothed curve visually implies more certainty than a deterministic forecast
  (Section 12) actually has. Blunt lines are the honest representation.

**Brutalist skin, humane interaction — the one deliberate exception**
Pure brutalism as an art movement leans into discomfort. That's wrong for a tool used
daily for years. The starkness stays in the *visual language* (flat colour, hard
edges, zero radius, no shadows) but not in the *interaction*: buttons still need
clear, responsive hover/press states, data updates transition smoothly rather than
snapping jarringly, and nothing about using the app should feel punishing. The system
looks uncompromising; it doesn't behave that way.

**Dark mode only.** A "light brutalist" mode was considered and dropped — the whole
system depends on black backgrounds making the flat accent colours and oversized
numerals hit hard. A washed-out light equivalent loses the point of the direction
entirely, so this isn't a light/dark toggle situation — it's dark, full stop.

---

## 14. UI Principles

Directly extending your own "every screen answers one question" framing — this is a
strong principle and I'm not challenging it, just making it concrete:

| Screen | Question it answers | Primary content |
|---|---|---|
| Dashboard | How am I doing? | Net worth hero number + trend, allocation status, goal progress summary |
| Accounts | Where is my money? | List of accounts by type, balances, per-account history |
| Budget | Where is my money going? | Category breakdown, budget vs. actual, spending trends |
| Goals | How close am I? | Progress bars/trajectories per goal, house deposit front and centre |
| Forecasts | Where will I be? | Projection chart, scenario comparison |

**Other principles:**
- No screen should require horizontal scrolling on a laptop viewport — data density
  is achieved through layout and typography, not cramming.
- Every number that matters should be reachable within one click from the dashboard.
- Loading states show skeleton shapes matching final layout, never a generic spinner
  for data-heavy screens — reduces perceived layout shift and feels faster.
- Empty states are informative, not apologetic — e.g. a fresh Goals screen explains
  what a goal is and offers to create the house deposit goal directly, not just "no
  goals yet."

---

## 15. Navigation Map

```
Dashboard  (/)
├── Accounts        (/accounts)
│    └── [account]  (/accounts/:id)         — per-account detail & history
├── Budget           (/budget)
│    └── [category]  (/budget/:categoryId)   — drill into transactions
├── Goals            (/goals)
│    └── [goal]      (/goals/:id)            — goal detail, trajectory
├── Forecasts         (/forecasts)
│    └── scenarios     (/forecasts/scenarios)  — comparison view
└── Settings           (/settings)
     ├── Accounts management (linking, manual accounts)
     ├── Categories
     ├── Allocation strategy (the £700/£300 split, editable)
     └── Salary history
```

Flat, shallow hierarchy — nothing nested more than two levels deep. This matches the
"answer one question per screen" principle: deep nesting is usually a sign a screen is
trying to answer too many questions at once.

---

## 16. Development Roadmap — Milestones

Each milestone should be independently shippable and independently *useful* — you
should be able to stop after any milestone and have something better than the
spreadsheet, not a half-built app that only becomes useful once everything is done.

**Milestone 0 — Foundation**
Auth, database schema (core entities), empty-state dashboard shell, design system
tokens and base components. No real financial data yet — this is scaffolding.

**Milestone 1 — Manual net worth tracking**
Manual accounts (add/edit balances), account snapshots, net worth calculation and
history chart. *This alone already beats the spreadsheet for the daily check-in
journey.*

**Milestone 2 — Salary & allocation tracking**
Salary history log, monthly allocation tracking (£700/£300 confirmation flow), debt
tracking (balance + term, no repayment planner per Section 4).

**Milestone 3 — Budgeting**
Manual transactions, categories (hierarchical from the start), budget targets vs.
actuals, spending screen.

**Milestone 4 — Goals**
Generic goal engine, house deposit as the first goal instance, progress visualisation.

**Milestone 5 — Forecasting**
Deterministic projection engine (Section 12), dashboard trend projection, goal
trajectory calculation.

**Milestone 6 — Scenario planning**
"What if" comparison UI over the Milestone 5 engine — cheap to build once the engine
exists, which is why it's split out as its own milestone rather than bundled in.

**Milestone 7 — Statement import**
CSV upload, column mapping, duplicate detection, rule-based categorisation
(Section 11). Smaller and lower-risk now than the original Open Banking scope — no
external dependency to integrate, so this doesn't need to be gated behind everything
else the way the original plan did. Could realistically move earlier if it turns out
to be quick.

**Milestone 8+ — Expansion**
Whatever emerges from Section 18, prioritised once the core loop (M0–M7) is proven out
in real use.

---

## 17. Risks and Technical Challenges

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Local file is a single point of failure** | SQLite is one file on disk — no automatic cloud redundancy. | Back it up like any important file (periodic copy, or sync the file to cloud storage yourself if you want redundancy without hosting the app itself). |
| **Financial data sensitivity** | This is genuinely sensitive personal data — balances, income, spending patterns. | Since it's local-only, exposure is already far lower than a hosted app. If you ever add a lock screen (Section 7), that's the only extra layer needed at this scale. |
| **Forecast assumptions being mistaken for guarantees** | An investment growth assumption is a projection, not a promise — if the UI doesn't make that clear, it's misleading. | Always label assumptions explicitly in the UI (e.g. "assuming 6% annual growth — adjustable"), never present a forecast line as fact. |
| **Categorisation accuracy** | Rule-based categorisation will misclassify some transactions, especially early on. | Design correction as a first-class, fast interaction (not buried in settings) — every correction should improve future rules, not just fix one transaction. |
| **CSV format drift** | Banks occasionally change their export format, which could break column mapping. | Column mapping is a small, explicit, user-confirmed step (not blind auto-detection) — a format change means re-confirming mappings once, not a silent failure. |
| **Scope creep into "just one more feature"** | The feature list is already ambitious; each one has a way of quietly growing. | The milestone structure (Section 16) and the explicit scope cuts (debt planner, AI, Open Banking, PDF parsing) in this document are the guardrail — revisit them deliberately, don't let them erode by accident. |

---

## 18. Opportunities for Future Expansion

Deliberately not scoped into early milestones, but worth the architecture staying
open to:

- **Multi-currency support** — relevant if investments or accounts ever span
  currencies; the schema's per-account `currency` field (Section 8) is there
  specifically so this isn't a later migration.
- **UK tax-advantaged account awareness** — ISA/pension allowance tracking (annual
  limits, how much headroom remains) is a natural extension of the Accounts domain
  and highly relevant to your actual strategy.
- **Couples/shared finances** — the multi-tenancy groundwork in Section 8 makes this
  a feature addition, not a rebuild, if it's ever wanted.
- **Notifications/alerts** — "you're off pace on this month's allocation," "your 0%
  debt term ends in 60 days" — a natural extension of the Insights infrastructure
  (Section 10) once it exists.
- **Investment holdings detail** — beyond account-level balances, tracking individual
  holdings/allocation within the Stocks & Shares account (sector/fund breakdown) —
  its own domain, additive to the existing Accounts domain.
- **Mobile app** — if the web app's information architecture (Section 15) stays clean
  and API-driven via tRPC, a React Native client later consumes the same backend
  without a rebuild — another reason not to couple business logic to Next.js-specific
  patterns.
- **Export/reporting** — annual summaries, exportable data for personal record-
  keeping or accountant use, straightforward once the underlying data model is solid.

---

## Summary of where I've pushed back on the original brief

For clarity, since you explicitly asked to be challenged:

1. **Net worth, not budgeting, is the organising concept** — restructured the mental
   model, not just the feature list.
2. **Debt repayment planning is cut from scope entirely** — you've already made that
   strategic call; building a planner for a decision you've made is solving a solved
   problem.
3. **No AI built into the product** — you're using Cowork as the AI layer instead;
   Finance OS stays a clean data application (your call).
4. **Local-only changed the whole stack** — SQLite instead of hosted Postgres, no
   auth system, no hosting, no cloud services (your call, and it's a genuinely
   simpler build as a result).
5. **Statement import is simple CSV upload, not Open Banking** — my original
   recommendation (TrueLayer) was right for a hosted product; for a local personal
   tool it was solving a problem you don't have (your call, and I agree it's the
   right trade for this context).
6. **Forecasting is deterministic, not ML-based** — explainability matters more than
   sophistication for a product like this.

If any of these are wrong calls for reasons I don't have visibility into (e.g. you
specifically want to keep debt-payoff modelling for a future strategy change, or you'd
rather build statement parsing in-house as a learning exercise), say so — these are
recommendations, not decisions I've made unilaterally.
