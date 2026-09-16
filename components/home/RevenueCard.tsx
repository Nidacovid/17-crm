import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/format";
import type { HomeRevenue } from "@/lib/queries/home";

const percentFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

// 8.2: facturación del mes (cobro real), variación frente al mes anterior y
// pendiente de cobro del mes. Toda la tarjeta enlaza a /metricas.
export async function RevenueCard({ data }: { data: Promise<HomeRevenue> }) {
  const revenue = await data;

  const variation = revenue.variationPct;
  const variationTone =
    variation === null
      ? "text-muted"
      : variation >= 0
        ? "text-positive"
        : "text-negative";
  const variationLabel =
    variation === null
      ? "Sin cobros el mes anterior"
      : `${variation > 0 ? "+" : ""}${percentFormatter.format(
          variation,
        )} % vs mes anterior`;

  return (
    <Link
      href="/metricas"
      className="flex flex-col rounded-lg border border-subtle bg-surface p-5 transition-colors hover:bg-hover"
    >
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {revenue.monthLabel}
      </p>
      <p className="mt-1 text-[11px] font-medium tracking-wide text-secondary uppercase">
        Facturación del mes
      </p>
      <p className="num mt-3 font-display text-[40px] leading-none font-semibold tracking-[-0.02em] text-primary">
        {formatEUR(revenue.total)}
      </p>
      <p className={cn("num mt-2.5 text-xs", variationTone)}>
        {variationLabel}
      </p>
      <p className="num mt-1 text-xs text-secondary">
        Pendiente de cobro este mes: {formatEUR(revenue.pendingThisMonth)}
      </p>
    </Link>
  );
}
