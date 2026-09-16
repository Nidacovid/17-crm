"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { z as zod } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/dates";
import {
  projectExpenseSchema,
  type ProjectExpenseInput,
} from "@/lib/schemas/projectExpense";
import {
  businessExpenseSchema,
  type BusinessExpenseInput,
} from "@/lib/schemas/businessExpense";

const uuidSchema = zod.string().uuid();

export type ExpenseActionResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function todayISO(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
}

// Fase 7.3: mutaciones de gastos extra de proyecto (7.1) y de gastos generales
// del negocio (7.2). Ambas afectan al margen y al beneficio neto, así que se
// revalida también Home.

function revalidateProjectExpenses(projectId: string) {
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath("/");
}

function revalidateBusinessExpenses() {
  revalidatePath("/gastos");
  revalidatePath("/");
}

// Los cuatro campos editables de un gasto extra (el proyecto no se cambia).
const projectExpenseEditSchema = projectExpenseSchema.omit({ project_id: true });
export type ProjectExpenseUpdateInput = z.input<
  typeof projectExpenseEditSchema
>;

export async function createProjectExpense(
  input: ProjectExpenseInput,
): Promise<ExpenseActionResult> {
  const parsed = projectExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const { project_id, concept, category, amount, incurred_on } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("project_expenses").insert({
    project_id,
    concept,
    category,
    amount,
    incurred_on,
  });
  if (error) return { ok: false, error: error.message };

  revalidateProjectExpenses(project_id);
  return { ok: true };
}

export async function updateProjectExpense(
  id: string,
  input: ProjectExpenseUpdateInput,
): Promise<ExpenseActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de gasto no válido." };
  }
  const parsed = projectExpenseEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const { concept, category, amount, incurred_on } = parsed.data;

  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("project_expenses")
    .select("project_id")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!existing) return { ok: false, error: "El gasto ya no existe." };

  const { error } = await supabase
    .from("project_expenses")
    .update({ concept, category, amount, incurred_on })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateProjectExpenses(existing.project_id);
  return { ok: true };
}

export async function deleteProjectExpense(
  id: string,
): Promise<ExpenseActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de gasto no válido." };
  }

  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("project_expenses")
    .select("project_id")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!existing) return { ok: false, error: "El gasto ya no existe." };

  const { error } = await supabase
    .from("project_expenses")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateProjectExpenses(existing.project_id);
  return { ok: true };
}

export async function createBusinessExpense(
  input: BusinessExpenseInput,
): Promise<ExpenseActionResult> {
  const parsed = businessExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const { concept, category, amount, recurrence, starts_on, ends_on, notes } =
    parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("business_expenses").insert({
    concept,
    category,
    amount,
    recurrence,
    starts_on,
    ends_on: ends_on ?? null,
    notes: notes ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidateBusinessExpenses();
  return { ok: true };
}

export async function updateBusinessExpense(
  id: string,
  input: BusinessExpenseInput,
): Promise<ExpenseActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de gasto no válido." };
  }
  const parsed = businessExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const { concept, category, amount, recurrence, starts_on, ends_on, notes } =
    parsed.data;

  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("business_expenses")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!existing) return { ok: false, error: "El gasto ya no existe." };

  const { error } = await supabase
    .from("business_expenses")
    .update({
      concept,
      category,
      amount,
      recurrence,
      starts_on,
      ends_on: ends_on ?? null,
      notes: notes ?? null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateBusinessExpenses();
  return { ok: true };
}

// 7.2: "Finalizar gasto" rellena ends_on con hoy en vez de borrar, para que los
// meses anteriores sigan contando en el P&L histórico.
export async function endBusinessExpense(
  id: string,
): Promise<ExpenseActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de gasto no válido." };
  }

  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("business_expenses")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!existing) return { ok: false, error: "El gasto ya no existe." };

  const { error } = await supabase
    .from("business_expenses")
    .update({ ends_on: todayISO() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateBusinessExpenses();
  return { ok: true };
}

export async function deleteBusinessExpense(
  id: string,
): Promise<ExpenseActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de gasto no válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_expenses")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateBusinessExpenses();
  return { ok: true };
}
