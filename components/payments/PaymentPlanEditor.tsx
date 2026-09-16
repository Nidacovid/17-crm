"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, addMonths, format } from "date-fns";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/shared/DateField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatEUR, formatDate } from "@/lib/format";
import type { PaymentListRow } from "@/lib/queries/payments";

// Fila del plan en el editor. El importe se guarda como texto porque es lo
// que llega del input; la validación y el guardado lo convierten a número.
export type PlanRow = {
  key: string;
  id: string | null;
  seq: number;
  label: string;
  amount: string;
  due_date: string;
  paid: boolean;
};

export type PaymentPlanConfig = {
  price_net: number;
  payment_mode: "unico" | "plazos";
  installments?: number;
  down_payment?: number;
};

let rowKeyCounter = 0;
function nextRowKey(): string {
  rowKeyCounter += 1;
  return `plan-row-${rowKeyCounter}`;
}

export function toPlanRows(payments: PaymentListRow[]): PlanRow[] {
  return payments.map((payment) => ({
    key: nextRowKey(),
    id: payment.id,
    seq: payment.seq,
    label: payment.label ?? "",
    amount: String(payment.amount),
    due_date: payment.due_date,
    paid: payment.paid_at !== null,
  }));
}

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function parseCents(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

// Propuesta de filas (6.1):
// - unico: importe total, fecha por defecto a 30 días.
// - plazos: entrada (seq 1, hoy) si down_payment > 0; el resto, plazos
//   mensuales ajustando la ÚLTIMA fila con los céntimos de redondeo para que
//   la suma cuadre exactamente con el precio.
export function generatePlanRows(config: PaymentPlanConfig): PlanRow[] {
  const today = new Date();
  const priceCents = Math.round(config.price_net * 100);
  const rows: PlanRow[] = [];
  let seq = 1;

  function addRow(label: string, cents: number, date: Date) {
    rows.push({
      key: nextRowKey(),
      id: null,
      seq: seq,
      label,
      amount: (cents / 100).toFixed(2),
      due_date: format(date, "yyyy-MM-dd"),
      paid: false,
    });
    seq += 1;
  }

  if (config.payment_mode === "unico") {
    addRow("Pago único", priceCents, addDays(today, 30));
    return rows;
  }

  const downCents = Math.round((config.down_payment ?? 0) * 100);
  const installments = config.installments ?? 0;
  if (installments < 1) return rows;

  if (downCents > 0) {
    addRow("Entrada", downCents, today);
  }

  const remaining = priceCents - downCents;
  const base = Math.floor(remaining / installments);
  for (let i = 1; i <= installments; i += 1) {
    const cents =
      i < installments ? base : remaining - base * (installments - 1);
    addRow(`Plazo ${i} de ${installments}`, cents, addMonths(today, i));
  }
  return rows;
}

// Al regenerar, los cobros históricos se conservan tal cual (6.3) y van
// primero; las filas nuevas se generan a partir de la configuración.
function mergeWithPaid(config: PaymentPlanConfig, paidRows: PlanRow[]): PlanRow[] {
  const paid = paidRows
    .filter((row) => row.paid)
    .sort((a, b) => a.seq - b.seq);
  const generated = generatePlanRows(config);
  const merged = [...paid, ...generated].map((row, index) => ({
    ...row,
    seq: index + 1,
  }));
  return merged;
}

// Editor del plan de pagos (6.1), solo en modo edición de la ficha. Al
// configurar o cambiar el plan genera la propuesta; las filas son editables
// fila a fila y el cuadre con el precio se muestra permanentemente.
export function PaymentPlanEditor({
  config,
  initialRows,
  onChange,
}: {
  config: PaymentPlanConfig;
  initialRows: PlanRow[];
  onChange: (rows: PlanRow[]) => void;
}) {
  const [rows, setRows] = useState<PlanRow[]>(initialRows);
  const signature = `${config.price_net}|${config.payment_mode}|${
    config.installments ?? ""
  }|${config.down_payment ?? ""}`;
  const lastSignature = useRef<string | null>(null);

  function replaceRows(next: PlanRow[]) {
    setRows(next);
    onChange(next);
  }

  // Al configurar o cambiar el plan se regenera la propuesta (se conserva
  // lo ya cobrado). El montaje inicial muestra las filas guardadas tal cual.
  useEffect(() => {
    if (lastSignature.current === null) {
      lastSignature.current = signature;
      return;
    }
    if (signature !== lastSignature.current) {
      lastSignature.current = signature;
      replaceRows(mergeWithPaid(config, rows));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  function updateRow(key: string, patch: Partial<PlanRow>) {
    replaceRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    replaceRows(
      rows
        .filter((row) => row.key !== key)
        .map((row, index) => ({ ...row, seq: index + 1 })),
    );
  }

  function addRow() {
    replaceRows([
      ...rows,
      {
        key: nextRowKey(),
        id: null,
        seq: rows.length + 1,
        label: "",
        amount: "",
        due_date: todayISO(),
        paid: false,
      },
    ]);
  }

  function regenerate() {
    replaceRows(mergeWithPaid(config, rows));
  }

  const sumCents = rows.reduce((acc, row) => acc + parseCents(row.amount), 0);
  const priceCents = Math.round(config.price_net * 100);
  const diff = sumCents - priceCents;

  return (
    <div className="rounded-lg border border-subtle bg-surface">
      <div className="space-y-2 p-3">
        {rows.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted">
            No hay filas en el plan. Regenera el plan o añade una fila a mano.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_112px_140px_32px] items-center gap-2 px-1">
              <span className="text-[11px] tracking-wide text-muted uppercase">
                Concepto
              </span>
              <span className="text-[11px] tracking-wide text-muted uppercase">
                Importe
              </span>
              <span className="text-[11px] tracking-wide text-muted uppercase">
                Fecha
              </span>
              <span />
            </div>
            {rows.map((row) =>
              row.paid ? (
                <div
                  key={row.key}
                  className="grid grid-cols-[1fr_112px_140px_32px] items-center gap-2 rounded-md bg-surface-2 px-1.5 py-1"
                >
                  <span className="truncate text-[13px] text-secondary">
                    {row.label || `Pago ${row.seq}`}
                  </span>
                  <span className="num text-[13px] text-secondary">
                    {formatEUR(parseCents(row.amount) / 100)}
                  </span>
                  <span className="num text-[13px] text-secondary">
                    {formatDate(row.due_date)}
                  </span>
                  <span className="flex justify-center">
                    <StatusBadge status="pagado" />
                  </span>
                </div>
              ) : (
                <div
                  key={row.key}
                  className="grid grid-cols-[1fr_112px_140px_32px] items-center gap-2"
                >
                  <Input
                    value={row.label}
                    onChange={(event) =>
                      updateRow(row.key, { label: event.target.value })
                    }
                    placeholder="Concepto"
                    aria-label="Concepto del pago"
                    autoComplete="off"
                    className="h-8 text-[13px]"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(event) =>
                      updateRow(row.key, { amount: event.target.value })
                    }
                    aria-label="Importe del pago"
                    autoComplete="off"
                    className="num h-8 text-[13px]"
                  />
                  <DateField
                    value={row.due_date}
                    onChange={(value) => updateRow(row.key, { due_date: value })}
                    aria-label="Fecha del pago"
                    className="h-8 justify-start"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar la fila ${row.seq}`}
                    className="text-muted hover:text-negative"
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 aria-hidden strokeWidth={1.5} />
                  </Button>
                </div>
              ),
            )}
          </>
        )}
      </div>

      <div className="space-y-1 border-t border-subtle px-3 py-2.5">
        <p className="num text-xs text-secondary">
          Suma de importes: {formatEUR(sumCents / 100)} · Precio:{" "}
          {formatEUR(priceCents / 100)}
        </p>
        {diff !== 0 ? (
          <p className="text-xs text-warning">
            Los importes no coinciden con el precio. Diferencia:{" "}
            {diff > 0 ? "+" : "−"}
            {formatEUR(Math.abs(diff) / 100)}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-subtle px-3 py-2.5">
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          <Plus aria-hidden strokeWidth={1.5} />
          Añadir fila
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={regenerate}>
          <RefreshCw aria-hidden strokeWidth={1.5} />
          Regenerar plan
        </Button>
      </div>
    </div>
  );
}
