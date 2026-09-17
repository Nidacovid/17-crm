"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/schemas/settings";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

// Regla 2.4.7: reutiliza el esquema de ajustes de lib/schemas/settings.ts.
const reminderSchema = settingsSchema.pick({
  reminder_time: true,
  reminder_days_before: true,
});

export type ReminderSettingsInput = z.input<typeof reminderSchema>;

// 10.8: hora del aviso y días de antelación de los eventos de cobro.
export async function updateReminderSettings(
  input: ReminderSettingsInput,
): Promise<SettingsActionResult> {
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { error } = await supabase
    .from("app_settings")
    .update({
      reminder_time: parsed.data.reminder_time,
      reminder_days_before: parsed.data.reminder_days_before,
    })
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/ajustes");
  return { ok: true };
}

// 10.8: regenera el token del feed .ics (invalida el anterior). Mismo
// formato que el default de la base: 24 bytes en hex.
export async function regenerateIcsToken(): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { error } = await supabase
    .from("app_settings")
    .update({ ics_token: randomBytes(24).toString("hex") })
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/ajustes");
  return { ok: true };
}