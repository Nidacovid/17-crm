import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type PaymentStatus = "pagado" | "pendiente" | "vencido";
export type SyncState = Database["public"]["Enums"]["sync_state"];

// Estado derivado de v_payments (sección 4.3): nunca se almacena.
export type PaymentListRow = {
  id: string;
  seq: number;
  label: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
  method: string | null;
  status: PaymentStatus;
  days_overdue: number;
  sync_state: SyncState;
};

// Regla 2.2.12: columnas explícitas, nunca select('*').
export const PAYMENT_COLUMNS =
  "id,seq,label,amount,due_date,paid_at,method,status,days_overdue,sync_state";

const PAYMENT_STATUSES: readonly string[] = ["pagado", "pendiente", "vencido"];

export function normalizePaymentRow(
  row: Record<string, unknown>,
): PaymentListRow | null {
  if (typeof row.id !== "string" || typeof row.due_date !== "string") {
    return null;
  }
  const status =
    typeof row.status === "string" && PAYMENT_STATUSES.includes(row.status)
      ? (row.status as PaymentStatus)
      : "pendiente";
  return {
    id: row.id,
    seq: typeof row.seq === "number" ? row.seq : 0,
    label: typeof row.label === "string" ? row.label : null,
    amount: typeof row.amount === "number" ? row.amount : 0,
    due_date: row.due_date,
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    method: typeof row.method === "string" ? row.method : null,
    status,
    days_overdue: typeof row.days_overdue === "number" ? row.days_overdue : 0,
    sync_state: (row.sync_state ?? "pendiente") as SyncState,
  };
}

// Lectura de los pagos de un proyecto desde v_payments, ordenados por seq.
// La consumen la ficha (PaymentsTable) y el editor del plan.
export async function getProjectPayments(
  projectId: string,
): Promise<PaymentListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_payments")
    .select(PAYMENT_COLUMNS)
    .eq("project_id", projectId)
    .order("seq", { ascending: true });
  if (error) throw new Error(error.message);

  const rows: PaymentListRow[] = [];
  for (const row of data ?? []) {
    const normalized = normalizePaymentRow(row as Record<string, unknown>);
    if (normalized) rows.push(normalized);
  }
  return rows;
}
