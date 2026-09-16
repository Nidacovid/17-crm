"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { z as zod } from "zod";
import { createClient } from "@/lib/supabase/server";
import { projectSchema, type ProjectInput } from "@/lib/schemas/project";
import type { Database } from "@/types/database";

type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

const uuidSchema = zod.string().uuid();

export type ProjectActionResult =
  | { ok: true; id?: string; code?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function revalidateProjectPages(projectId?: string, clientId?: string) {
  revalidatePath("/proyectos");
  if (projectId) revalidatePath(`/proyectos/${projectId}`);
  if (clientId) revalidatePath(`/contactos/${clientId}`);
}

export async function createProject(
  input: ProjectInput,
): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const values = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id: values.client_id,
      name: values.name,
      level: values.level,
      status: values.status,
      price_net: values.price_net,
      vat_rate: values.vat_rate,
      estimated_hours:
        values.estimated_hours && values.estimated_hours > 0
          ? values.estimated_hours
          : null,
      payment_mode: values.payment_mode,
      installments: values.installments ?? null,
      down_payment: values.down_payment ?? null,
      started_at: values.started_at ?? null,
      delivered_at: values.delivered_at ?? null,
      // `code` lo genera el trigger set_project_code; el tipo generado lo
      // marca obligatorio por no tener DEFAULT en la tabla.
    } as unknown as ProjectInsert)
    .select("id,code,client_id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateProjectPages(data.id, data.client_id);
  return { ok: true, id: data.id, code: data.code };
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<ProjectActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de proyecto no válido." };
  }
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const values = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      client_id: values.client_id,
      name: values.name,
      level: values.level,
      status: values.status,
      price_net: values.price_net,
      vat_rate: values.vat_rate,
      estimated_hours:
        values.estimated_hours && values.estimated_hours > 0
          ? values.estimated_hours
          : null,
      // Configuración del plan de pagos (Fase 6). A plazos requiere número de
      // plazos; la entrada solo tiene sentido en ese modo.
      payment_mode: values.payment_mode,
      installments:
        values.payment_mode === "plazos" ? (values.installments ?? null) : null,
      down_payment:
        values.payment_mode === "plazos"
          ? (values.down_payment ?? null)
          : null,
      started_at: values.started_at ?? null,
      delivered_at: values.delivered_at ?? null,
    })
    .eq("id", id)
    .select("client_id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateProjectPages(id, data.client_id);
  return { ok: true, id };
}

// D-10: "Eliminar proyecto" archiva. El trigger de la base rellena cancelled_at.
export async function archiveProject(id: string): Promise<ProjectActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de proyecto no válido." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: "cancelado" })
    .eq("id", id)
    .select("client_id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateProjectPages(id, data.client_id);
  return { ok: true, id };
}

// Borrado físico real, solo para errores de tecleo (D-10). Exige el nombre exacto.
export async function hardDeleteProject(
  id: string,
  confirmName: string,
): Promise<ProjectActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de proyecto no válido." };
  }

  const supabase = await createClient();
  const { data: project, error: selectError } = await supabase
    .from("projects")
    .select("name,client_id")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (!project) return { ok: false, error: "El proyecto ya no existe." };

  if (confirmName.trim() !== project.name) {
    return {
      ok: false,
      error: "El nombre no coincide con el del proyecto.",
    };
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateProjectPages(undefined, project.client_id);
  return { ok: true };
}
