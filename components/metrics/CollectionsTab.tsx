import { Banknote, CalendarClock } from "lucide-react";
import { ChartCard } from "@/components/metrics/ChartCard";
import { KpiCard } from "@/components/metrics/KpiCard";
import { MetricsDataTable } from "@/components/metrics/MetricsDataTable";
import { StackedBarChart } from "@/components/metrics/charts/StackedBarChart";
import { CashflowChart } from "@/components/metrics/charts/CashflowChart";
import {
  ChartLegend,
  CHART_COLORS,
} from "@/components/metrics/charts/theme";
import { formatDate, formatEUR } from "@/lib/format";
import type { M5Data, M5Row, M6Data } from "@/lib/queries/metrics";

export type CollectionsData = {
  m5: M5Data;
  m6: M6Data;
};

const AGING_COLORS: Record<string, string> = {
  "0-30": CHART_COLORS.gray,
  "31-60": CHART_COLORS.mid,
  "+60": CHART_COLORS.negative,
};

// Pestaña "Cobros" (9.5): M5 y M6.
export function CollectionsTab({ data }: { data: CollectionsData }) {
  const { m5, m6 } = data;

  return (
    <div className="space-y-4">
      <ChartCard
        title="M5 · Aging de cobros"
        description="Cobros vencidos agrupados por antigüedad de la deuda."
        empty={
          m5.rows.length === 0
            ? {
                icon: Banknote,
                title: "Ningún cobro vencido",
                description:
                  "Todos los pagos emitidos están al día o ya se han cobrado.",
              }
            : undefined
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KpiCard
              label="Total vencido"
              value={formatEUR(m5.totalOverdue)}
              footnote={`${m5.rows.length} ${
                m5.rows.length === 1 ? "pago vencido" : "pagos vencidos"
              }`}
            />
          </div>
          <ChartLegend
            items={m5.buckets.map((bucket) => ({
              label: `${bucket.label} (${formatEUR(bucket.amount)})`,
              color: AGING_COLORS[bucket.bucket],
            }))}
          />
          <StackedBarChart
            data={[
              {
                label: "Cobros vencidos",
                "0-30": m5.buckets[0]?.amount ?? 0,
                "31-60": m5.buckets[1]?.amount ?? 0,
                "+60": m5.buckets[2]?.amount ?? 0,
              },
            ]}
            series={[
              {
                key: "0-30",
                label: "0–30 días",
                color: AGING_COLORS["0-30"],
              },
              {
                key: "31-60",
                label: "31–60 días",
                color: AGING_COLORS["31-60"],
              },
              { key: "+60", label: "+60 días", color: AGING_COLORS["+60"] },
            ]}
            formatValue={formatEUR}
          />
          <MetricsDataTable<M5Row>
            rows={m5.rows}
            initialSortKey="days_overdue"
            initialSortDir="desc"
            rowClassName={(row) =>
              row.id === m5.topDebtorId ? "bg-negative/5" : undefined
            }
            columns={[
              {
                key: "client",
                label: "Cliente",
                href: (row) => `/proyectos/${row.project_id}`,
                value: (row) => row.client,
              },
              {
                key: "project_name",
                label: "Proyecto",
                value: (row) => row.project_name,
              },
              {
                key: "amount",
                label: "Importe",
                format: "currency",
                align: "right",
                value: (row) => row.amount,
              },
              {
                key: "due_date",
                label: "Fecha",
                align: "right",
                value: (row) => row.due_date,
                render: (row) => formatDate(row.due_date),
              },
              {
                key: "days_overdue",
                label: "Días de retraso",
                format: "number",
                align: "right",
                value: (row) => row.days_overdue,
              },
            ]}
          />
        </div>
      </ChartCard>

      <ChartCard
        title="M6 · Previsión de caja a 90 días"
        description={`Cobros pendientes con vencimiento entre hoy y el ${formatDate(
          m6.horizonEnd,
        )}.`}
        empty={
          m6.weeks.length === 0
            ? {
                icon: CalendarClock,
                title: "Sin cobros a la vista",
                description:
                  "No hay pagos pendientes con vencimiento en los próximos 90 días.",
              }
            : undefined
        }
      >
        <div className="space-y-4">
          <ChartLegend
            items={[
              { label: "Por semana", color: CHART_COLORS.primary },
              { label: "Acumulado", color: CHART_COLORS.secondary },
            ]}
          />
          <CashflowChart
            data={m6.weeks.map((week) => ({
              label: week.label,
              amount: week.amount,
              cumulative: week.cumulative,
            }))}
            formatValue={formatEUR}
          />
        </div>
      </ChartCard>
    </div>
  );
}
