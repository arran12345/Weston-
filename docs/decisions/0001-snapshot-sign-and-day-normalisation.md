# 0001 — Snapshot sign convention and day normalisation

**Status:** Accepted (Milestone 1)
**Relates to:** PRD Section 8 (Database Design), Section 13 (charts)

Two implementation decisions the PRD leaves open. Both concern
`AccountSnapshot`, which is the table net worth is derived from.

## Debt balances are stored positive and subtracted

A `DEBT` account's snapshot holds the **amount owed as a positive number**.
Net worth is `sum(asset balances) − sum(debt balances)`.

The alternative — storing debt as a negative balance and summing everything —
was rejected because it makes data entry ambiguous (is "−500" a £500 debt, or
a £500 overpayment?) and pushes a sign convention onto the person typing the
number. Storing what the statement literally says and applying the sign in
one place keeps the entry honest and the calculation auditable.

The UI renders debt with an explicit minus so the display is never ambiguous.

## `capturedAt` is normalised to local midnight

Balances are logged *for a day*, not for a moment. Every snapshot's
`capturedAt` is normalised to local midnight before it's written.

Without this, an opening balance recorded at 20:31 and a balance logged for
"today" at 12:00 land at different times on the same day. That produced two
things we don't want:

1. Several history points for a single day, so the chart's x-axis showed
   repeated dates that stepped for no visible reason.
2. A later-entered correction sorting *before* the value it was meant to
   replace, because its wall-clock time happened to be earlier.

With normalisation, same-day entries collapse to one history point, and a
correction entered afterwards supersedes the earlier value via `createdAt`
(the tie-break in `buildNetWorthHistory`).

Local midnight (not UTC) is correct here because the app runs on one
person's machine in one timezone (PRD Section 7).

## Consequence for the history series

The series is a **step function**: a point exists only where a balance was
actually logged, and each account carries its last known balance forward
until the next one. Accounts with no snapshot yet contribute nothing rather
than zero-filling backwards. This is what Section 13's flat, unsmoothed line
is meant to represent — the chart never implies a value that wasn't recorded.
