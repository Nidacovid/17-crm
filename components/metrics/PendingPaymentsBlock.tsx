import Link from "next/link";
import { Banknote } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { MoneyText } from "@/components/shared/MoneyText";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PendingPaymentRow } from "@/lib/queries/metrics";

// Bloque "Pagos pendientes" (7.1, requisito literal): lista de v_payments con
// estado <> 'pagado', ordenada por due_date ascendente. Al pulsar el nombre del
// cliente se abre la ficha del proyecto para poder marcar el cobro.
export function PendingPaymentsBlock({
  rows,
}: {
  rows: PendingPaymentRow[];
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-subtle bg-surface">
      <header className="flex items-center justify-between border-b border-subtle px-5 py-4">
        <div>
          <h2 className="text-sm font-medium text-primary">Pagos pendientes</h2>
          <p className="mt-1 text-xs text-secondary">
            Cobros emitidos y todavía sin fecha de cobro.
          </p>
        </div>
        <span className="num text-xs text-muted">{rows.length} pagos</span>
      </header>
      {rows.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No hay pagos pendientes"
          description="Todos los cobros emitidos están marcados como pagados."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs text-secondary">Cliente</TableHead>
              <TableHead className="text-xs text-secondary">Proyecto</TableHead>
              <TableHead className="text-right text-xs text-secondary">
                Importe
              </TableHead>
              <TableHead className="text-xs text-secondary">Fecha</TableHead>
              <TableHead className="text-right text-xs text-secondary">
                Días de retraso
              </TableHead>
              <TableHead className="text-xs text-secondary">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs">
                  {row.project_id ? (
                    <Link
                      href={`/proyectos/${row.project_id}`}
                      className="text-accent hover:underline"
                    >
                      {row.client}
                    </Link>
                  ) : (
                    <span className="text-primary">{row.client}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-secondary">
                  {row.project_name}
                </TableCell>
                <TableCell className="text-right text-xs text-primary">
                  <MoneyText value={row.amount} />
                </TableCell>
                <TableCell className="num text-xs text-secondary">
                  {formatDate(row.due_date)}
                </TableCell>
                <TableCell
                  className={cn(
                    "num text-right text-xs",
                    row.overdue ? "text-negative" : "text-muted",
                  )}
                >
                  {row.overdue ? row.days_overdue : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      row.overdue
                        ? "border-negative/30 bg-negative/12 text-negative"
                        : "border-secondary/30 bg-secondary/12 text-secondary"
                    }
                  >
                    {row.overdue ? "Vencido" : "Pendiente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
