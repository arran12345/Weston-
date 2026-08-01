# 0003 — The forecasting formula deviates from Section 12 as written

**Status:** Accepted (Milestone 5)
**Relates to:** PRD Section 12 (Forecasting Architecture), Section 17 (Risks)

## The formula in the PRD overstates growth

Section 12 gives the projection as:

```
projected_net_worth(month) =
    current_net_worth
  + Σ (monthly_savings_contribution × months)
  + Σ (monthly_investment_contribution × months × (1 + assumed_growth_rate)^months)
  - Σ (any modelled debt changes)
```

The investment term multiplies each contribution by **both** the number of
months **and** the full-period growth factor. Taken literally, £300/month for
five years at 6% would project £300 × 60 × 1.06⁵ ≈ £24,088 of contributions
that only ever totalled £18,000 — inflating the contributed principal itself,
before any growth is even attributed.

Section 12 describes its own intent as "compound growth projection with
configurable assumptions", so the intent is clear and the pseudo-code is
simply loose. **What's implemented is standard monthly compounding**, which
is what that phrase means:

```
each month:
  investments = investments × (1 + monthly_rate) + monthly_contribution
  cash        = cash + monthly_cash_contribution
  debt        = unchanged
```

A contribution therefore earns growth only for the months it was actually
invested. A regression test asserts the result stays strictly below the
literal Section 12 formula, so this deviation can't silently revert.

## Contributions land at the end of the month

An ordinary annuity, not an annuity due. Money paid in during a month has not
been invested for that whole month, so crediting it with a full month of
growth would overstate — and where the two readings differ, the conservative
one is right for a tool whose job is not flattering you.

## The monthly rate is geometric, not annual ÷ 12

`monthly_rate = (1 + annual)^(1/12) − 1`, so twelve compounded months
reproduce the annual figure exactly. Dividing by 12 ignores compounding
within the year and understates the result. Tested both ways round.

## Cash doesn't grow, debt stays flat

Savings and current accounts are modelled with no growth — interest on cash
is small enough relative to the assumption error on investments that
modelling it would add false precision.

Debt is held flat because the strategy is deliberately not to repay 0% debt
early (Section 4). Modelling repayment would project a decision that isn't
being made.

## Goal trajectories project only the linked accounts

Section 12 frames the goal question as "at what month does
`projected_net_worth ≥ goal_target`". Using *total* net worth would credit a
house deposit with money sitting in accounts that aren't part of it, so the
trajectory projects the goal's linked accounts instead — consistent with how
Milestone 4 measures progress against those same accounts.

Contributions only count for account types the goal actually links: a goal
tracking savings alone isn't credited with an investment allocation going
elsewhere.

## Every projected figure states its assumptions next to it

Section 17 names "forecast assumptions being mistaken for guarantees" as a
real risk. So: projected lines are dashed where recorded lines are solid, the
growth rate is adjustable and shown inline, and an assumptions note sits
beside every projection saying in plain terms what is being assumed and that
real returns won't follow a straight line.
