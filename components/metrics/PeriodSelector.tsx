"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { METRIC_PERIODS, type MetricPeriod } from "@/lib/constants/periods";

// Selector de periodo de la pantalla de Métricas (7.6): Mes / Trimestre / Año /
// Todo, con estado compartido por la página. El estado vive en la URL
// (?periodo=) para que afecte a todas las métricas dependientes de fechas y
// sobreviva a una recarga.
export function PeriodSelector({ value }: { value: MetricPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(period: MetricPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "todo") params.delete("periodo");
    else params.set("periodo", period);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      role="group"
      aria-label="Periodo de las métricas"
      className="flex flex-wrap items-center gap-1.5"
    >
      {METRIC_PERIODS.map((period) => {
        const isActive = period.key === value;
        return (
          <button
            key={period.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(period.key)}
            className={cn(
              "h-7 rounded-md border px-2.5 text-xs transition-colors",
              isActive
                ? "border-accent-border bg-accent-soft text-accent"
                : "border-subtle bg-surface text-secondary hover:bg-hover hover:text-primary",
            )}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
