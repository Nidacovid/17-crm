"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
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

export type HorizontalBarDatum = {
  label: string;
  value: number;
  /** "negative" pinta la barra en --negative (por debajo de la referencia). */
  tone?: "accent" | "negative";
};

// Barras horizontales con línea de referencia opcional (M1, M4).
export function HorizontalBarChart({
  data,
  formatValue,
  target,
  height = 280,
  yAxisWidth = 132,
}: {
  data: HorizontalBarDatum[];
  formatValue: (value: number) => string;
  target?: number | null;
  height?: number;
  yAxisWidth?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatValue(value)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-hover)" }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          {target !== null && target !== undefined ? (
            <ReferenceLine
              x={target}
              stroke={CHART_COLORS.secondary}
              strokeDasharray="4 4"
            />
          ) : null}
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            isAnimationActive
            animationDuration={CHART_ANIMATION_MS}
          >
            {data.map((entry, index) => (
              <Cell
                key={`${entry.label}-${index}`}
                fill={
                  entry.tone === "negative"
                    ? CHART_COLORS.negative
                    : CHART_COLORS.primary
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
