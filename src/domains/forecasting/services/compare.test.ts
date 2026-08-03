import { describe, expect, it } from "vitest";

import {
  monthsToOutperform,
  summariseScenarios,
} from "@/domains/forecasting/services/compare";
import { projectNetWorth } from "@/domains/forecasting/services/project";

const startDate = new Date("2026-07-01T00:00:00");
const start = { cash: 10000, investments: 5000, debt: 1000 };

function run(id: string, label: string, cash: number, investment: number) {
  const assumptions = {
    monthlyCashContribution: cash,
    monthlyInvestmentContribution: investment,
    annualGrowthRate: 0.06,
    months: 60,
    startDate,
  };

  return {
    id,
    label,
    ...assumptions,
    points: projectNetWorth(start, assumptions),
  };
}

describe("summariseScenarios", () => {
  const summaries = summariseScenarios([
    run("baseline", "Current plan", 700, 300),
    run("more", "Save more", 900, 400),
    run("less", "Save less", 500, 200),
  ]);

  it("measures the baseline against itself as zero", () => {
    expect(summaries[0].deltaVsBaseline).toBe(0);
  });

  it("reports a higher-contribution scenario as positive", () => {
    expect(summaries[1].deltaVsBaseline).toBeGreaterThan(0);
  });

  it("reports a lower-contribution scenario as negative", () => {
    expect(summaries[2].deltaVsBaseline).toBeLessThan(0);
  });

  it("carries each scenario's own assumptions through", () => {
    expect(summaries[1]).toMatchObject({
      monthlyCashContribution: 900,
      monthlyInvestmentContribution: 400,
    });
  });

  it("splits contributions from growth", () => {
    const baseline = summaries[0];

    expect(baseline.contributed).toBe(1000 * 60);
    expect(baseline.growth).toBeGreaterThan(0);
    // Final position reconciles to start + contributions + growth − debt.
    expect(baseline.finalNetWorth).toBeCloseTo(
      start.cash + start.investments - start.debt +
        baseline.contributed +
        baseline.growth,
      6,
    );
  });

  it("handles a single scenario with nothing to compare against", () => {
    const single = summariseScenarios([run("only", "Only", 700, 300)]);

    expect(single).toHaveLength(1);
    expect(single[0].deltaVsBaseline).toBe(0);
  });

  it("returns nothing for no scenarios", () => {
    expect(summariseScenarios([])).toEqual([]);
  });

  it("gives identical scenarios identical results", () => {
    const [a, b] = summariseScenarios([
      run("a", "A", 700, 300),
      run("b", "B", 700, 300),
    ]);

    expect(b.finalNetWorth).toBe(a.finalNetWorth);
    expect(b.deltaVsBaseline).toBe(0);
  });
});

describe("monthsToOutperform", () => {
  const baseline = run("baseline", "Current plan", 700, 300).points;
  const better = run("better", "Save more", 900, 300).points;

  it("finds when the gap first reaches the given amount", () => {
    // £200/month more: the gap passes £1,000 during the fifth month.
    expect(monthsToOutperform(baseline, better, 1000)).toBe(5);
  });

  it("returns null when the gap never gets there in the horizon", () => {
    expect(monthsToOutperform(baseline, better, 10_000_000)).toBeNull();
  });

  it("returns null when the scenario never outperforms", () => {
    const worse = run("worse", "Save less", 500, 300).points;

    expect(monthsToOutperform(baseline, worse, 1)).toBeNull();
  });
});
