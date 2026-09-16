"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FilterGroup,
  type FilterOption,
} from "@/components/shared/FilterGroup";
import {
  BUSINESS_EXPENSE_CATEGORY,
  BUSINESS_EXPENSE_CATEGORY_KEYS,
} from "@/lib/constants/categories";
import { cn } from "@/lib/utils";

// Filtros de la pantalla /gastos (7.2): categoría (con recuento) y conmutador
// "Mostrar finalizados", ambos reflejados en la URL.
export function BusinessExpenseFilters({
  categoryCounts,
  finishedCount,
}: {
  categoryCounts: Record<string, number>;
  finishedCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showFinished = searchParams.get("finalizados") === "1";

  const total = BUSINESS_EXPENSE_CATEGORY_KEYS.reduce(
    (sum, key) => sum + (categoryCounts[key] ?? 0),
    0,
  );

  const options: FilterOption[] = [
    { value: "todas", label: "Todas", count: total },
    ...BUSINESS_EXPENSE_CATEGORY_KEYS.map((key) => ({
      value: key,
      label: BUSINESS_EXPENSE_CATEGORY[key],
      count: categoryCounts[key] ?? 0,
    })),
  ];

  function toggleFinished() {
    const params = new URLSearchParams(searchParams.toString());
    if (showFinished) params.delete("finalizados");
    else params.set("finalizados", "1");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <FilterGroup
        options={options}
        paramKey="categoria"
        allValue="todas"
      />
      <button
        type="button"
        aria-pressed={showFinished}
        onClick={toggleFinished}
        className={cn(
          "h-7 shrink-0 rounded-md border px-2.5 text-xs transition-colors",
          showFinished
            ? "border-accent-border bg-accent-soft text-accent"
            : "border-subtle bg-surface text-secondary hover:bg-hover hover:text-primary",
        )}
      >
        Mostrar finalizados
        <span className="num ml-1.5 text-[11px] text-muted">
          {finishedCount}
        </span>
      </button>
    </div>
  );
}
