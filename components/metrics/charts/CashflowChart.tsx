"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  CHART_ANIMATION_MS,
  CHART_COLORS,
  ChartTooltip,
  GRID_STROKE,
} from "@/components/metrics/charts/theme";

export type CashflowDatum = {
  label: string;
  amount: number;
  cumulative: number;
};

// Barras semanales con línea acumulada superpuesta (M6).
export function CashflowChart({
  data,
  formatValue,
  height = 280,
}: {
  data: CashflowDatum[];
  formatValue: (value: number) => string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
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
            tickFormatter={(value: number) => formatValue(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-hover)" }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          <Bar
            dataKey="amount"
            name="Por semana"
            fill={CHART_COLORS.primary}
            radius={[4, 4, 0, 0]}
            isAnimationActive
            animationDuration={CHART_ANIMATION_MS}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            name="Acumulado"
            stroke={CHART_COLORS.secondary}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={CHART_ANIMATION_MS}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
