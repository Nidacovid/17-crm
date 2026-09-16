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

export type GroupedBarSeries = {
  key: string;
  label: string;
  color: string;
  /** "right" sitúa la serie en un segundo eje (p. ej. porcentajes). */
  yAxisId?: "left" | "right";
};

export type GroupedBarDatum = {
  label: string;
  [key: string]: number | string;
};

// Barras agrupadas con eje doble opcional (M3).
export function GroupedBarChart({
  data,
  series,
  formatValue,
  height = 260,
}: {
  data: GroupedBarDatum[];
  series: GroupedBarSeries[];
  formatValue?: (value: number, name?: string) => string;
  height?: number;
}) {
  const hasRightAxis = series.some((item) => item.yAxisId === "right");

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: hasRightAxis ? 24 : 8, bottom: 8, left: 8 }}
          barGap={4}
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          {hasRightAxis ? (
            <>
              <YAxis
                yAxisId="left"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          )}
          <Tooltip
            cursor={{ fill: "var(--bg-hover)" }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={item.color}
              yAxisId={
                hasRightAxis
                  ? item.yAxisId === "right"
                    ? "right"
                    : "left"
                  : undefined
              }
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={CHART_ANIMATION_MS}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
