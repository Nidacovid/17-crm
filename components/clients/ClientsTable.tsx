"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientListRow, ClientStatusKey } from "@/lib/queries/clients";

type SortKey = "business_name" | "status" | "projects_count";

// Orden canónico del embudo para la columna Estado.
const STATUS_RANK: Record<ClientStatusKey, number> = {
  potencial: 0,
  en_proceso: 1,
  terminado: 2,
  nada: 3,
};

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  if (!active) {
    return (
      <ArrowUpDown
        aria-hidden
        className="size-3 text-muted"
        strokeWidth={1.5}
      />
    );
  }
  return direction === "asc" ? (
    <ArrowUp aria-hidden className="size-3 text-accent" strokeWidth={1.5} />
  ) : (
    <ArrowDown aria-hidden className="size-3 text-accent" strokeWidth={1.5} />
  );
}

// Tabla de contactos con ordenación local y variante de tarjetas en móvil.
export function ClientsTable({ rows }: { rows: ClientListRow[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("business_name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const factor = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "projects_count") {
        return (a.projects_count - b.projects_count) * factor;
      }
      if (sortKey === "status") {
        return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * factor;
      }
      return a.business_name.localeCompare(b.business_name, "es") * factor;
    });
  }, [rows, sortKey, direction]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "projects_count" ? "desc" : "asc");
    }
  }

  function goToClient(id: string) {
    router.push(`/contactos/${id}`);
  }

  return (
    <>
      <div className="hidden rounded-lg border border-subtle bg-surface md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("business_name")}
                  className="flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  Negocio
                  <SortIcon
                    active={sortKey === "business_name"}
                    direction={direction}
                  />
                </button>
              </TableHead>
              <TableHead className="text-xs text-secondary">Contacto</TableHead>
              <TableHead className="text-xs text-secondary">Teléfono</TableHead>
              <TableHead className="text-xs text-secondary">Tipo</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  Estado
                  <SortIcon active={sortKey === "status"} direction={direction} />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("projects_count")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  Proyectos
                  <SortIcon
                    active={sortKey === "projects_count"}
                    direction={direction}
                  />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow
                key={row.id}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a")) return;
                  goToClient(row.id);
                }}
                className="cursor-pointer"
              >
                <TableCell className="max-w-[220px]">
                  <Link
                    href={`/contactos/${row.id}`}
                    className="truncate font-medium text-accent hover:underline"
                  >
                    {row.business_name}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-secondary">
                  {row.contact_name || "—"}
                </TableCell>
                <TableCell className="text-secondary">
                  {row.phone ? formatPhone(row.phone) : "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-secondary">
                  {row.business_type || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="num text-right text-secondary">
                  {row.projects_count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-2 md:hidden">
        {sorted.map((row) => (
          <li key={row.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => goToClient(row.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  goToClient(row.id);
                }
              }}
              className={cn(
                "rounded-lg border border-subtle bg-surface p-3.5 transition-colors hover:bg-hover",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-accent">
                  {row.business_name}
                </span>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-1.5 truncate text-xs text-secondary">
                {row.phone ? formatPhone(row.phone) : "Sin teléfono"}
                {row.business_type ? ` · ${row.business_type}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}