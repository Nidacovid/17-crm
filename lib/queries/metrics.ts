import { cache } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE, monthRange, quarterRange, yearRange } from "@/lib/dates";
import { type MetricPeriod } from "@/lib/constants/periods";

export { METRIC_PERIODS, normalizePeriod } from "@/lib/constants/periods";
export type { MetricPeriod } from "@/lib/constants/periods";

type PeriodBounds = { start: string; end: string };

// Límites del periodo en fechas ISO de Europe/Madrid. "Todo" no acota.
function periodBounds(
  period: MetricPeriod,
  now: Date = new Date(),
): PeriodBounds | null {
  if (period === "todo") return null;
  const range =
    period === "mes"
      ? monthRange(now)
      : period === "trimestre"
        ? quarterRange(now)
        : yearRange(now);
  return {
    start: formatInTimeZone(range.start, APP_TIMEZONE, "yyyy-MM-dd"),
    end: formatInTimeZone(range.end, APP_TIMEZONE, "yyyy-MM-dd"),
  };
}

function todayISO(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round2((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

// Semana ISO (lunes) calculada en UTC sobre una fecha ISO corta, sin depender
// de la zona horaria del proceso.
function mondayOf(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - sinceMonday);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Configuración (tarifa objetivo, IVA). cache: una sola consulta por petición.
// ---------------------------------------------------------------------------

export type MetricsSettings = {
  target_hourly_rate: number | null;
  vat_enabled: boolean;
};

export const getMetricsSettings = cache(async (): Promise<MetricsSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("target_hourly_rate,vat_enabled")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    target_hourly_rate: data?.target_hourly_rate ?? null,
    vat_enabled: data?.vat_enabled ?? false,
  };
});

// ---------------------------------------------------------------------------
// Cabecera fija (7.1): facturación del mes, del trimestre y beneficio neto.
// Lee v_monthly_cash, donde Postgres ya agrega por mes cobrado, tokens de
// tareas cerradas, gastos de proyecto y gastos generales.
// ---------------------------------------------------------------------------

export type HeaderMetrics = {
  monthLabel: string;
  monthCollected: number;
  monthNetProfit: number;
  quarterLabel: string;
  quarterCollected: number;
};

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export async function getHeaderMetrics(
  now: Date = new Date(),
): Promise<HeaderMetrics> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_monthly_cash")
    .select("month,collected,net_profit");
  if (error) throw new Error(error.message);

  const byMonth = new Map<
    string,
    { collected: number; net_profit: number }
  >();
  for (const row of data ?? []) {
    if (!row.month) continue;
    byMonth.set(row.month.slice(0, 7), {
      collected: row.collected ?? 0,
      net_profit: row.net_profit ?? 0,
    });
  }

  const monthKey = todayISO(now).slice(0, 7);
  const [year, month] = monthKey.split("-").map(Number);
  const quarterIndex = Math.floor((month - 1) / 3);
  const quarterStart = quarterIndex * 3 + 1;

  let quarterCollected = 0;
  for (let offset = 0; offset < 3; offset += 1) {
    const key = `${year}-${String(quarterStart + offset).padStart(2, "0")}`;
    quarterCollected += byMonth.get(key)?.collected ?? 0;
  }

  const current = byMonth.get(monthKey);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  return {
    monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    monthCollected: round2(current?.collected ?? 0),
    monthNetProfit: round2(current?.net_profit ?? 0),
    quarterLabel: `T${quarterIndex + 1} ${year}`,
    quarterCollected: round2(quarterCollected),
  };
}

// ---------------------------------------------------------------------------
// Bloque "Pagos pendientes" (7.1): v_payments con estado <> 'pagado'.
// ---------------------------------------------------------------------------

export type PendingPaymentRow = {
  id: string;
  client: string;
  project_id: string;
  project_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  overdue: boolean;
};

export async function getPendingPayments(): Promise<PendingPaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_payments")
    .select(
      "id,amount,due_date,days_overdue,status,client_business_name,project_id,project_name",
    )
    .neq("status", "pagado")
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);

  const rows: PendingPaymentRow[] = [];
  for (const row of data ?? []) {
    if (!row.id || !row.due_date) continue;
    rows.push({
      id: row.id,
      client: row.client_business_name ?? "",
      project_id: row.project_id ?? "",
      project_name: row.project_name ?? "",
      amount: row.amount ?? 0,
      due_date: row.due_date,
      days_overdue: row.days_overdue ?? 0,
      overdue: row.status === "vencido",
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Base de las métricas de rentabilidad: v_project_totals + cliente + fecha de
// creación del proyecto. cache: una sola consulta por periodo y petición.
// ---------------------------------------------------------------------------

export type ProjectMetricRow = {
  project_id: string;
  code: string;
  name: string;
  status: string;
  level: number;
  client_id: string;
  business_name: string;
  business_type: string | null;
  price_net: number;
  hours_total: number;
  cost_total: number;
  margin_eur: number;
  margin_pct: number | null;
  eur_per_hour: number | null;
  collected: number;
  pending: number;
};

const TOTALS_COLUMNS =
  "project_id,code,name,status,level,client_id,price_net,hours_total,cost_total,margin_eur,margin_pct,eur_per_hour,collected,pending";

const loadProjectRows = cache(
  async (period: MetricPeriod): Promise<ProjectMetricRow[]> => {
    const supabase = await createClient();
    const [totalsResult, clientsResult, projectsResult] = await Promise.all([
      supabase.from("v_project_totals").select(TOTALS_COLUMNS),
      supabase.from("clients").select("id,business_name,business_type"),
      supabase.from("projects").select("id,created_at"),
    ]);
    if (totalsResult.error) throw new Error(totalsResult.error.message);
    if (clientsResult.error) throw new Error(clientsResult.error.message);
    if (projectsResult.error) throw new Error(projectsResult.error.message);

    const clients = new Map<
      string,
      { business_name: string; business_type: string | null }
    >();
    for (const client of clientsResult.data ?? []) {
      clients.set(client.id, {
        business_name: client.business_name,
        business_type: client.business_type,
      });
    }

    const createdById = new Map<string, string>();
    for (const project of projectsResult.data ?? []) {
      createdById.set(project.id, project.created_at);
    }

    const bounds = periodBounds(period);
    const rows: ProjectMetricRow[] = [];
    for (const total of totalsResult.data ?? []) {
      if (!total.project_id) continue;
      if (bounds) {
        const created = createdById.get(total.project_id);
        if (created) {
          const createdDate = formatInTimeZone(
            new Date(created),
            APP_TIMEZONE,
            "yyyy-MM-dd",
          );
          if (createdDate < bounds.start || createdDate > bounds.end) continue;
        }
      }
      const client = clients.get(total.client_id ?? "");
      rows.push({
        project_id: total.project_id,
        code: total.code ?? "",
        name: total.name ?? "",
        status: total.status ?? "",
        level: total.level ?? 1,
        client_id: total.client_id ?? "",
        business_name: client?.business_name ?? "",
        business_type: client?.business_type ?? null,
        price_net: total.price_net ?? 0,
        hours_total: total.hours_total ?? 0,
        cost_total: total.cost_total ?? 0,
        margin_eur: total.margin_eur ?? 0,
        margin_pct: total.margin_pct,
        eur_per_hour: total.eur_per_hour,
        collected: total.collected ?? 0,
        pending: total.pending ?? 0,
      });
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
);

// M1 · €/hora efectivo por proyecto -------------------------------------------------

export type M1ProjectRow = {
  project_id: string;
  name: string;
  eur_per_hour: number;
};

export type M1Data = {
  rows: M1ProjectRow[];
  average: number | null;
  target: number | null;
  projectsCount: number;
  projectsWithHours: number;
};

export async function getM1(period: MetricPeriod): Promise<M1Data> {
  const [rows, settings] = await Promise.all([
    loadProjectRows(period),
    getMetricsSettings(),
  ]);

  const withHours = rows.filter(
    (row) => row.hours_total > 0 && row.eur_per_hour !== null,
  );
  const totalMargin = withHours.reduce((sum, row) => sum + row.margin_eur, 0);
  const totalHours = withHours.reduce((sum, row) => sum + row.hours_total, 0);

  return {
    rows: withHours
      .map((row) => ({
        project_id: row.project_id,
        name: row.name,
        eur_per_hour: row.eur_per_hour as number,
      }))
      .sort((a, b) => b.eur_per_hour - a.eur_per_hour),
    average: totalHours > 0 ? round2(totalMargin / totalHours) : null,
    target: settings.target_hourly_rate,
    projectsCount: rows.length,
    projectsWithHours: withHours.length,
  };
}

// M2 · Margen por proyecto ----------------------------------------------------------

export type M2Row = {
  project_id: string;
  name: string;
  business_name: string;
  price_net: number;
  cost_total: number;
  margin_eur: number;
  margin_pct: number | null;
  hours_total: number;
  eur_per_hour: number | null;
};

export async function getM2(period: MetricPeriod): Promise<M2Row[]> {
  const rows = await loadProjectRows(period);
  return rows.map((row) => ({
    project_id: row.project_id,
    name: row.name,
    business_name: row.business_name,
    price_net: row.price_net,
    cost_total: row.cost_total,
    margin_eur: row.margin_eur,
    margin_pct: row.margin_pct,
    hours_total: row.hours_total,
    eur_per_hour: row.eur_per_hour,
  }));
}

// M3 · €/h y margen por nivel (1 vs 2) ----------------------------------------------

export type M3Level = {
  level: number;
  n: number;
  eurPerHourAvg: number | null;
  eurPerHourMedian: number | null;
  marginPctAvg: number | null;
  marginPctMedian: number | null;
};

export type M3Data = {
  levels: M3Level[];
  projectsCount: number;
};

export async function getM3(period: MetricPeriod): Promise<M3Data> {
  const rows = await loadProjectRows(period);
  const levels = [1, 2].map((level) => {
    const group = rows.filter((row) => row.level === level);
    const eurPerHour = group
      .map((row) => row.eur_per_hour)
      .filter((value): value is number => value !== null);
    const marginPct = group
      .map((row) => row.margin_pct)
      .filter((value): value is number => value !== null);
    return {
      level,
      n: group.length,
      eurPerHourAvg: mean(eurPerHour),
      eurPerHourMedian: median(eurPerHour),
      marginPctAvg: mean(marginPct),
      marginPctMedian: median(marginPct),
    };
  });
  return { levels, projectsCount: rows.length };
}

// M4 · €/h y margen por tipo de negocio ---------------------------------------------

export type M4Group = {
  business_type: string;
  n: number;
  eurPerHourAvg: number | null;
  marginPctAvg: number | null;
};

export type M4Data = {
  groups: M4Group[];
  total: number;
};

export async function getM4(period: MetricPeriod): Promise<M4Data> {
  const rows = (await loadProjectRows(period)).filter(
    (row) => row.status === "terminado",
  );
  const byType = new Map<
    string,
    { eurPerHour: number[]; marginPct: number[] }
  >();
  for (const row of rows) {
    const key = row.business_type?.trim() || "Sin tipo";
    const group = byType.get(key) ?? { eurPerHour: [], marginPct: [] };
    if (row.eur_per_hour !== null) group.eurPerHour.push(row.eur_per_hour);
    if (row.margin_pct !== null) group.marginPct.push(row.margin_pct);
    byType.set(key, group);
  }

  const groups: M4Group[] = [];
  for (const [business_type, group] of byType) {
    groups.push({
      business_type,
      n: group.eurPerHour.length,
      eurPerHourAvg: mean(group.eurPerHour),
      marginPctAvg: mean(group.marginPct),
    });
  }
  groups.sort(
    (a, b) => (b.eurPerHourAvg ?? -Infinity) - (a.eurPerHourAvg ?? -Infinity),
  );
  return { groups, total: rows.length };
}

// M5 · Aging de cobros --------------------------------------------------------------

export type M5Bucket = {
  bucket: "0-30" | "31-60" | "+60";
  label: string;
  amount: number;
  count: number;
};

export type M5Row = {
  id: string;
  client: string;
  project_id: string;
  project_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
};

export type M5Data = {
  totalOverdue: number;
  buckets: M5Bucket[];
  rows: M5Row[];
  topDebtorId: string | null;
};

const BUCKET_LABELS: Record<M5Bucket["bucket"], string> = {
  "0-30": "0–30 días",
  "31-60": "31–60 días",
  "+60": "+60 días",
};

export async function getM5(): Promise<M5Data> {
  const supabase = await createClient();
  const [bucketsResult, rowsResult] = await Promise.all([
    supabase
      .from("v_receivables_aging")
      .select("bucket,amount_total,payments_count"),
    supabase
      .from("v_payments")
      .select(
        "id,amount,due_date,days_overdue,client_business_name,project_id,project_name",
      )
      .eq("status", "vencido")
      .order("days_overdue", { ascending: false }),
  ]);
  if (bucketsResult.error) throw new Error(bucketsResult.error.message);
  if (rowsResult.error) throw new Error(rowsResult.error.message);

  const bucketMap = new Map<string, { amount: number; count: number }>();
  for (const row of bucketsResult.data ?? []) {
    if (!row.bucket) continue;
    bucketMap.set(row.bucket, {
      amount: row.amount_total ?? 0,
      count: row.payments_count ?? 0,
    });
  }

  const buckets: M5Bucket[] = (["0-30", "31-60", "+60"] as const).map(
    (bucket) => {
      const entry = bucketMap.get(bucket);
      return {
        bucket,
        label: BUCKET_LABELS[bucket],
        amount: round2(entry?.amount ?? 0),
        count: entry?.count ?? 0,
      };
    },
  );

  const rows: M5Row[] = [];
  for (const row of rowsResult.data ?? []) {
    if (!row.id || !row.due_date) continue;
    rows.push({
      id: row.id,
      client: row.client_business_name ?? "",
      project_id: row.project_id ?? "",
      project_name: row.project_name ?? "",
      amount: row.amount ?? 0,
      due_date: row.due_date,
      days_overdue: row.days_overdue ?? 0,
    });
  }

  const totalOverdue = round2(
    rows.reduce((sum, row) => sum + row.amount, 0),
  );
  let topDebtorId: string | null = null;
  let topAmount = -Infinity;
  for (const row of rows) {
    if (row.amount > topAmount) {
      topAmount = row.amount;
      topDebtorId = row.id;
    }
  }

  return { totalOverdue, buckets, rows, topDebtorId };
}

// M6 · Previsión de caja a 90 días --------------------------------------------------

export type M6Week = {
  weekStart: string;
  label: string;
  amount: number;
  cumulative: number;
};

export type M6Data = {
  weeks: M6Week[];
  total: number;
  horizonEnd: string;
};

export async function getM6(now: Date = new Date()): Promise<M6Data> {
  const supabase = await createClient();
  const today = todayISO(now);
  const horizon = new Date(`${today}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  const horizonEnd = horizon.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("v_payments")
    .select("amount,due_date")
    .is("paid_at", null)
    .gte("due_date", today)
    .lte("due_date", horizonEnd)
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);

  const byWeek = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.due_date) continue;
    const key = mondayOf(row.due_date);
    byWeek.set(key, (byWeek.get(key) ?? 0) + (row.amount ?? 0));
  }

  const weeks: M6Week[] = [];
  let cumulative = 0;
  for (const [weekStart, amount] of [...byWeek.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    cumulative += amount;
    weeks.push({
      weekStart,
      label: formatInTimeZone(
        new Date(`${weekStart}T12:00:00Z`),
        APP_TIMEZONE,
        "d MMM",
      ),
      amount: round2(amount),
      cumulative: round2(cumulative),
    });
  }

  return { weeks, total: round2(cumulative), horizonEnd };
}

// M7 · Backlog comprometido ---------------------------------------------------------

export type M7Row = {
  project_id: string;
  name: string;
  price_net: number;
  collected: number;
  pending: number;
};

export type M7Data = {
  total: number;
  rows: M7Row[];
};

export async function getM7(period: MetricPeriod): Promise<M7Data> {
  const rows = (await loadProjectRows(period)).filter(
    (row) => row.status === "a_empezar" || row.status === "en_desarrollo",
  );
  const breakdown: M7Row[] = rows.map((row) => ({
    project_id: row.project_id,
    name: row.name,
    price_net: row.price_net,
    collected: row.collected,
    pending: round2(row.price_net - row.collected),
  }));
  breakdown.sort((a, b) => b.pending - a.pending);
  return {
    total: round2(
      breakdown.reduce((sum, row) => sum + row.pending, 0),
    ),
    rows: breakdown,
  };
}
