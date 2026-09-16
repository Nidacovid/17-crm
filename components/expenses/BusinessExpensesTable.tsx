"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { MoreVertical, Receipt } from "lucide-react";
import {
  deleteBusinessExpense,
  endBusinessExpense,
} from "@/lib/actions/expenses";
import {
  BUSINESS_EXPENSE_CATEGORY,
  EXPENSE_RECURRENCE,
} from "@/lib/constants/categories";
import { APP_TIMEZONE } from "@/lib/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { MoneyText } from "@/components/shared/MoneyText";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { formatDate } from "@/lib/format";
import type { BusinessExpenseRow } from "@/lib/queries/expenses";

function isActive(expense: BusinessExpenseRow): boolean {
  const today = formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
  return expense.ends_on === null || expense.ends_on >= today;
}

// Tabla de gastos generales del negocio (7.2). Columnas exigidas por la fase:
// concepto · categoría · importe · recurrencia · desde · hasta · estado.
export function BusinessExpensesTable({
  rows,
}: {
  rows: BusinessExpenseRow[];
}) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<BusinessExpenseRow | null>(null);
  const [endTarget, setEndTarget] = useState<BusinessExpenseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessExpenseRow | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function confirmEnd() {
    if (!endTarget) return;
    setBusy(true);
    const result = await endBusinessExpense(endTarget.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo finalizar el gasto.");
      return;
    }
    toast.success("Gasto finalizado");
    setEndTarget(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteBusinessExpense(deleteTarget.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo eliminar el gasto.");
      return;
    }
    toast.success("Gasto eliminado");
    setDeleteTarget(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-surface">
        <EmptyState
          icon={Receipt}
          title="Sin gastos que mostrar"
          description="Añade un gasto fijo o puntual para que el beneficio neto sea real. Si has filtrado, prueba a mostrar los finalizados."
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
              <TableHead className="text-xs text-secondary">Categoría</TableHead>
              <TableHead className="text-xs text-secondary">Importe</TableHead>
              <TableHead className="text-xs text-secondary">
                Recurrencia
              </TableHead>
              <TableHead className="text-xs text-secondary">Desde</TableHead>
              <TableHead className="text-xs text-secondary">Hasta</TableHead>
              <TableHead className="text-xs text-secondary">Estado</TableHead>
              <TableHead className="w-10" aria-label="Acciones" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((expense) => {
              const active = isActive(expense);
              return (
                <TableRow key={expense.id}>
                  <TableCell className="max-w-[220px] truncate text-[13px] text-primary">
                    {expense.concept}
                  </TableCell>
                  <TableCell className="text-[13px] text-secondary">
                    {BUSINESS_EXPENSE_CATEGORY[expense.category]}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    <MoneyText value={expense.amount} />
                  </TableCell>
                  <TableCell className="text-[13px] text-secondary">
                    {EXPENSE_RECURRENCE[expense.recurrence]}
                  </TableCell>
                  <TableCell className="num text-[13px] text-secondary">
                    {formatDate(expense.starts_on)}
                  </TableCell>
                  <TableCell className="num text-[13px] text-secondary">
                    {expense.ends_on ? formatDate(expense.ends_on) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        active
                          ? "border-accent/30 bg-accent/12 text-accent"
                          : "border-muted/30 bg-muted/12 text-muted"
                      }
                    >
                      {active ? "Activo" : "Finalizado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-10 pr-1 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones del gasto ${expense.concept}`}
                        >
                          <MoreVertical aria-hidden strokeWidth={1.5} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(expense)}>
                          Editar
                        </DropdownMenuItem>
                        {active ? (
                          <DropdownMenuItem
                            onClick={() => setEndTarget(expense)}
                          >
                            Finalizar gasto
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(expense)}
                        >
                          Eliminar gasto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ExpenseForm
        expense={editTarget ?? undefined}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <ConfirmDialog
        open={endTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEndTarget(null);
        }}
        title="Finalizar gasto"
        description={`«${endTarget?.concept ?? "Este gasto"}» pasará a estar finalizado hoy. No se borra: los meses anteriores siguen contando en el P&L histórico y deja de imputarse en los meses futuros.`}
        confirmLabel="Finalizar gasto"
        busy={busy}
        onConfirm={confirmEnd}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar gasto"
        description={`Se eliminará «${deleteTarget?.concept ?? "este gasto"}» de todos los meses. Si solo quieres que deje de contar a partir de ahora, usa "Finalizar gasto".`}
        confirmLabel="Eliminar gasto"
        destructive
        busy={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
