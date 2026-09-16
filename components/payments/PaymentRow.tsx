"use client";

import { MoreVertical } from "lucide-react";
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkPaidCheckbox } from "@/components/payments/MarkPaidCheckbox";
import { MoneyText } from "@/components/shared/MoneyText";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/format";
import type { PaymentListRow } from "@/lib/queries/payments";

// Fila de la tabla de pagos (6.1), con el formato exigido:
// importe — fecha — casilla de cobrado. El menú de la fila permite
// registrar el cobro en otra fecha o eliminar un pago no cobrado.
export function PaymentRow({
  payment,
  busy,
  onToggle,
  onChooseDate,
  onDelete,
}: {
  payment: PaymentListRow;
  busy: boolean;
  onToggle: (payment: PaymentListRow, checked: boolean) => void;
  onChooseDate: (payment: PaymentListRow) => void;
  onDelete: (payment: PaymentListRow) => void;
}) {
  const paid = payment.paid_at !== null;

  return (
    <TableRow>
      <TableCell className="max-w-[200px] truncate text-[13px] text-primary">
        {payment.label || `Pago ${payment.seq}`}
      </TableCell>
      <TableCell className="text-[13px]">
        <MoneyText value={payment.amount} />
      </TableCell>
      <TableCell className="num text-[13px] text-secondary">
        {formatDate(payment.due_date)}
      </TableCell>
      <TableCell>
        <StatusBadge status={payment.status} />
      </TableCell>
      <TableCell>
        <MarkPaidCheckbox
          paid={paid}
          disabled={busy}
          onToggle={(checked) => onToggle(payment, checked)}
        />
      </TableCell>
      <TableCell className="w-10 pr-1 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Acciones del pago ${payment.label ?? payment.seq}`}
            >
              <MoreVertical aria-hidden strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onChooseDate(payment)}>
              {paid ? "Editar fecha de cobro" : "Cobrar en otra fecha…"}
            </DropdownMenuItem>
            {!paid ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(payment)}
              >
                Eliminar pago
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
