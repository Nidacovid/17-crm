"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEUR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MetricColumnFormat =
  | "text"
  | "currency"
  | "hours"
  | "percent"
  | "number";

export type MetricColumn<T> = {
  key: string;
  label: string;
  format?: MetricColumnFormat;
  align?: "left" | "right";
  /** Por defecto toda columna es ordenable. */
  sortable?: boolean;
  /** Dibuja una barra embebida proporcional al máximo de la columna. */
  bar?: boolean;
  /** Convierte la celda en enlace. */
  href?: (row: T) => string;
  value: (row: T) => number | string | null;
  render?: (row: T) => ReactNode;
};

const hourFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
});

function formatCell(
  value: number | string | null,
  format: MetricColumnFormat = "text",
): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (format) {
    case "currency":
      return formatEUR(Number(value));
    case "hours":
      return `${hourFormatter.format(Number(value))} h`;
    case "percent":
      return formatPercent(Number(value));
    case "number":
      return hourFormatter.format(Number(value));
    default:
      return String(value);
  }
}

// Tabla ordenable de Métricas (7.6) con formateadores de moneda/horas/porcentaje
// y barras embebidas. Todas las columnas son ordenables por defecto.
export function MetricsDataTable<T>({
  columns,
  rows,
  initialSortKey,
  initialSortDir = "asc",
  rowClassName,
  emptyLabel = "Sin datos que mostrar.",
}: {
  columns: MetricColumn<T>[];
  rows: T[];
  initialSortKey?: string;
  initialSortDir?: "asc" | "desc";
  rowClassName?: (row: T) => string | undefined;
  emptyLabel?: string;
}) {
  const [sortKey, setSortKey] = useState<string>(
    initialSortKey ?? columns[0]?.key ?? "",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);

  const barMax = useMemo(() => {
    const maxes = new Map<string, number>();
    for (const column of columns) {
      if (!column.bar) continue;
      let max = 0;
      for (const row of rows) {
        const value = column.value(row);
        if (typeof value === "number") {
          max = Math.max(max, Math.abs(value));
        }
      }
      maxes.set(column.key, max);
    }
    return maxes;
  }, [columns, rows]);

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column) return rows;
    const factor = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = column.value(a);
      const bv = column.value(b);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * factor;
      }
      return String(av).localeCompare(String(bv), "es") * factor;
    });
  }, [columns, rows, sortKey, sortDir]);

  function toggleSort(column: MetricColumn<T>) {
    if (column.sortable === false) return;
    if (column.key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setSortDir("asc");
    }
  }

  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-secondary">
        {emptyLabel}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((column) => {
            const alignRight = column.align === "right";
            const active = column.key === sortKey;
            return (
              <TableHead
                key={column.key}
                className={cn(
                  "text-xs text-secondary",
                  alignRight && "text-right",
                )}
              >
                {column.sortable === false ? (
                  column.label
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-primary",
                      alignRight && "flex-row-reverse",
                      active && "text-primary",
                    )}
                  >
                    {column.label}
                    {active ? (
                      sortDir === "asc" ? (
                        <ArrowUp aria-hidden className="size-3" />
                      ) : (
                        <ArrowDown aria-hidden className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown
                        aria-hidden
                        className="size-3 text-muted"
                      />
                    )}
                  </button>
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row, rowIndex) => (
          <TableRow key={rowIndex} className={rowClassName?.(row)}>
            {columns.map((column) => {
              const raw = column.value(row);
              const alignRight = column.align === "right";
              const max = barMax.get(column.key) ?? 0;
              const content = column.render ? (
                column.render(row)
              ) : column.href ? (
                <Link
                  href={column.href(row)}
                  className="text-accent hover:underline"
                >
                  {formatCell(raw, column.format)}
                </Link>
              ) : (
                formatCell(raw, column.format)
              );
              return (
                <TableCell
                  key={column.key}
                  className={cn(
                    "text-xs text-primary",
                    alignRight && "text-right",
                  )}
                >
                  {column.bar && typeof raw === "number" && max > 0 ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-inset">
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            raw < 0 ? "bg-negative" : "bg-accent",
                          )}
                          style={{
                            width: `${Math.min(
                              100,
                              (Math.abs(raw) / max) * 100,
                            )}%`,
                          }}
                        />
                      </span>
                      <span className="num">{content}</span>
                    </div>
                  ) : (
                    <span className={column.format !== "text" ? "num" : undefined}>
                      {content}
                    </span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
