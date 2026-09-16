// lib/constants/periods.ts
// Periodo compartido por la pantalla de Métricas (7.6). Vive en constants para
// que el cliente lo importe sin arrastrar las consultas de servidor.
export type MetricPeriod = "mes" | "trimestre" | "anio" | "todo";

export const METRIC_PERIODS: ReadonlyArray<{
  key: MetricPeriod;
  label: string;
}> = [
  { key: "mes", label: "Mes" },
  { key: "trimestre", label: "Trimestre" },
  { key: "anio", label: "Año" },
  { key: "todo", label: "Todo" },
];

export function normalizePeriod(value: string | undefined | null): MetricPeriod {
  return value === "mes" || value === "trimestre" || value === "anio"
    ? value
    : "todo";
}
