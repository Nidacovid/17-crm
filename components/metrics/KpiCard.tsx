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
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  footnote?: ReactNode;
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
      <div className="num mt-2 font-display text-[28px] leading-none font-semibold tracking-[-0.02em] text-primary">
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
