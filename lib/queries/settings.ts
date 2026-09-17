import { createClient } from "@/lib/supabase/server";
import { getConnectionState } from "@/lib/google/oauth";

// Lecturas de la sección Google de Ajustes (10.8). Regla 2.2.12: columnas
// explícitas siempre.

export type GoogleConnection = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

export type PaymentSyncIssue = {
  id: string;
  seq: number;
  label: string | null;
  amount: number;
  due_date: string;
  sync_error: string | null;
};

export type AjustesGoogleData = {
  reminderTime: string;
  reminderDaysBefore: number;
  icsToken: string;
  googleCalendarId: string | null;
  connection: GoogleConnection;
  pendingSyncCount: number;
  syncErrors: PaymentSyncIssue[];
};

export async function getAjustesGoogleData(): Promise<AjustesGoogleData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      reminderTime: "09:00",
      reminderDaysBefore: 0,
      icsToken: "",
      googleCalendarId: null,
      connection: { connected: false, email: null, connectedAt: null },
      pendingSyncCount: 0,
      syncErrors: [],
    };
  }

  const [settingsResult, syncRows, connection] = await Promise.all([
    supabase
      .from("app_settings")
      .select(
        "reminder_time,reminder_days_before,ics_token,google_calendar_id",
      )
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id,seq,label,amount,due_date,sync_state,sync_error")
      .in("sync_state", ["pendiente", "error"])
      .order("due_date", { ascending: true }),
    getConnectionState(user.id),
  ]);

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }

  const syncErrors: PaymentSyncIssue[] = [];
  for (const row of syncRows.data ?? []) {
    if (row.sync_state !== "error") continue;
    syncErrors.push({
      id: row.id,
      seq: Number(row.seq ?? 0),
      label: row.label ?? null,
      amount: Number(row.amount ?? 0),
      due_date: row.due_date,
      sync_error: row.sync_error ?? null,
    });
  }

  return {
    // Postgres devuelve "HH:MM:SS"; el input type="time" quiere "HH:MM".
    reminderTime: normalizeReminderTime(
      settingsResult.data?.reminder_time ?? "09:00",
    ),
    reminderDaysBefore: Number(settingsResult.data?.reminder_days_before ?? 0),
    icsToken: settingsResult.data?.ics_token ?? "",
    googleCalendarId: settingsResult.data?.google_calendar_id ?? null,
    connection,
    pendingSyncCount: syncRows.data?.length ?? 0,
    syncErrors,
  };
}

function normalizeReminderTime(value: string): string {
  const [hours = "09", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}