"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { z as zod } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  clientNoteSchema,
  type ClientNoteInput,
} from "@/lib/schemas/clientNote";

export type NoteActionResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

const noteUpdateSchema = clientNoteSchema.pick({
  note_date: true,
  body: true,
});

const uuidSchema = zod.string().uuid();

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function revalidateClientPages(clientId: string) {
  revalidatePath("/contactos");
  revalidatePath(`/contactos/${clientId}`);
}

export async function addClientNote(
  input: ClientNoteInput,
): Promise<NoteActionResult> {
  const parsed = clientNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").insert({
    client_id: parsed.data.client_id,
    note_date: parsed.data.note_date,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };

  revalidateClientPages(parsed.data.client_id);
  return { ok: true };
}

export async function updateClientNote(
  id: string,
  input: { note_date: string; body: string },
): Promise<NoteActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de nota no válido." };
  }
  const parsed = noteUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_notes")
    .update({ note_date: parsed.data.note_date, body: parsed.data.body })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const { data: note } = await supabase
    .from("client_notes")
    .select("client_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (note) revalidateClientPages(note.client_id);

  return { ok: true };
}

export async function deleteClientNote(id: string): Promise<NoteActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de nota no válido." };
  }
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("client_notes")
    .select("client_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("client_notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (note) revalidateClientPages(note.client_id);
  return { ok: true };
}