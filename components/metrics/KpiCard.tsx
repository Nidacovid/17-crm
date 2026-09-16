import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KpiDelta = {
  /** Texto de la variación, p. ej. "+12,4 % vs mes anterior". */
  label: string;
  /** Tono semántico de la variación. */
  tone?: "positive" | "negative" | "neutral";
};

// Tarjeta de cifra única de Métricas (7.6). Se construye una sola vez y la
// reutilizan todas las oleadas. Cifra grande siempre tabular.
export function KpiCard({
  label,
  value,
  delta,
  footnote,
  size = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  footnote?: ReactNode;
  /** "large" para los KPI protagonistas (40 px), por defecto 28 px. */
  size?: "default" | "large";
  className?: string;
}) {
  const deltaTone =
    delta?.tone === "positive"
      ? "text-positive"
      : delta?.tone === "negative"
        ? "text-negative"
        : "text-secondary";

  return (
    <div className={cn("rounded-lg border border-subtle bg-surface p-5", className)}>
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <div
        className={cn(
          "num mt-2 font-display leading-none font-semibold tracking-[-0.02em] text-primary",
          size === "large" ? "text-[40px]" : "text-[28px]",
        )}
      >
        {value}
      </div>
      {delta ? (
        <p className={cn("num mt-1.5 text-xs", deltaTone)}>{delta.label}</p>
      ) : null}
      {footnote ? (
        <p className="mt-1.5 text-xs text-secondary">{footnote}</p>
      ) : null}
    </div>
  );
}
