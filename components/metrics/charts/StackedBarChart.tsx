"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  CHART_ANIMATION_MS,
  ChartTooltip,
  GRID_STROKE,
} from "@/components/metrics/charts/theme";

export type StackedBarSeries = {
  key: string;
  label: string;
  color: string;
};

export type StackedBarDatum = {
  label: string;
  [key: string]: number | string;
};

// Barras apiladas (M5, tramos de aging).
export function StackedBarChart({
  data,
  series,
  formatValue,
  height = 200,
}: {
  data: StackedBarDatum[];
  series: StackedBarSeries[];
  formatValue?: (value: number, name?: string) => string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatValue?.(value) ?? String(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-hover)" }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              stackId="aging"
              fill={item.color}
              radius={
                index === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
              isAnimationActive
              animationDuration={CHART_ANIMATION_MS}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
