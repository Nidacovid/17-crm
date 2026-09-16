"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { z as zod } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/dates";

const uuidSchema = zod.string().uuid();

export type PaymentActionResult =
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

function revalidateProjectPayments(projectId: string) {
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath("/");
}

// Fecha de hoy en Europe/Madrid como ISO corto (paid_at es date).
function todayISO(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
}

// Fila del plan propuesto por el editor (6.1). Las filas cobradas se envían
// solo para conservar el orden; el servidor nunca las toca ni las borra.
const paymentPlanRowSchema = zod.object({
  id: uuidSchema.optional(),
  label: zod.string().trim().max(120).optional(),
  amount: zod.coerce.number().positive().max(9999999999.99),
  due_date: zod.iso.date(),
  paid: zod.boolean().default(false),
});

export type PaymentPlanRowInput = z.input<typeof paymentPlanRowSchema>;

// 6.3: regenera el plan de forma transaccional en cuanto al alcance: borra
// TODAS las filas no pagadas del proyecto y crea las nuevas; una fila ya
// cobrada (paid_at) jamás se borra, para no perder el historial de cobros.
export async function generatePaymentPlan(
  projectId: string,
  rows: PaymentPlanRowInput[],
): Promise<PaymentActionResult> {
  if (!uuidSchema.safeParse(projectId).success) {
    return { ok: false, error: "Identificador de proyecto no válido." };
  }

  const parsedRows: z.infer<typeof paymentPlanRowSchema>[] = [];
  for (const row of rows) {
    const parsed = paymentPlanRowSchema.safeParse(row);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Revisa el importe y la fecha de cada fila del plan.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }
    if (!parsed.data.paid) parsedRows.push(parsed.data);
  }

  const supabase = await createClient();

  // Se conservan las filas cobradas: sus seq quedan reservadas.
  const { data: paidRows, error: paidError } = await supabase
    .from("payments")
    .select("seq")
    .eq("project_id", projectId)
    .not("paid_at", "is", null);
  if (paidError) return { ok: false, error: paidError.message };

  const usedSeqs = new Set<number>(
    (paidRows ?? []).map((row) => Number(row.seq)),
  );

  // Borrado de las filas no pagadas (6.3: nunca borra una fila ya pagada).
  const { error: deleteError } = await supabase
    .from("payments")
    .delete()
    .eq("project_id", projectId)
    .is("paid_at", null);
  if (deleteError) return { ok: false, error: deleteError.message };

  if (parsedRows.length === 0) {
    revalidateProjectPayments(projectId);
    return { ok: true };
  }

  // Seqs consecutivas saltando las reservadas por cobros históricos.
  const toInsert = parsedRows.map((row) => {
    let seq = 1;
    while (usedSeqs.has(seq)) seq += 1;
    usedSeqs.add(seq);
    return {
      project_id: projectId,
      seq,
      label: row.label || null,
      amount: row.amount,
      due_date: row.due_date,
      // 6.2: todo pago nuevo queda pendiente de sincronizar con el calendario.
      sync_state: "pendiente" as const,
    };
  });

  const { error: insertError } = await supabase
    .from("payments")
    .insert(toInsert);
  if (insertError) return { ok: false, error: insertError.message };

  revalidateProjectPayments(projectId);
  return { ok: true };
}

const upsertPaymentInputSchema = zod.object({
  id: uuidSchema.optional(),
  project_id: uuidSchema,
  seq: zod.coerce.number().int().min(1).max(32767).optional(),
  label: zod.string().trim().max(120).optional(),
  amount: zod.coerce.number().positive().max(9999999999.99),
  due_date: zod.iso.date(),
  paid_at: zod.iso.date().nullable().optional(),
  method: zod.string().trim().max(60).nullable().optional(),
});

export type PaymentUpsertInput = z.input<typeof upsertPaymentInputSchema>;

// Alta o modificación manual de un pago (p. ej. cobrar en otra fecha).
// 6.2: al crear o modificar, sync_state = 'pendiente'.
export async function upsertPayment(
  input: PaymentUpsertInput,
): Promise<PaymentActionResult> {
  const parsed = upsertPaymentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const { id, project_id, seq, label, amount, due_date, paid_at, method } =
    parsed.data;

  const supabase = await createClient();

  if (id) {
    const { data: existing, error: selectError } = await supabase
      .from("payments")
      .select("project_id")
      .eq("id", id)
      .maybeSingle();
    if (selectError) return { ok: false, error: selectError.message };
    if (!existing) return { ok: false, error: "El pago ya no existe." };

    const { error } = await supabase
      .from("payments")
      .update({
        label: label || null,
        amount,
        due_date,
        paid_at: paid_at ?? null,
        method: method || null,
        sync_state: "pendiente",
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidateProjectPayments(existing.project_id);
    return { ok: true };
  }

  let nextSeq = seq;
  if (!nextSeq) {
    const { data: last, error: seqError } = await supabase
      .from("payments")
      .select("seq")
      .eq("project_id", project_id)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (seqError) return { ok: false, error: seqError.message };
    nextSeq = (last?.seq ?? 0) + 1;
  }

  const { error } = await supabase.from("payments").insert({
    project_id,
    seq: nextSeq,
    label: label || null,
    amount,
    due_date,
    paid_at: paid_at ?? null,
    method: method || null,
    sync_state: "pendiente",
  });
  if (error) return { ok: false, error: error.message };

  revalidateProjectPayments(project_id);
  return { ok: true };
}

// Borrado manual de un pago no cobrado; bloqueado si está pagado (6.3).
export async function deletePayment(
  paymentId: string,
): Promise<PaymentActionResult> {
  if (!uuidSchema.safeParse(paymentId).success) {
    return { ok: false, error: "Identificador de pago no válido." };
  }

  const supabase = await createClient();
  const { data: payment, error: selectError } = await supabase
    .from("payments")
    .select("project_id,paid_at")
    .eq("id", paymentId)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!payment) return { ok: false, error: "El pago ya no existe." };
  if (payment.paid_at) {
    return {
      ok: false,
      error: "No se puede eliminar un pago ya cobrado.",
    };
  }

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectPayments(payment.project_id);
  return { ok: true };
}

// Marcar como cobrado hoy (6.1): paid_at = current_date, sync_state pendiente
// (la sincronización con el calendario llega más adelante, 6.2).
export async function markPaid(
  paymentId: string,
): Promise<PaymentActionResult> {
  if (!uuidSchema.safeParse(paymentId).success) {
    return { ok: false, error: "Identificador de pago no válido." };
  }

  const supabase = await createClient();
  const { data: payment, error: selectError } = await supabase
    .from("payments")
    .select("project_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!payment) return { ok: false, error: "El pago ya no existe." };

  const { error } = await supabase
    .from("payments")
    .update({ paid_at: todayISO(), sync_state: "pendiente" })
    .eq("id", paymentId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectPayments(payment.project_id);
  return { ok: true };
}

// Desmarcar: paid_at = null y sync_state pendiente (6.1/6.2).
export async function markUnpaid(
  paymentId: string,
): Promise<PaymentActionResult> {
  if (!uuidSchema.safeParse(paymentId).success) {
    return { ok: false, error: "Identificador de pago no válido." };
  }

  const supabase = await createClient();
  const { data: payment, error: selectError } = await supabase
    .from("payments")
    .select("project_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!payment) return { ok: false, error: "El pago ya no existe." };

  const { error } = await supabase
    .from("payments")
    .update({ paid_at: null, sync_state: "pendiente" })
    .eq("id", paymentId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectPayments(payment.project_id);
  return { ok: true };
}
