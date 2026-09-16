"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type FilterGroupProps = {
  options: FilterOption[];
  /** Nombre del parámetro de URL que refleja el filtro (por defecto "estado"). */
  paramKey?: string;
  /** Valor que representa la ausencia de filtro (se elimina de la URL). */
  allValue?: string;
  className?: string;
};

// Botones conmutables con recuento, reflejados en la URL.
export function FilterGroup({
  options,
  paramKey = "estado",
  allValue = "todos",
  className,
}: FilterGroupProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(paramKey) ?? allValue;

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === allValue) params.delete(paramKey);
    else params.set(paramKey, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      role="group"
      aria-label="Filtrar por estado"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(option.value)}
            className={cn(
              "h-7 rounded-md border px-2.5 text-xs transition-colors",
              isActive
                ? "border-accent-border bg-accent-soft text-accent"
                : "border-subtle bg-surface text-secondary hover:bg-hover hover:text-primary",
            )}
          >
            {option.label}
            <span className="num ml-1.5 text-[11px] text-muted">
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}