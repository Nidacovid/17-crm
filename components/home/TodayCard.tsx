"use client";

import { use, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatEUR } from "@/lib/format";
import { markPaid } from "@/lib/actions/payments";
import type { HomeToday } from "@/lib/queries/home";

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">
      {children}
    </h3>
  );
}

// 8.5 (D-14): panel "Hoy" propio. Tres secciones que se ocultan si están
// vacías: Cobros (con casilla para marcar cobrado), En curso y Eventos de hoy.
export function TodayCard({ data }: { data: Promise<HomeToday> }) {
  const today = use(data);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const payments = today.payments.filter(
    (payment) => !hidden.has(payment.id),
  );
  const tasks = today.tasks;
  const events = today.calendarEvents;
  const isEmpty =
    payments.length === 0 && tasks.length === 0 && events.length === 0;

  function handleMarkPaid(paymentId: string) {
    setBusyId(paymentId);
    startTransition(async () => {
      const result = await markPaid(paymentId);
      setBusyId(null);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo marcar el cobro.");
        return;
      }
      toast.success("Cobro registrado");
      setHidden((current) => new Set(current).add(paymentId));
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col rounded-lg border border-subtle bg-surface p-5">
      <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        Hoy
      </h2>

      {isEmpty ? (
        <p className="mt-3 text-xs text-secondary">
          Nada pendiente para hoy.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {payments.length > 0 ? (
            <div className="space-y-2">
              <SectionTitle>Cobros</SectionTitle>
              <ul className="space-y-1.5">
                {payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/proyectos/${payment.project_id}`}
                          className="truncate text-[13px] text-primary hover:text-accent"
                        >
                          {payment.client}
                        </Link>
                        {payment.overdue ? (
                          <StatusBadge status="vencido" />
                        ) : null}
                      </div>
                      <p className="num mt-0.5 text-xs text-secondary">
                        {formatEUR(payment.amount)} ·{" "}
                        {formatDate(payment.due_date)}
                      </p>
                    </div>
                    <Checkbox
                      checked={false}
                      disabled={busyId === payment.id}
                      onCheckedChange={(checked) => {
                        if (checked === true) handleMarkPaid(payment.id);
                      }}
                      aria-label="Marcar como cobrado"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tasks.length > 0 ? (
            <div className="space-y-2">
              <SectionTitle>En curso</SectionTitle>
              <ul className="space-y-1.5">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/proyectos/${task.project_id}/tareas`}
                      className="block rounded-md px-1 py-1 transition-colors hover:bg-hover"
                    >
                      <span className="block truncate text-[13px] text-primary">
                        {task.title}
                      </span>
                      <span className="block truncate text-xs text-secondary">
                        {task.project_name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {events.length > 0 ? (
            <div className="space-y-2">
              <SectionTitle>Eventos de hoy</SectionTitle>
              <ul className="space-y-1.5">
                {events.map((event) => (
                  <li key={event.id} className="text-[13px] text-primary">
                    {event.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
