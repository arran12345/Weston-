"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatDate, formatShortDate } from "@/shared/lib/format";

export type ScenarioSeries = {
  id: string;
  label: string;
  points: Array<{ date: Date; value: number }>;
};

/**
 * Overlaid projections (Section 12). The system has one accent pair and no
 * third colour (Section 13), so scenarios are distinguished by dash pattern
 * and opacity rather than by inventing a palette.
 */
const STROKES = [
  { dasharray: "6 4", opacity: 1 },
  { dasharray: "2 3", opacity: 0.85 },
  { dasharray: "10 3 2 3", opacity: 0.7 },
  { dasharray: "1 3", opacity: 0.55 },
];

export function ScenarioChart({
  series,
  height = 340,
  currency = "GBP",
}: {
  series: ScenarioSeries[];
  height?: number;
  currency?: string;
}) {
  const byTimestamp = new Map<number, Record<string, number>>();

  for (const scenario of series) {
    for (const point of scenario.points) {
      const timestamp = point.date.getTime();
      const row = byTimestamp.get(timestamp) ?? { timestamp };
      row[scenario.id] = point.value;
      byTimestamp.set(timestamp, row);
    }
  }

  const data = [...byTimestamp.values()].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#f5f5f0" strokeOpacity={0.15} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => formatShortDate(new Date(value))}
            stroke="#f5f5f0"
            strokeOpacity={0.4}
            tick={{ fill: "#f5f5f0", fontSize: 11, opacity: 0.6 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value: number) =>
              formatCurrency(value, { currency, fractionDigits: 0 })
            }
            stroke="#f5f5f0"
            strokeOpacity={0.4}
            tick={{ fill: "#f5f5f0", fontSize: 11, opacity: 0.6 }}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              background: "#000000",
              border: "1px solid #f5f5f0",
              borderRadius: 0,
              fontSize: 12,
            }}
            labelStyle={{ color: "#f5f5f0", opacity: 0.6 }}
            itemStyle={{ color: "#f5f5f0" }}
            labelFormatter={(value) => formatDate(new Date(Number(value)))}
            formatter={(value, name) => [
              formatCurrency(Number(value), { currency }),
              series.find((scenario) => scenario.id === name)?.label ?? name,
            ]}
          />
          <Legend
            formatter={(value) =>
              series.find((scenario) => scenario.id === value)?.label ?? value
            }
            wrapperStyle={{ fontSize: 11, textTransform: "uppercase" }}
          />

          {series.map((scenario, index) => {
            const stroke = STROKES[index % STROKES.length];
            return (
              <Line
                key={scenario.id}
                type="linear"
                dataKey={scenario.id}
                stroke="#f5f5f0"
                strokeOpacity={stroke.opacity}
                strokeWidth={2}
                strokeDasharray={stroke.dasharray}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
