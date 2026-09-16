import {
  BarChart3,
  Briefcase,
  Clock,
  Layers,
} from "lucide-react";
import { ChartCard } from "@/components/metrics/ChartCard";
import { KpiCard } from "@/components/metrics/KpiCard";
import { MetricsDataTable } from "@/components/metrics/MetricsDataTable";
import { HorizontalBarChart } from "@/components/metrics/charts/HorizontalBarChart";
import { GroupedBarChart } from "@/components/metrics/charts/GroupedBarChart";
import { ChartLegend } from "@/components/metrics/charts/theme";
import { formatEUR, formatPercent } from "@/lib/format";
import type {
  M1Data,
  M2Row,
  M3Data,
  M4Data,
  M7Data,
} from "@/lib/queries/metrics";

export type ProfitabilityData = {
  m1: M1Data;
  m2: M2Row[];
  m3: M3Data;
  m4: M4Data;
  m7: M7Data;
};

const NO_PROJECTS = {
  icon: BarChart3,
  title: "Aún no hay rentabilidad que medir",
  description: "Crea tu primer proyecto para empezar a medir.",
};

// Pestaña "Rentabilidad" (9.4): M1, M2, M3, M4 y M7.
export function ProfitabilityTab({ data }: { data: ProfitabilityData }) {
  const { m1, m2, m3, m4, m7 } = data;

  const m1Empty =
    m1.projectsCount === 0
      ? NO_PROJECTS
      : m1.projectsWithHours === 0
        ? {
            icon: Clock,
            title: "Sin horas registradas",
            description:
              "Registra el tiempo de tus tareas para calcular el €/hora.",
          }
        : undefined;

  const m3Empty = m3.projectsCount === 0 ? NO_PROJECTS : undefined;
  const m4Empty =
    m4.total === 0
      ? {
          icon: Briefcase,
          title: "Sin proyectos terminados",
          description:
            "Cuando cierres tu primer proyecto verás aquí su rentabilidad por tipo de negocio.",
        }
      : undefined;
  const m7Empty =
    m7.rows.length === 0
      ? {
          icon: Layers,
          title: "Sin backlog comprometido",
          description:
            "No hay proyectos en curso ni a empezar con importe pendiente de cobro.",
        }
      : undefined;

  const levels = m3.levels.map((level) => ({
    level: level.level,
    n: level.n,
    eurPerHourAvg: level.eurPerHourAvg ?? 0,
    marginPctAvg: level.marginPctAvg ?? 0,
  }));

  return (
    <div className="space-y-4">
      <ChartCard
        title="M1 · €/hora efectivo por proyecto"
        description="(precio − coste) / horas registradas. La línea punteada es tu tarifa objetivo."
        empty={m1Empty}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              label="€/hora efectivo medio"
              value={
                m1.average === null ? "—" : formatEUR(m1.average)
              }
              footnote={`Media ponderada de ${m1.projectsWithHours} ${
                m1.projectsWithHours === 1 ? "proyecto" : "proyectos"
              }`}
            />
          </div>
          {m1.target === null ? (
            <p className="text-xs text-secondary">
              Define tu tarifa objetivo en Ajustes para comparar.
            </p>
          ) : (
            <p className="num text-xs text-secondary">
              Tarifa objetivo: {formatEUR(m1.target)}/h. Las barras por debajo
              se pintan en rojo.
            </p>
          )}
          <HorizontalBarChart
            data={m1.rows.map((row) => ({
              label: row.name,
              value: row.eur_per_hour,
              tone:
                m1.target !== null && row.eur_per_hour < m1.target
                  ? "negative"
                  : "accent",
            }))}
            formatValue={formatEUR}
            target={m1.target}
          />
        </div>
      </ChartCard>

      <ChartCard
        title="M2 · Margen por proyecto"
        description="Ordena por cualquier columna para encontrar dónde se gana y dónde se pierde."
        empty={m2.length === 0 ? NO_PROJECTS : undefined}
      >
        <MetricsDataTable<M2Row>
          rows={m2}
          initialSortKey="margin_eur"
          initialSortDir="desc"
          columns={[
            {
              key: "name",
              label: "Proyecto",
              href: (row) => `/proyectos/${row.project_id}`,
              value: (row) => row.name,
            },
            {
              key: "business_name",
              label: "Cliente",
              value: (row) => row.business_name,
            },
            {
              key: "price_net",
              label: "Precio",
              format: "currency",
              align: "right",
              value: (row) => row.price_net,
            },
            {
              key: "cost_total",
              label: "Coste",
              format: "currency",
              align: "right",
              value: (row) => row.cost_total,
            },
            {
              key: "margin_eur",
              label: "Margen €",
              format: "currency",
              align: "right",
              value: (row) => row.margin_eur,
            },
            {
              key: "margin_pct",
              label: "Margen %",
              format: "percent",
              align: "right",
              bar: true,
              value: (row) => row.margin_pct,
            },
            {
              key: "hours_total",
              label: "Horas",
              format: "hours",
              align: "right",
              value: (row) => row.hours_total,
            },
            {
              key: "eur_per_hour",
              label: "€/h",
              format: "currency",
              align: "right",
              value: (row) => row.eur_per_hour,
            },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="M3 · Nivel 1 vs Nivel 2"
        description="Media de €/hora y de margen por nivel de proyecto."
        empty={m3Empty}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {m3.levels.map((level) => (
              <KpiCard
                key={level.level}
                label={`Nivel ${level.level} · €/hora medio`}
                value={
                  level.eurPerHourAvg === null
                    ? "—"
                    : formatEUR(level.eurPerHourAvg)
                }
                footnote={
                  level.n === 0
                    ? "Sin proyectos todavía"
                    : `${level.marginPctAvg === null ? "—" : formatPercent(level.marginPctAvg)} de margen medio · ${level.n} ${
                        level.n === 1 ? "proyecto" : "proyectos"
                      }`
                }
              />
            ))}
          </div>
          {m3.levels.some((level) => level.n > 0 && level.n < 2) ? (
            <p className="text-xs text-secondary">
              Los niveles con menos de 2 proyectos se marcan para que no se lean
              como representativos.
            </p>
          ) : null}
          <ChartLegend
            items={[
              { label: "€/hora medio", color: "var(--accent)" },
              { label: "Margen % medio", color: "#9A9AA3" },
            ]}
          />
          <GroupedBarChart
            data={levels.map((level) => ({
              label: `Nivel ${level.level}${
                level.n > 0 && level.n < 2 ? " (n<2)" : ""
              }`,
              eur: level.eurPerHourAvg,
              margin: level.marginPctAvg,
            }))}
            series={[
              {
                key: "eur",
                label: "€/hora medio",
                color: "var(--accent)",
                yAxisId: "left",
              },
              {
                key: "margin",
                label: "Margen % medio",
                color: "#9A9AA3",
                yAxisId: "right",
              },
            ]}
            formatValue={(value, name) =>
              name === "Margen % medio"
                ? formatPercent(value)
                : formatEUR(value)
            }
          />
        </div>
      </ChartCard>

      <ChartCard
        title="M4 · Por tipo de negocio"
        description={`Basado en ${m4.total} ${
          m4.total === 1 ? "proyecto terminado" : "proyectos terminados"
        }.`}
        empty={m4Empty}
      >
        <HorizontalBarChart
          data={m4.groups.map((group) => ({
            label: `${group.business_type} (${group.n})`,
            value: group.eurPerHourAvg ?? 0,
          }))}
          formatValue={formatEUR}
          yAxisWidth={160}
        />
      </ChartCard>

      <ChartCard
        title="M7 · Backlog comprometido"
        description="Precio de los proyectos activos que todavía no se ha cobrado."
        empty={m7Empty}
      >
        <div className="space-y-4">
          <KpiCard
            label="Backlog comprometido"
            size="large"
            value={formatEUR(m7.total)}
            footnote={`${m7.rows.length} ${
              m7.rows.length === 1 ? "proyecto activo" : "proyectos activos"
            }`}
          />
          <MetricsDataTable
            rows={m7.rows}
            initialSortKey="pending"
            initialSortDir="desc"
            columns={[
              {
                key: "name",
                label: "Proyecto",
                href: (row) => `/proyectos/${row.project_id}`,
                value: (row) => row.name,
              },
              {
                key: "price_net",
                label: "Precio",
                format: "currency",
                align: "right",
                value: (row) => row.price_net,
              },
              {
                key: "collected",
                label: "Cobrado",
                format: "currency",
                align: "right",
                value: (row) => row.collected,
              },
              {
                key: "pending",
                label: "Comprometido pendiente",
                format: "currency",
                align: "right",
                value: (row) => row.pending,
              },
            ]}
          />
        </div>
      </ChartCard>
    </div>
  );
}
