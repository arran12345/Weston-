import type { ForecastPoint } from "@/domains/forecasting/types";

export type ScenarioSummary = {
  id: string;
  label: string;
  monthlyCashContribution: number;
  monthlyInvestmentContribution: number;
  annualGrowthRate: number;
  finalNetWorth: number;
  contributed: number;
  growth: number;
  /** Difference in final net worth against the first scenario. */
  deltaVsBaseline: number;
  points: ForecastPoint[];
};

/**
 * Section 12: scenario comparison is the same engine run twice with
 * different parameters, not a second engine. This only assembles the
 * comparison — all the arithmetic already happened in projectNetWorth.
 *
 * The first scenario is the baseline everything else is measured against.
 */
export function summariseScenarios(
  runs: Array<{
    id: string;
    label: string;
    monthlyCashContribution: number;
    monthlyInvestmentContribution: number;
    annualGrowthRate: number;
    points: ForecastPoint[];
  }>,
): ScenarioSummary[] {
  const baselineFinal = runs[0]?.points.at(-1)?.netWorth ?? 0;

  return runs.map((run) => {
    const final = run.points.at(-1);

    return {
      id: run.id,
      label: run.label,
      monthlyCashContribution: run.monthlyCashContribution,
      monthlyInvestmentContribution: run.monthlyInvestmentContribution,
      annualGrowthRate: run.annualGrowthRate,
      finalNetWorth: final?.netWorth ?? 0,
      contributed: final?.contributed ?? 0,
      growth: final?.growth ?? 0,
      deltaVsBaseline: (final?.netWorth ?? 0) - baselineFinal,
      points: run.points,
    };
  });
}

/**
 * The first month where a scenario's projection exceeds the baseline's by
 * `amount` — answers "when does saving more actually start to matter".
 */
export function monthsToOutperform(
  baseline: ForecastPoint[],
  scenario: ForecastPoint[],
  amount: number,
): number | null {
  for (let index = 0; index < scenario.length; index += 1) {
    const base = baseline[index];
    if (!base) break;
    if (scenario[index].netWorth - base.netWorth >= amount) {
      return scenario[index].monthIndex;
    }
  }

  return null;
}
