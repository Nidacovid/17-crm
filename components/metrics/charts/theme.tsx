"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Tema de gráficos (7.6): rejilla --border-subtle solo horizontal, ejes en
// --text-muted a 11 px, serie principal --accent y secundarias en escala de
// grises, tooltip con fondo --bg-surface-2 y borde de 1 px sin sombra.
export const CHART_COLORS = {
  primary: "var(--accent)",
  secondary: "#9A9AA3",
  gray: "#4A4A52",
  mid: "#6B6B75",
  negative: "var(--negative)",
  positive: "var(--positive)",
  warning: "var(--warning)",
} as const;

export const GRID_STROKE = "var(--border-subtle)";
export const AXIS_TICK = { fill: "var(--text-muted)", fontSize: 11 } as const;
export const CHART_ANIMATION_MS = 200;

export type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
};

// Tooltip común. `formatValue` recibe el nombre de la serie para poder usar
// unidades distintas (€ frente a %).
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatValue?: (value: number, name?: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-subtle bg-surface-2 px-3 py-2 text-xs">
      {label !== undefined && label !== "" ? (
        <p className="mb-1 text-muted">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <p
            key={`${String(entry.name)}-${index}`}
            className="num flex items-center justify-between gap-4 text-primary"
          >
            <span className="text-secondary">{entry.name}</span>
            <span>
              {typeof entry.value === "number" && formatValue
                ? formatValue(entry.value, String(entry.name))
                : entry.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

// Leyenda propia en HTML (el tema oscuro no usa la leyenda por defecto de
// Recharts). Solo se muestra cuando hay más de una serie.
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string }[];
  className?: string;
}) {
  if (items.length <= 1) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-[11px] text-secondary"
        >
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartFrame({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  return <div style={{ height }}>{children}</div>;
}
