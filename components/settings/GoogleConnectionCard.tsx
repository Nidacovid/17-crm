"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GoogleConnection, PaymentSyncIssue } from "@/lib/queries/settings";
import { formatDate } from "@/lib/format";

// 10.8: bloque Google de Ajustes. Estado de la conexión, conexión y
// desconexión, calendario creado, resincronización manual y errores.
export function GoogleConnectionCard({
  connection,
  googleCalendarId,
  googleStatus,
  pendingSyncCount,
  syncErrors,
}: {
  connection: GoogleConnection;
  googleCalendarId: string | null;
  googleStatus: "ok" | "error" | null;
  pendingSyncCount: number;
  syncErrors: PaymentSyncIssue[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"disconnect" | "resync" | null>(null);
  const [, startTransition] = useTransition();

  // Respuesta del flujo OAuth (/ajustes?google=ok|error).
  useEffect(() => {
    if (googleStatus === "ok") {
      toast.success("Google Calendar conectado");
    } else if (googleStatus === "error") {
      toast.error(
        "No se pudo completar la conexión con Google. Inténtalo de nuevo.",
      );
    }
  }, [googleStatus]);

  async function handleDisconnect() {
    setBusy("disconnect");
    try {
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      toast.success("Google desconectado");
    } catch {
      toast.error("No se pudo desconectar Google.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  async function handleResync() {
    setBusy("resync");
    try {
      const response = await fetch("/api/payments/resync", {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      const result = (await response.json()) as {
        processed: number;
        failed: number;
      };
      if (result.failed > 0) {
        toast.error(
          `Resincronizados ${result.processed - result.failed} de ${result.processed}. Algunos pagos quedaron con error.`,
        );
      } else if (result.processed === 0) {
        toast.success("No hay cobros pendientes de sincronizar");
      } else {
        toast.success(`${result.processed} cobros sincronizados`);
      }
    } catch {
      toast.error("No se pudo resincronizar los cobros.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  const calendarUrl =
    googleCalendarId !== null
      ? `https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(googleCalendarId)}`
      : null;

  return (
    <section className="space-y-4 rounded-lg border border-subtle bg-surface p-5">
      <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        Google Calendar
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {connection.connected ? (
            <>
              <p className="text-[13px] text-primary">
                Conectado como {connection.email ?? "tu cuenta de Google"}
              </p>
              {connection.connectedAt ? (
                <p className="num text-xs text-secondary">
                  Conexión del {formatDate(connection.connectedAt)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[13px] text-secondary">No conectado</p>
          )}
        </div>

        {connection.connected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void handleDisconnect()}
          >
            {busy === "disconnect" ? "Desconectando…" : "Desconectar"}
          </Button>
        ) : (
          <Button type="button" size="sm" asChild>
            {/* prefetch={false}: es una ruta API, no una página; el
                prefetch ejecutaría el handler sin necesidad. */}
            <Link href="/api/google/connect" prefetch={false}>
              Conectar con Google
            </Link>
          </Button>
        )}
      </div>

      {connection.connected ? (
        <div className="space-y-1">
          <p className="text-xs text-secondary">
            Los vencimientos de cobro se crean en el calendario{" "}
            <span className="text-primary">Cobros · CRM</span>.
          </p>
          {calendarUrl ? (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover"
            >
              <CalendarDays aria-hidden className="size-3.5" strokeWidth={1.5} />
              Abrir el calendario en Google Calendar
            </a>
          ) : (
            <p className="text-xs text-warning">
              El calendario «Cobros · CRM» aún no existe: se creará con la
              primera sincronización.
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2 border-t border-subtle pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void handleResync()}
        >
          <RefreshCw aria-hidden strokeWidth={1.5} />
          {busy === "resync"
            ? "Resincronizando…"
            : "Resincronizar cobros con el calendario"}
        </Button>
        <p className="num text-xs text-secondary">
          {pendingSyncCount} pendiente{pendingSyncCount === 1 ? "" : "s"} de
          sincronizar
        </p>

        {syncErrors.length > 0 ? (
          <div className="space-y-1.5 rounded-md border border-subtle bg-surface-2 p-3">
            <p className="text-xs text-warning">
              Hay {syncErrors.length} pago{syncErrors.length === 1 ? "" : "s"}{" "}
              con error de sincronización:
            </p>
            <ul className="space-y-1">
              {syncErrors.map((issue) => (
                <li key={issue.id} className="text-xs text-secondary">
                  <span className="num text-primary">
                    {issue.label ?? `Pago ${issue.seq}`}
                  </span>{" "}
                  ({formatDate(issue.due_date)}):{" "}
                  <span className="text-negative">{issue.sync_error}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="border-t border-subtle pt-4 text-xs leading-relaxed text-muted">
        Nota: la aplicación de Google Cloud está en modo Testing. En ese modo
        el permiso caduca a los 7 días y habrá que reconectar desde aquí. Para
        uso permanente hay que publicar la aplicación en Google Cloud (al ser
        un ámbito sensible puede requerir verificación) o aceptar reconectar
        periódicamente.
      </p>
    </section>
  );
}