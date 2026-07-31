"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatDate, formatShortDate } from "@/shared/lib/format";

export type SeriesPoint = { date: Date; value: number };

/**
 * Flat, literal line chart (docs/PRD.md Section 13): straight segment-to-
 * segment lines with `type="linear"`, no smoothing, no gradient fill, no
 * shadows. Grid hairlines are visible structure rather than decoration.
 */
export function FlatLineChart({
  data,
  currency = "GBP",
  height = 280,
}: {
  data: SeriesPoint[];
  currency?: string;
  height?: number;
}) {
  const points = data.map((point) => ({
    timestamp: point.date.getTime(),
    value: point.value,
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
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
            formatter={(value) => [
              formatCurrency(Number(value), { currency }),
              "Net worth",
            ]}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="#f5f5f0"
            strokeWidth={2}
            dot={{ fill: "#f5f5f0", r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
