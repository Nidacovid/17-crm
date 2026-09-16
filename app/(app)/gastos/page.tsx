import { formatInTimeZone } from "date-fns-tz";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/metrics/KpiCard";
import { AddBusinessExpenseButton } from "@/components/expenses/ExpenseForm";
import { BusinessExpenseFilters } from "@/components/expenses/BusinessExpenseFilters";
import { BusinessExpensesTable } from "@/components/expenses/BusinessExpensesTable";
import {
  computeBusinessExpenseKpis,
  getBusinessExpenses,
  getBusinessExpenseMonths,
} from "@/lib/queries/expenses";
import { BUSINESS_EXPENSE_CATEGORY_KEYS } from "@/lib/constants/categories";
import { APP_TIMEZONE } from "@/lib/dates";
import { formatEUR } from "@/lib/format";

const VALID_CATEGORIAS = new Set<string>([
  "todas",
  ...BUSINESS_EXPENSE_CATEGORY_KEYS,
]);

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; finalizados?: string }>;
}) {
  const { categoria, finalizados } = await searchParams;
  const categoryFilter =
    categoria && VALID_CATEGORIAS.has(categoria) ? categoria : "todas";
  const showFinished = finalizados === "1";

  const [rows, months] = await Promise.all([
    getBusinessExpenses(),
    getBusinessExpenseMonths(),
  ]);

  const kpis = computeBusinessExpenseKpis(rows, months);
  const today = formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
  const isActive = (ends_on: string | null) =>
    ends_on === null || ends_on >= today;

  const finishedCount = rows.filter((row) => !isActive(row.ends_on)).length;

  const activeFiltered = showFinished
    ? rows
    : rows.filter((row) => isActive(row.ends_on));

  const categoryCounts: Record<string, number> = {};
  for (const row of activeFiltered) {
    categoryCounts[row.category] = (categoryCounts[row.category] ?? 0) + 1;
  }

  const visibleRows =
    categoryFilter === "todas"
      ? activeFiltered
      : activeFiltered.filter((row) => row.category === categoryFilter);

  return (
    <>
      <PageHeader title="Gastos del negocio" actions={<AddBusinessExpenseButton />} />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="Gasto fijo mensual"
            value={formatEUR(kpis.fixedMonthly)}
            footnote="Recurrentes activos normalizados a mes"
          />
          <KpiCard
            label="Gasto de este mes"
            value={formatEUR(kpis.currentMonth)}
          />
          <KpiCard
            label="Gasto de los últimos 12 meses"
            value={formatEUR(kpis.lastTwelveMonths)}
          />
        </div>

        <BusinessExpenseFilters
          categoryCounts={categoryCounts}
          finishedCount={finishedCount}
        />

        <BusinessExpensesTable rows={visibleRows} />
      </div>
    </>
  );
}
