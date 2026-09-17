import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/dates";
import { listGoogleEvents } from "@/lib/google/calendar";
import type { ProjectStatusKey } from "@/lib/queries/projects";

function todayISO(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
}

// Clave de mes "yyyy-MM" desplazada en N meses respecto a una fecha ISO.
function monthKeyOffset(isoDate: string, offset: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function monthBounds(monthKey: string): { start: string; end: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const label = formatInTimeZone(
    new Date(Date.UTC(year, month - 1, 1, 12)),
    APP_TIMEZONE,
    "MMMM yyyy",
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// 8.2 RevenueCard — Facturación del mes
// ---------------------------------------------------------------------------

export type HomeRevenue = {
  total: number;
  previous: number;
  variationPct: number | null;
  pendingThisMonth: number;
  monthLabel: string;
};

export async function getHomeRevenue(): Promise<HomeRevenue> {
  const supabase = await createClient();
  const today = todayISO();
  const currentKey = today.slice(0, 7);
  const previousKey = monthKeyOffset(today, -1);
  const current = monthBounds(currentKey);

  const { data, error } = await supabase
    .from("v_payments")
    .select("amount,paid_at,due_date");
  if (error) throw new Error(error.message);

  let total = 0;
  let previous = 0;
  let pendingThisMonth = 0;

  for (const row of data ?? []) {
    const amount = row.amount ?? 0;
    if (row.paid_at) {
      const paidMonth = row.paid_at.slice(0, 7);
      if (paidMonth === currentKey) total += amount;
      else if (paidMonth === previousKey) previous += amount;
    } else if (
      row.due_date &&
      row.due_date >= current.start &&
      row.due_date <= current.end
    ) {
      pendingThisMonth += amount;
    }
  }

  const variationPct =
    previous > 0
      ? Math.round(((total - previous) / previous) * 1000) / 10
      : null;

  return {
    total: round2(total),
    previous: round2(previous),
    variationPct,
    pendingThisMonth: round2(pendingThisMonth),
    monthLabel: monthLabel(currentKey),
  };
}

// ---------------------------------------------------------------------------
// 8.3 ActiveProjectsCard — Proyectos actuales
// ---------------------------------------------------------------------------

export type HomeProjectRow = {
  id: string;
  name: string;
  business_name: string;
  status: ProjectStatusKey;
  tasks_done: number;
};

export async function getActiveProjects(): Promise<HomeProjectRow[]> {
  const supabase = await createClient();

  const [totalsResult, clientsResult] = await Promise.all([
    supabase
      .from("v_project_totals")
      .select("project_id,name,status,client_id,tasks_done")
      .in("status", ["en_desarrollo", "a_empezar"])
      .order("name", { ascending: true }),
    supabase.from("clients").select("id,business_name"),
  ]);

  if (totalsResult.error) throw new Error(totalsResult.error.message);
  if (clientsResult.error) throw new Error(clientsResult.error.message);

  const businessByClient = new Map<string, string>();
  for (const client of clientsResult.data ?? []) {
    businessByClient.set(client.id, client.business_name);
  }

  const rows: HomeProjectRow[] = [];
  for (const row of totalsResult.data ?? []) {
    if (!row.project_id || !row.status) continue;
    rows.push({
      id: row.project_id,
      name: row.name ?? "",
      business_name: businessByClient.get(row.client_id ?? "") ?? "",
      status: row.status,
      tasks_done: row.tasks_done ?? 0,
    });
  }

  const inDevelopment = rows.filter(
    (row) => row.status === "en_desarrollo",
  );
  if (inDevelopment.length >= 3) return inDevelopment.slice(0, 5);

  // 8.3: menos de 3 en desarrollo → se completa con "A empezar" hasta 5.
  const toStart = rows.filter((row) => row.status === "a_empezar");
  const result = [...inDevelopment];
  for (const row of toStart) {
    if (result.length >= 5) break;
    result.push(row);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 8.4 CalendarCard — Calendario del mes
// ---------------------------------------------------------------------------

export type HomeCalendarEvent = {
  id: string;
  date: string;
  label: string;
  overdue: boolean;
};

// Vencimientos de cobro leídos de v_payments (8.4). Se devuelven todos los
// pendientes para poder navegar entre meses en el cliente.
export async function getHomeCalendar(): Promise<HomeCalendarEvent[]> {
  const supabase = await createClient();
  const today = todayISO();

  const { data, error } = await supabase
    .from("v_payments")
    .select("id,due_date,client_business_name,project_name")
    .is("paid_at", null);
  if (error) throw new Error(error.message);

  const events: HomeCalendarEvent[] = [];
  for (const row of data ?? []) {
    if (!row.due_date || !row.id) continue;
    events.push({
      id: row.id,
      date: row.due_date,
      label: row.client_business_name ?? row.project_name ?? "",
      overdue: row.due_date < today,
    });
  }
  return events;
}

// ---------------------------------------------------------------------------
// 8.5 TodayCard — Hoy (D-14)
// ---------------------------------------------------------------------------

export type HomeTodayPayment = {
  id: string;
  client: string;
  amount: number;
  due_date: string;
  project_id: string;
  overdue: boolean;
};

export type HomeTodayTask = {
  id: string;
  title: string;
  project_id: string;
  project_name: string;
};

export type HomeToday = {
  payments: HomeTodayPayment[];
  tasks: HomeTodayTask[];
  // 10.6: eventos de hoy del calendario principal de Google. Vacío mientras
  // no haya conexión (la sección "Eventos de hoy" se oculta).
  calendarEvents: { id: string; title: string }[];
};

export async function getTodayPanel(): Promise<HomeToday> {
  const supabase = await createClient();
  const today = todayISO();

  const [
    paymentsResult,
    tasksResult,
    projectsResult,
    { data: { user } },
  ] = await Promise.all([
    supabase
      .from("v_payments")
      .select("id,amount,due_date,client_business_name,project_id")
      .is("paid_at", null)
      .lte("due_date", today)
      .order("due_date", { ascending: true }),
    supabase
      .from("tasks")
      .select("id,title,project_id,position")
      .eq("status", "doing")
      .order("position", { ascending: true }),
    supabase.from("projects").select("id,name"),
    supabase.auth.getUser(),
  ]);

  if (paymentsResult.error) throw new Error(paymentsResult.error.message);
  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);

  const projectNames = new Map<string, string>();
  for (const project of projectsResult.data ?? []) {
    projectNames.set(project.id, project.name);
  }

  const payments: HomeTodayPayment[] = [];
  for (const row of paymentsResult.data ?? []) {
    if (!row.id || !row.due_date) continue;
    payments.push({
      id: row.id,
      client: row.client_business_name ?? "",
      amount: row.amount ?? 0,
      due_date: row.due_date,
      project_id: row.project_id ?? "",
      overdue: row.due_date < today,
    });
  }

  const tasks: HomeTodayTask[] = (tasksResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    project_id: row.project_id,
    project_name: projectNames.get(row.project_id) ?? "",
  }));

  // Fase 10 (10.6 / D-14): eventos de hoy del calendario principal de
  // Google. Los del calendario de Cobros se excluyen porque los cobros ya
  // están en la sección "Cobros" con sus datos internos; sin conexión la
  // lista queda vacía y la sección se oculta.
  let calendarEvents: { id: string; title: string }[] = [];
  if (user) {
    const google = await listGoogleEvents(user.id, today, today);
    calendarEvents = google.events
      .filter((event) => event.source === "principal")
      .filter((event) => {
        const startDay = event.start.slice(0, 10);
        const endDay = event.end.slice(0, 10);
        return startDay <= today && endDay >= today;
      })
      .map((event) => ({ id: event.id, title: event.title }));
  }

  return { payments, tasks, calendarEvents };
}
