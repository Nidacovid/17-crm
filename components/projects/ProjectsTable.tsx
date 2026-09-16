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
import { HoursText } from "@/components/shared/HoursText";
import { MoneyText } from "@/components/shared/MoneyText";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProjectProgressBar } from "@/components/projects/ProjectProgressBar";
import { cn } from "@/lib/utils";
import type { ProjectListRow, ProjectStatusKey } from "@/lib/queries/projects";

type SortKey = "name" | "status" | "price_net" | "hours_total" | "pending";

// Orden canónico de los estados del proyecto.
const STATUS_RANK: Record<ProjectStatusKey, number> = {
  a_empezar: 0,
  en_desarrollo: 1,
  terminado: 2,
  cancelado: 3,
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

// Tabla de proyectos: Proyecto — Negocio — Estado más Precio, Horas y
// Pendiente de cobro. Ordenación local y variante de tarjetas en móvil.
export function ProjectsTable({ rows }: { rows: ProjectListRow[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const factor = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "status") {
        return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * factor;
      }
      if (sortKey === "price_net") {
        return (a.price_net - b.price_net) * factor;
      }
      if (sortKey === "hours_total") {
        return (a.hours_total - b.hours_total) * factor;
      }
      if (sortKey === "pending") {
        return (a.pending - b.pending) * factor;
      }
      return a.name.localeCompare(b.name, "es") * factor;
    });
  }, [rows, sortKey, direction]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "name" ? "asc" : "desc");
    }
  }

  function goToProject(id: string) {
    router.push(`/proyectos/${id}`);
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
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  Proyecto
                  <SortIcon active={sortKey === "name"} direction={direction} />
                </button>
              </TableHead>
              <TableHead className="text-xs text-secondary">Negocio</TableHead>
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
                  onClick={() => toggleSort("price_net")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  Precio
                  <SortIcon active={sortKey === "price_net"} direction={direction} />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("hours_total")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  Horas
                  <SortIcon
                    active={sortKey === "hours_total"}
                    direction={direction}
                  />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("pending")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
                >
                  Pendiente de cobro
                  <SortIcon active={sortKey === "pending"} direction={direction} />
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
                  goToProject(row.id);
                }}
                className="cursor-pointer"
              >
                <TableCell className="max-w-[260px]">
                  <Link
                    href={`/proyectos/${row.id}`}
                    className="truncate font-medium text-accent hover:underline"
                  >
                    {row.name}
                  </Link>
                  <div className="mt-1.5 max-w-[200px]">
                    <ProjectProgressBar done={row.tasks_done} />
                    <span className="num mt-1 block text-[11px] text-muted">
                      {row.tasks_done} / 9
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <Link
                    href={`/contactos/${row.client_id}`}
                    className="block truncate text-secondary hover:text-primary hover:underline"
                  >
                    {row.business_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyText value={row.price_net} className="text-secondary" />
                </TableCell>
                <TableCell className="text-right">
                  <HoursText
                    minutes={row.minutes_total}
                    className="text-secondary"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyText value={row.pending} className="text-secondary" />
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
              onClick={() => goToProject(row.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  goToProject(row.id);
                }
              }}
              className={cn(
                "rounded-lg border border-subtle bg-surface p-3.5 transition-colors hover:bg-hover",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/proyectos/${row.id}`}
                  className="min-w-0 flex-1 truncate text-[13px] font-medium text-accent"
                >
                  {row.name}
                </Link>
                <StatusBadge status={row.status} />
              </div>
              <Link
                href={`/contactos/${row.client_id}`}
                className="mt-1 block truncate text-xs text-secondary hover:text-primary"
              >
                {row.business_name}
              </Link>
              <div className="mt-2.5 max-w-[220px]">
                <ProjectProgressBar done={row.tasks_done} />
                <span className="num mt-1 block text-[11px] text-muted">
                  {row.tasks_done} / 9
                </span>
              </div>
              <div className="num mt-2.5 flex items-center gap-3 text-xs text-secondary">
                <MoneyText value={row.price_net} />
                <span className="text-muted">·</span>
                <HoursText minutes={row.minutes_total} />
                <span className="text-muted">·</span>
                <MoneyText value={row.pending} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
