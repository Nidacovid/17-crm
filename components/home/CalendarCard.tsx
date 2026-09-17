"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { HomeCalendarEvent } from "@/lib/queries/home";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});

// 10.6: respuesta normalizada de /api/google/events. Duplicada aquí porque
// lib/google/* es solo para el servidor.
type GoogleEventsResponse = {
  connected: boolean;
  events: {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    source: "principal" | "cobros";
  }[];
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

async function fetchGoogleEvents(
  from: string,
  to: string,
): Promise<GoogleEventsResponse> {
  try {
    const response = await fetch(`/api/google/events?from=${from}&to=${to}`);
    if (!response.ok) {
      return { connected: false, events: [] };
    }
    return (await response.json()) as GoogleEventsResponse;
  } catch {
    // Sin sesión o red caída: para Home equivale a "no conectado" (10.6).
    return { connected: false, events: [] };
  }
}

// Rejilla mensual con la semana empezando en lunes.
function buildCells(year: number, monthIndex: number): (number | null)[] {
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// 8.4: calendario del mes de solo lectura. Los vencimientos de cobro se leen
// de v_payments y se marcan siempre, sin depender de Google. Con Google
// conectado se añaden además los eventos del calendario principal (10.6);
// los del calendario de Cobros se excluyen para no duplicar los vencimientos.
export function CalendarCard({ data }: { data: Promise<HomeCalendarEvent[]> }) {
  const paymentEvents = use(data);
  const today = formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  }));

  const monthStart = isoDate(cursor.year, cursor.month, 1);
  const monthEnd = isoDate(
    cursor.year,
    cursor.month,
    lastDayOfMonth(cursor.year, cursor.month),
  );

  const { data: google } = useQuery({
    queryKey: ["google-events", monthStart, monthEnd],
    queryFn: () => fetchGoogleEvents(monthStart, monthEnd),
  });

  const events = useMemo<HomeCalendarEvent[]>(() => {
    const googleEvents: HomeCalendarEvent[] = (google?.events ?? [])
      .filter((event) => event.source === "principal")
      .map((event) => ({
        id: `google-${event.id}`,
        date: event.start.slice(0, 10),
        label: event.title,
        overdue: false,
      }));
    return [...paymentEvents, ...googleEvents];
  }, [paymentEvents, google]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, HomeCalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(
    () => buildCells(cursor.year, cursor.month),
    [cursor],
  );

  const hasMonthEvents = cells.some((day) => {
    if (day === null) return false;
    return eventsByDate.has(isoDate(cursor.year, cursor.month, day));
  });

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const rawTitle = monthFormatter.format(
    new Date(cursor.year, cursor.month, 1),
  );
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  return (
    <section className="flex flex-col rounded-lg border border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
          Calendario del mes
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mes anterior"
            className="flex size-6 items-center justify-center rounded-md text-secondary transition-colors hover:bg-hover hover:text-primary"
          >
            <ChevronLeft aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
          <span className="w-36 text-center text-xs text-secondary">
            {title}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mes siguiente"
            className="flex size-6 items-center justify-center rounded-md text-secondary transition-colors hover:bg-hover hover:text-primary"
          >
            <ChevronRight aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1">
            {weekday}
          </div>
        ))}
      </div>

      <div className="relative mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} className="min-h-16" />;
          }
          const date = isoDate(cursor.year, cursor.month, day);
          const dayEvents = eventsByDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <div
              key={date}
              className={cn(
                "min-h-16 rounded-md border border-transparent p-1",
                isToday && "border-accent",
              )}
            >
              <span
                className={cn(
                  "num text-[11px]",
                  isToday ? "text-accent" : "text-secondary",
                )}
              >
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <div key={event.id} className="flex items-center gap-1">
                    <span
                      aria-hidden
                      className={cn(
                        "size-1 shrink-0 rounded-full",
                        event.overdue ? "bg-negative" : "bg-accent",
                      )}
                    />
                    <span className="truncate text-[11px] text-secondary">
                      {event.label}
                    </span>
                  </div>
                ))}
                {dayEvents.length > 2 ? (
                  <span className="num block text-[11px] text-muted">
                    +{dayEvents.length - 2}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {google?.connected === false && !hasMonthEvents ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-[220px] rounded bg-surface/85 px-3 py-1.5 text-center text-[11px] text-muted">
              Conecta tu Google Calendar en Ajustes para ver tus eventos.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}