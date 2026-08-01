"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatDate, formatShortDate } from "@/shared/lib/format";

export type ForecastSeries = {
  date: Date;
  value: number;
};

/**
 * Projection chart. Same flat, unsmoothed treatment as the history chart
 * (Section 13) — `type="linear"`, no gradient fill — but the projected line
 * is dashed so a forecast never reads as recorded fact (Section 17).
 */
export function ForecastChart({
  actual,
  projected,
  target,
  height = 320,
  currency = "GBP",
}: {
  actual?: ForecastSeries[];
  projected: ForecastSeries[];
  /** Draws a horizontal marker, e.g. a goal's target amount. */
  target?: number;
  height?: number;
  currency?: string;
}) {
  const byTimestamp = new Map<
    number,
    { timestamp: number; actual?: number; projected?: number }
  >();

  for (const point of actual ?? []) {
    const timestamp = point.date.getTime();
    byTimestamp.set(timestamp, { timestamp, actual: point.value });
  }

  for (const point of projected) {
    const timestamp = point.date.getTime();
    const existing = byTimestamp.get(timestamp);
    byTimestamp.set(timestamp, {
      timestamp,
      ...existing,
      projected: point.value,
    });
  }

  const data = [...byTimestamp.values()].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  const todayTimestamp = projected[0]?.date.getTime();

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
              name === "actual" ? "Recorded" : "Projected",
            ]}
          />

          {todayTimestamp ? (
            <ReferenceLine
              x={todayTimestamp}
              stroke="#f5f5f0"
              strokeOpacity={0.5}
              strokeDasharray="2 2"
              label={{
                value: "today",
                position: "insideTopLeft",
                fill: "#f5f5f0",
                fontSize: 10,
                opacity: 0.5,
              }}
            />
          ) : null}

          {target !== undefined ? (
            <ReferenceLine
              y={target}
              stroke="#00d13a"
              strokeWidth={1}
              label={{
                value: `target ${formatCurrency(target, { currency, fractionDigits: 0 })}`,
                position: "insideBottomRight",
                fill: "#00d13a",
                fontSize: 10,
              }}
            />
          ) : null}

          {actual && actual.length > 0 ? (
            <Line
              type="linear"
              dataKey="actual"
              stroke="#f5f5f0"
              strokeWidth={2}
              dot={{ fill: "#f5f5f0", r: 3 }}
              isAnimationActive={false}
              connectNulls
            />
          ) : null}

          <Line
            type="linear"
            dataKey="projected"
            stroke="#f5f5f0"
            strokeOpacity={0.65}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
