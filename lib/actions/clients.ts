"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { z as zod } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { clientSchema, type ClientInput } from "@/lib/schemas/client";
import { documentSchema } from "@/lib/schemas/document";
import { normalizePhoneE164, normalizeUrl } from "@/lib/utils";

const uuidSchema = zod.string().uuid();

export type ClientActionResult =
  | { ok: true; id?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

// Upsert del documento informe_cliente: lectura + update o insert
// (el índice único parcial de documents no permite onConflict directo).
async function saveInformeDocument(
  clientId: string,
  informeUrl: string,
): Promise<ClientActionResult | null> {
  const supabase = await createSupabaseClient();
  const { data: existing, error: selectError } = await supabase
    .from("documents")
    .select("id")
    .eq("client_id", clientId)
    .eq("kind", "informe_cliente")
    .limit(1)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };

  if (!informeUrl) {
    if (existing) {
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("id", existing.id);
      if (deleteError) return { ok: false, error: deleteError.message };
    }
    return null;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("documents")
      .update({ url: informeUrl })
      .eq("id", existing.id);
    if (updateError) return { ok: false, error: updateError.message };
    return null;
  }

  const { error: insertError } = await supabase
    .from("documents")
    .insert({ client_id: clientId, kind: "informe_cliente", url: informeUrl });
  if (insertError) return { ok: false, error: insertError.message };
  return null;
}

function revalidateClientPages(clientId?: string) {
  revalidatePath("/contactos");
  if (clientId) revalidatePath(`/contactos/${clientId}`);
}

export async function createClient(
  input: ClientInput,
): Promise<ClientActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const values = parsed.data;
  const informeUrl = values.informe_url ? normalizeUrl(values.informe_url) : "";
  const phoneE164 = values.phone ? normalizePhoneE164(values.phone) : null;

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      business_name: values.business_name,
      contact_name: values.contact_name || null,
      phone: values.phone || null,
      phone_e164: phoneE164,
      email: values.email || null,
      business_type: values.business_type || null,
      status: values.status ?? "potencial",
      notes: values.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        fieldErrors: { phone: "Ya existe otro contacto con este teléfono." },
      };
    }
    return { ok: false, error: error.message };
  }

  if (informeUrl) {
    const docError = await saveInformeDocument(data.id, informeUrl);
    if (docError) return docError;
  }

  revalidateClientPages(data.id);
  return { ok: true, id: data.id };
}

export async function updateClient(
  id: string,
  input: ClientInput,
): Promise<ClientActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de contacto no válido." };
  }
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const values = parsed.data;
  const informeUrl = values.informe_url ? normalizeUrl(values.informe_url) : "";
  const phoneE164 = values.phone ? normalizePhoneE164(values.phone) : null;

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({
      business_name: values.business_name,
      contact_name: values.contact_name || null,
      phone: values.phone || null,
      phone_e164: phoneE164,
      email: values.email || null,
      business_type: values.business_type || null,
      status: values.status ?? "potencial",
      notes: values.notes || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        fieldErrors: { phone: "Ya existe otro contacto con este teléfono." },
      };
    }
    return { ok: false, error: error.message };
  }

  const docError = await saveInformeDocument(id, informeUrl);
  if (docError) return docError;

  revalidateClientPages(id);
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ClientActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de contacto no válido." };
  }
  const supabase = await createSupabaseClient();

  const { count, error: countError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);
  if (countError) return { ok: false, error: countError.message };

  if (count && count > 0) {
    return {
      ok: false,
      error: `Este cliente tiene ${count} ${
        count === 1 ? "proyecto asociado" : "proyectos asociados"
      } y no se puede eliminar. Elimina primero sus proyectos.`,
    };
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateClientPages(id);
  return { ok: true };
}

export async function upsertClientDocument(
  clientId: string,
  informeUrl: string,
): Promise<ClientActionResult> {
  if (!uuidSchema.safeParse(clientId).success) {
    return { ok: false, error: "Identificador de contacto no válido." };
  }
  const parsed = documentSchema.safeParse({
    client_id: clientId,
    kind: "informe_cliente",
    url: informeUrl,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const docError = await saveInformeDocument(clientId, parsed.data.url);
  if (docError) return docError;

  revalidateClientPages(clientId);
  return { ok: true };
}

// Aviso de duplicados: no bloquea el guardado (3.3), solo informa.
export async function findClientByPhone(
  phone: string,
  excludeId?: string,
): Promise<{ match: { id: string; business_name: string } | null }> {
  const e164 = normalizePhoneE164(phone);
  if (!e164) return { match: null };
  if (excludeId && !uuidSchema.safeParse(excludeId).success) {
    return { match: null };
  }

  const supabase = await createSupabaseClient();
  let query = supabase
    .from("clients")
    .select("id, business_name")
    .eq("phone_e164", e164);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.limit(1).maybeSingle();
  return { match: data ?? null };
}