import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/dates";
import type { Database } from "@/types/database";

export type ProjectExpenseCategory =
  Database["public"]["Enums"]["project_expense_category"];
export type BusinessExpenseCategory =
  Database["public"]["Enums"]["business_expense_category"];
export type ExpenseRecurrence =
  Database["public"]["Enums"]["expense_recurrence"];

export type ProjectExpenseRow = {
  id: string;
  concept: string;
  category: ProjectExpenseCategory;
  amount: number;
  incurred_on: string;
};

export type BusinessExpenseRow = {
  id: string;
  concept: string;
  category: BusinessExpenseCategory;
  amount: number;
  recurrence: ExpenseRecurrence;
  starts_on: string;
  ends_on: string | null;
  notes: string | null;
};

export type BusinessExpenseMonthRow = {
  expense_id: string;
  amount: number;
  month: string;
};

export type BusinessExpenseKpis = {
  fixedMonthly: number;
  currentMonth: number;
  lastTwelveMonths: number;
};

// Regla 2.2.12: columnas explícitas, nunca select('*').
export const PROJECT_EXPENSE_COLUMNS =
  "id,concept,category,amount,incurred_on";

export const BUSINESS_EXPENSE_COLUMNS =
  "id,concept,category,amount,recurrence,starts_on,ends_on,notes";

// Lectura de los gastos extra de un proyecto (7.1), de más reciente a más antiguo.
export async function getProjectExpenses(
  projectId: string,
): Promise<ProjectExpenseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_expenses")
    .select(PROJECT_EXPENSE_COLUMNS)
    .eq("project_id", projectId)
    .order("incurred_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectExpenseRow[];
}

// Lectura de los gastos generales del negocio (7.2).
export async function getBusinessExpenses(): Promise<BusinessExpenseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_expenses")
    .select(BUSINESS_EXPENSE_COLUMNS)
    .order("starts_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessExpenseRow[];
}

// Expansión de recurrencias por mes (v_business_expense_months).
export async function getBusinessExpenseMonths(): Promise<
  BusinessExpenseMonthRow[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_business_expense_months")
    .select("expense_id,amount,month");
  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessExpenseMonthRow[];
}

// Gasto fijo mensual = recurrentes activos normalizados a mes (7.2):
// mensual = importe; trimestral = importe / 3; anual = importe / 12.
function toMonthly(amount: number, recurrence: ExpenseRecurrence): number {
  if (recurrence === "mensual") return amount;
  if (recurrence === "trimestral") return amount / 3;
  if (recurrence === "anual") return amount / 12;
  return 0;
}

// KPIs de la cabecera de /gastos (7.2). "Este mes" y "últimos 12 meses" leen la
// expansión real de recurrencias (gasto efectivo del periodo), no la
// normalización del KPI fijo.
export function computeBusinessExpenseKpis(
  rows: BusinessExpenseRow[],
  months: BusinessExpenseMonthRow[],
  now: Date = new Date(),
): BusinessExpenseKpis {
  const today = formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");
  const currentMonthKey = today.slice(0, 7);

  let fixedMonthly = 0;
  for (const row of rows) {
    const active =
      row.starts_on <= today && (row.ends_on === null || row.ends_on >= today);
    if (active) fixedMonthly += toMonthly(row.amount, row.recurrence);
  }

  const [year, month] = currentMonthKey.split("-").map(Number);
  const lastTwelveKeys = new Set<string>();
  for (let index = 0; index < 12; index += 1) {
    const cursor = new Date(Date.UTC(year, month - 1 - index, 1));
    const key = `${cursor.getUTCFullYear()}-${String(
      cursor.getUTCMonth() + 1,
    ).padStart(2, "0")}`;
    lastTwelveKeys.add(key);
  }

  let currentMonth = 0;
  let lastTwelveMonths = 0;
  for (const row of months) {
    const key = row.month.slice(0, 7);
    if (key === currentMonthKey) currentMonth += row.amount;
    if (lastTwelveKeys.has(key)) lastTwelveMonths += row.amount;
  }

  return {
    fixedMonthly: round2(fixedMonthly),
    currentMonth: round2(currentMonth),
    lastTwelveMonths: round2(lastTwelveMonths),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
