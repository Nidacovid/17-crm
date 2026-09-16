import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/metrics/KpiCard";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { PendingPaymentsBlock } from "@/components/metrics/PendingPaymentsBlock";
import { MetricsTabs } from "@/components/metrics/MetricsTabs";
import {
  getHeaderMetrics,
  getM1,
  getM2,
  getM3,
  getM4,
  getM5,
  getM6,
  getM7,
  getPendingPayments,
  normalizePeriod,
} from "@/lib/queries/metrics";
import { formatEUR } from "@/lib/format";

// Pantalla de Métricas, oleada A (Fase 9). Cabecera fija (7.1), bloque de pagos
// pendientes y pestañas Rentabilidad · Cobros con M1–M5, M6 y M7.
// El selector de periodo vive en la URL (?periodo=) y acota las métricas de
// rentabilidad (M1–M4, M7) por fecha de creación del proyecto.
export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; tab?: string }>;
}) {
  const { periodo } = await searchParams;
  const period = normalizePeriod(periodo);

  const [header, pending, m1, m2, m3, m4, m5, m6, m7] = await Promise.all([
    getHeaderMetrics(),
    getPendingPayments(),
    getM1(period),
    getM2(period),
    getM3(period),
    getM4(period),
    getM5(),
    getM6(),
    getM7(period),
  ]);

  return (
    <>
      <PageHeader
        title="Métricas"
        actions={<PeriodSelector value={period} />}
      />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="Facturación del mes"
            value={formatEUR(header.monthCollected)}
            footnote={header.monthLabel}
          />
          <KpiCard
            label="Facturación del trimestre"
            value={formatEUR(header.quarterCollected)}
            footnote={header.quarterLabel}
          />
          <KpiCard
            label="Beneficio neto del mes"
            value={formatEUR(header.monthNetProfit)}
            footnote="Cobrado − tokens − gastos de proyecto − gastos generales"
          />
        </div>

        <PendingPaymentsBlock rows={pending} />

        <MetricsTabs
          profitability={{ m1, m2, m3, m4, m7 }}
          collections={{ m5, m6 }}
        />
      </div>
    </>
  );
}
