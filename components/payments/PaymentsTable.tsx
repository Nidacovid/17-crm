"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/shared/DateField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaymentRow } from "@/components/payments/PaymentRow";
import { createClient } from "@/lib/supabase/client";
import {
  deletePayment,
  markPaid,
  markUnpaid,
  upsertPayment,
} from "@/lib/actions/payments";
import type { PaymentListRow } from "@/lib/queries/payments";
import { formatEUR } from "@/lib/format";

// Lectura en cliente (excepción de la regla 2.4.22). Columnas y normalización
// duplicadas aquí porque lib/queries/* es solo para el servidor: importa
// next/headers y no puede entrar en el bundle de cliente (igual que hace el
// kanban con TASK_COLUMNS). Regla 2.2.12: columnas explícitas.
const PAYMENT_COLUMNS =
  "id,seq,label,amount,due_date,paid_at,method,status,days_overdue,sync_state";

const PAYMENT_STATUSES: readonly string[] = ["pagado", "pendiente", "vencido"];

function normalizePaymentRow(
  row: Record<string, unknown>,
): PaymentListRow | null {
  if (typeof row.id !== "string" || typeof row.due_date !== "string") {
    return null;
  }
  const status =
    typeof row.status === "string" && PAYMENT_STATUSES.includes(row.status)
      ? (row.status as PaymentListRow["status"])
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
    sync_state: (row.sync_state ?? "pendiente") as PaymentListRow["sync_state"],
  };
}

// Lectura en cliente con TanStack Query: caché + actualización optimista.
async function fetchPayments(projectId: string): Promise<PaymentListRow[]> {
  const supabase = createClient();
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

function statusFor(payment: PaymentListRow): PaymentListRow["status"] {
  if (payment.paid_at) return "pagado";
  const today = new Date().toISOString().slice(0, 10);
  return payment.due_date < today ? "vencido" : "pendiente";
}

// Tabla de pagos en modo lectura (6.1): una fila por pago con el estado
// derivado de v_payments, casilla de cobrado y pie Cobrado X de Y / Pendiente Z.
export function PaymentsTable({
  projectId,
  initialPayments,
}: {
  projectId: string;
  initialPayments: PaymentListRow[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dateTarget, setDateTarget] = useState<PaymentListRow | null>(null);
  const [chosenDate, setChosenDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PaymentListRow | null>(null);

  const queryKey = ["payments", projectId] as const;

  const { data: payments = initialPayments } = useQuery({
    queryKey,
    queryFn: () => fetchPayments(projectId),
    initialData: initialPayments,
  });

  function patchPayment(
    paymentId: string,
    patch: Partial<PaymentListRow>,
  ) {
    queryClient.setQueryData<PaymentListRow[]>(queryKey, (old) =>
      (old ?? []).map((payment) =>
        payment.id === paymentId ? { ...payment, ...patch } : payment,
      ),
    );
  }

  const toggleMutation = useMutation({
    mutationFn: ({
      paymentId,
      paid,
    }: {
      paymentId: string;
      paid: boolean;
    }) => (paid ? markPaid(paymentId) : markUnpaid(paymentId)),
    onMutate: async ({ paymentId, paid }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PaymentListRow[]>(queryKey);
      const today = new Date().toISOString().slice(0, 10);
      const current = (previous ?? []).find(
        (payment) => payment.id === paymentId,
      );
      if (current) {
        patchPayment(paymentId, {
          paid_at: paid ? today : null,
          status: paid ? "pagado" : statusFor({ ...current, paid_at: null }),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("No se pudo actualizar el cobro. Vuelve a intentarlo.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      router.refresh();
    },
  });

  const dateMutation = useMutation({
    mutationFn: ({
      payment,
      date,
    }: {
      payment: PaymentListRow;
      date: string;
    }) =>
      upsertPayment({
        id: payment.id,
        project_id: projectId,
        seq: payment.seq,
        label: payment.label ?? undefined,
        amount: payment.amount,
        due_date: payment.due_date,
        paid_at: date,
      }),
    onMutate: async ({ payment, date }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PaymentListRow[]>(queryKey);
      patchPayment(payment.id, { paid_at: date, status: "pagado" });
      return { previous };
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo guardar la fecha de cobro.");
        return;
      }
      toast.success("Fecha de cobro guardada");
      setDateTarget(null);
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("No se pudo guardar la fecha de cobro.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onMutate: async (paymentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PaymentListRow[]>(queryKey);
      queryClient.setQueryData<PaymentListRow[]>(
        queryKey,
        (old) => (old ?? []).filter((payment) => payment.id !== paymentId),
      );
      return { previous };
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo eliminar el pago.");
        return;
      }
      toast.success("Pago eliminado");
      setDeleteTarget(null);
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("No se pudo eliminar el pago.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      router.refresh();
    },
  });

  const busy =
    toggleMutation.isPending ||
    dateMutation.isPending ||
    deleteMutation.isPending;

  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const collected = payments
    .filter((payment) => payment.paid_at !== null)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pending = total - collected;

  function openDateDialog(payment: PaymentListRow) {
    setChosenDate(payment.paid_at ?? "");
    setDateTarget(payment);
  }

  function confirmDate() {
    if (!dateTarget || !chosenDate) return;
    dateMutation.mutate({ payment: dateTarget, date: chosenDate });
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-surface">
        <EmptyState
          icon={Banknote}
          title="Sin pagos registrados"
          description="Configura el precio y el plan de pagos al editar la ficha del proyecto."
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-subtle bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs text-secondary">Concepto</TableHead>
              <TableHead className="text-xs text-secondary">Importe</TableHead>
              <TableHead className="text-xs text-secondary">Fecha</TableHead>
              <TableHead className="text-xs text-secondary">Estado</TableHead>
              <TableHead className="text-xs text-secondary">Cobrado</TableHead>
              <TableHead className="w-10" aria-label="Acciones" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                busy={busy}
                onToggle={(target, checked) =>
                  toggleMutation.mutate({
                    paymentId: target.id,
                    paid: checked,
                  })
                }
                onChooseDate={openDateDialog}
                onDelete={(target) => setDeleteTarget(target)}
              />
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle px-3 py-2.5 text-xs text-secondary">
          <span className="num">
            Cobrado {formatEUR(collected)} de {formatEUR(total)}
          </span>
          <span className="num">Pendiente {formatEUR(pending)}</span>
        </div>
      </div>

      <Dialog
        open={dateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDateTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dateTarget?.paid_at
                ? "Editar fecha de cobro"
                : "Cobrar en otra fecha"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Fecha de cobro</Label>
            <DateField
              value={chosenDate}
              onChange={setChosenDate}
              className="w-full justify-start"
              aria-label="Fecha de cobro"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDateTarget(null)}
              disabled={dateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmDate}
              disabled={dateMutation.isPending || !chosenDate}
            >
              {dateMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar pago"
        description={`Se eliminará «${deleteTarget?.label ?? "este pago"}» de ${formatEUR(
          deleteTarget?.amount ?? 0,
        )}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar pago"
        destructive
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}
