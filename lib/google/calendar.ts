// SOLO SERVIDOR (D-12): sincronización de vencimientos de cobro con el
// calendario "Cobros · CRM" de Google (10.5) y lectura de eventos para
// Home (10.6). Todo lo que hay aquí es un extra: si Google falla, el pago
// ya está guardado y nada se rompe.
import type { calendar_v3 } from "googleapis";
import { add, formatISO, parseISO, sub } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleClient } from "@/lib/google/oauth";
import { formatEUR } from "@/lib/format";
import { APP_TIMEZONE } from "@/lib/dates";

export const COBROS_CALENDAR_SUMMARY = "Cobros · CRM";
// Color sobrio fijo para los eventos de cobro (grafito de la paleta de
// Google Calendar).
const COBROS_COLOR_ID = "8";

// 10.6: evento normalizado para Home.
export type GoogleEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  source: "principal" | "cobros";
};

export type GoogleEventsResult = {
  connected: boolean;
  events: GoogleEvent[];
};

type OwnerSettings = {
  googleCalendarId: string | null;
  reminderTime: string;
  reminderDaysBefore: number;
};

// Postgres devuelve la hora como "HH:MM:SS"; se recorta a "HH:MM".
function normalizeReminderTime(value: string): string {
  const [hours = "09", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

async function getOwnerSettings(ownerId: string): Promise<OwnerSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("google_calendar_id,reminder_time,reminder_days_before")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return {
    googleCalendarId: data?.google_calendar_id ?? null,
    reminderTime: normalizeReminderTime(data?.reminder_time ?? "09:00"),
    reminderDaysBefore: Number(data?.reminder_days_before ?? 0),
  };
}

// Calendario destino de los eventos de cobro: el dedicado si existe y,
// si no, el principal como salvaguarda.
function cobrosCalendarId(settings: OwnerSettings): string {
  return settings.googleCalendarId ?? "primary";
}

// 10.3: creación del calendario dedicado si app_settings.google_calendar_id
// está vacío. Devuelve el id en uso.
export async function ensureCobrosCalendar(
  ownerId: string,
  calendar: calendar_v3.Calendar,
): Promise<string> {
  const settings = await getOwnerSettings(ownerId);
  if (settings.googleCalendarId) return settings.googleCalendarId;

  const { data } = await calendar.calendars.insert({
    requestBody: {
      summary: COBROS_CALENDAR_SUMMARY,
      timeZone: APP_TIMEZONE,
    },
  });
  const calendarId = data?.id;
  if (!calendarId) {
    throw new Error("Google no devolvió el id del calendario creado.");
  }

  const admin = createAdminClient();
  await admin
    .from("app_settings")
    .update({ google_calendar_id: calendarId })
    .eq("owner_id", ownerId);
  return calendarId;
}

// 10.5: aviso popup a la hora configurada del día del evento. Con eventos
// de día completo los minutos se cuentan desde medianoche y los avisos
// posteriores al inicio exigen signo negativo: 09:00 → -540.
function reminderOffsetMinutes(reminderTime: string): number {
  const [hours, minutes] = reminderTime.split(":").map(Number);
  const total = (hours || 0) * 60 + (minutes || 0);
  return -total;
}

function shiftDays(date: string, days: number): string {
  const base = parseISO(`${date}T00:00:00`);
  const shifted =
    days >= 0 ? add(base, { days }) : sub(base, { days: Math.abs(days) });
  return formatISO(shifted, { representation: "date" });
}

type PaymentContext = {
  paymentId: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  businessName: string;
  amount: number;
  dueDate: string;
};

// 10.5: formato del evento. Día completo en due_date desplazado
// reminder_days_before días antes si está configurado.
function buildPaymentEventBody(
  payment: PaymentContext,
  settings: OwnerSettings,
): calendar_v3.Schema$Event {
  const eventDay = shiftDays(payment.dueDate, -settings.reminderDaysBefore);
  const summary = `Cobro · ${payment.businessName} · ${formatEUR(payment.amount)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return {
    summary,
    description: `Proyecto: ${payment.projectName} (${payment.projectCode})\nCliente: ${payment.businessName}\nAbrir: ${appUrl}/proyectos/${payment.projectId}`,
    start: { date: eventDay },
    // Fin exclusivo: evento de un solo día.
    end: { date: shiftDays(eventDay, 1) },
    reminders: {
      useDefault: false,
      overrides: [
        {
          method: "popup",
          minutes: reminderOffsetMinutes(settings.reminderTime),
        },
      ],
    },
    colorId: COBROS_COLOR_ID,
    extendedProperties: {
      private: {
        crm_payment_id: payment.paymentId,
        crm_project_id: payment.projectId,
      },
    },
  };
}

// "Ya no existe en Google": 404 o 410 (borrado o calendario eliminado).
function isEventGone(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : String(error);
  return status === 404 || status === 410 || message.includes("404") || message.includes("410");
}

function errorText(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return (
    message ??
    (error instanceof Error ? error.message : "Error desconocido de Google.")
  );
}

async function loadPaymentContext(
  paymentId: string,
): Promise<{ ownerId: string; paidAt: string | null; eventId: string | null } & PaymentContext | null> {
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select(
      "id,owner_id,project_id,amount,due_date,paid_at,google_event_id",
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return null;

  const { data: project } = await admin
    .from("projects")
    .select("id,name,code,client_id")
    .eq("id", payment.project_id)
    .maybeSingle();

  let businessName = "";
  if (project) {
    const { data: client } = await admin
      .from("clients")
      .select("business_name")
      .eq("id", project.client_id)
      .maybeSingle();
    businessName = client?.business_name ?? "";
  }

  return {
    ownerId: payment.owner_id,
    paidAt: payment.paid_at,
    eventId: payment.google_event_id,
    paymentId: payment.id,
    projectId: payment.project_id,
    projectName: project?.name ?? "",
    projectCode: project?.code ?? "",
    businessName,
    amount: Number(payment.amount ?? 0),
    dueDate: payment.due_date,
  };
}

async function markSynced(
  paymentId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("payments")
    .update(values)
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
}

export type SyncOutcome = "sincronizado" | "no_aplica" | "sin_conexion" | "error";

// 10.5: sincroniza un pago con Google Calendar según su estado. Nunca lanza:
// el pago ya está guardado y la sincronización es un extra.
export async function syncPayment(paymentId: string): Promise<SyncOutcome> {
  let payment: Awaited<ReturnType<typeof loadPaymentContext>>;
  try {
    payment = await loadPaymentContext(paymentId);
  } catch {
    return "error";
  }
  if (!payment) return "no_aplica";

  try {
    // Sin conexión con Google: no hacer nada, dejar sync_state='pendiente'
    // y no lanzar error al usuario (10.5).
    const calendar = await getGoogleClient(payment.ownerId);
    if (!calendar) return "sin_conexion";

    const settings = await getOwnerSettings(payment.ownerId);
    const now = new Date().toISOString();

    if (payment.paidAt) {
      // Pago cobrado: su evento se borra del calendario.
      if (payment.eventId) {
        try {
          await calendar.events.delete({
            calendarId: cobrosCalendarId(settings),
            eventId: payment.eventId,
          });
        } catch (error) {
          if (!isEventGone(error)) throw error;
        }
      }
      await markSynced(paymentId, {
        google_event_id: null,
        sync_state: "no_aplica",
        sync_error: null,
        synced_at: now,
      });
      return "no_aplica";
    }

    // Pago pendiente: si el calendario dedicado falta (p. ej. falló en el
    // callback), se crea aquí antes del primer insert.
    let calendarId = cobrosCalendarId(settings);
    if (!settings.googleCalendarId) {
      try {
        calendarId = await ensureCobrosCalendar(payment.ownerId, calendar);
      } catch {
        // Salvaguarda: nunca bloquea la sincronización del pago.
        calendarId = "primary";
      }
    }

    const body = buildPaymentEventBody(payment, settings);
    let eventId = payment.eventId;
    if (eventId) {
      try {
        await calendar.events.patch({
          calendarId,
          eventId,
          requestBody: body,
        });
      } catch (error) {
        if (!isEventGone(error)) throw error;
        // El evento desapareció (p. ej. calendario borrado y recreado):
        // se crea otro en su lugar en vez de duplicar.
        const inserted = await calendar.events.insert({
          calendarId,
          requestBody: body,
        });
        eventId = inserted.data?.id ?? null;
        if (!eventId) throw new Error("Google no devolvió el id del evento.");
      }
    } else {
      const inserted = await calendar.events.insert({
        calendarId,
        requestBody: body,
      });
      eventId = inserted.data?.id ?? null;
      if (!eventId) throw new Error("Google no devolvió el id del evento.");
    }
    await markSynced(paymentId, {
      google_event_id: eventId,
      sync_state: "sincronizado",
      sync_error: null,
      synced_at: now,
    });
    return "sincronizado";
  } catch (error) {
    // Error de la API: queda registrado para la resincronización manual.
    try {
      await markSynced(paymentId, {
        sync_state: "error",
        sync_error: errorText(error).slice(0, 500),
        synced_at: new Date().toISOString(),
      });
    } catch {
      // El pago sigue guardado; nada más que hacer.
    }
    return "error";
  }
}

// 10.5 "Pago borrado": borra el evento de Google ANTES de borrar la fila.
// Mejor esfuerzo: si falla, la fila se borra igualmente y el evento huérfano
// queda localizable por extendedProperties.
export async function removePaymentEvent(paymentId: string): Promise<void> {
  let payment: Awaited<ReturnType<typeof loadPaymentContext>>;
  try {
    payment = await loadPaymentContext(paymentId);
  } catch {
    return;
  }
  if (!payment?.eventId) return;

  const calendar = await getGoogleClient(payment.ownerId);
  if (!calendar) return;

  const settings = await getOwnerSettings(payment.ownerId);
  try {
    await calendar.events.delete({
      calendarId: cobrosCalendarId(settings),
      eventId: payment.eventId,
    });
  } catch {
    // Sin conexión o evento ya inexistente: no bloquea el borrado del pago.
  }
}

// ---------------------------------------------------------------------------
// 10.6: lectura de eventos para Home. Calendario principal + Cobros, con
// caché de 5 minutos para no agotar la cuota.
// ---------------------------------------------------------------------------

const EVENTS_CACHE_TTL_MS = 5 * 60_000;
const eventsCache = new Map<
  string,
  { expiresAt: number; value: GoogleEventsResult }
>();

function toUtcInstant(date: string, endOfDay: boolean): string {
  return fromZonedTime(
    `${date}T${endOfDay ? "23:59:59.999" : "00:00:00"}`,
    APP_TIMEZONE,
  ).toISOString();
}

function normalizeEvent(
  item: calendar_v3.Schema$Event,
  source: GoogleEvent["source"],
): GoogleEvent | null {
  const id = item.id ?? null;
  const start = item.start?.date ?? item.start?.dateTime ?? null;
  const end = item.end?.date ?? item.end?.dateTime ?? null;
  if (!id || !start || !end) return null;
  return {
    id,
    title: item.summary ?? "",
    start,
    end,
    allDay: Boolean(item.start?.date),
    source,
  };
}

export async function listGoogleEvents(
  ownerId: string,
  from: string,
  to: string,
): Promise<GoogleEventsResult> {
  const cacheKey = `${ownerId}|${from}|${to}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const calendar = await getGoogleClient(ownerId);
  if (!calendar) {
    // Sin conexión: 200 con connected=false, no un error (10.6).
    return { connected: false, events: [] };
  }

  const settings = await getOwnerSettings(ownerId);
  const calendarIds: { id: string; source: GoogleEvent["source"] }[] = [
    { id: "primary", source: "principal" },
  ];
  if (settings.googleCalendarId) {
    calendarIds.push({
      id: settings.googleCalendarId,
      source: "cobros",
    });
  }

  const timeMin = toUtcInstant(from, false);
  const timeMax = toUtcInstant(to, true);

  const events: GoogleEvent[] = [];
  try {
    for (const { id, source } of calendarIds) {
      // El calendario de Cobros puede haber desaparecido: no puede tumbar
      // la lectura del principal.
      try {
        const { data } = await calendar.events.list({
          calendarId: id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 250,
        });
        for (const item of data?.items ?? []) {
          const normalized = normalizeEvent(item, source);
          if (normalized) events.push(normalized);
        }
      } catch (error) {
        if (id === "primary") throw error;
      }
    }
  } catch {
    return { connected: false, events: [] };
  }

  const value: GoogleEventsResult = { connected: true, events };
  eventsCache.set(cacheKey, {
    expiresAt: Date.now() + EVENTS_CACHE_TTL_MS,
    value,
  });
  return value;
}