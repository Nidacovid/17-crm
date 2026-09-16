"use server";

import { revalidatePath } from "next/cache";
import { z as zod } from "zod";
import { createClient } from "@/lib/supabase/server";
import { documentKindSchema, documentSchema } from "@/lib/schemas/document";
import { normalizeUrl } from "@/lib/utils";

const uuidSchema = zod.string().uuid();

export type DocumentActionResult =
  | { ok: true; id?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

export type ProjectDocumentInput = {
  id?: string;
  project_id: string;
  kind: string;
  label?: string;
  url: string;
};

const projectDocumentInputSchema = zod.object({
  id: zod.string().uuid().optional(),
  project_id: zod.string().uuid(),
  kind: documentKindSchema,
  label: zod.string().trim().max(120).optional(),
  url: zod.string().trim(),
});

function revalidateProject(projectId: string) {
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${projectId}`);
}

// Alta/edición de un documento de proyecto. Los tipos fijos (Informe Proyecto,
// Contrato, Repositorio, PyS, Guía uso personal) son únicos por proyecto; "otro"
// admite varias filas. Vaciar la URL de un tipo fijo elimina el documento.
export async function upsertProjectDocument(
  input: ProjectDocumentInput,
): Promise<DocumentActionResult> {
  const parsedInput = projectDocumentInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      ok: false,
      fieldErrors: { url: "Revisa los datos del documento." },
    };
  }
  const { id, project_id, kind, label } = parsedInput.data;
  const url = parsedInput.data.url ? normalizeUrl(parsedInput.data.url) : "";

  // Un documento nuevo de tipo "otro" sin URL no se guarda (no hay nada que guardar).
  if (!url && kind === "otro" && !id) {
    return { ok: true };
  }

  if (url) {
    const parsed = documentSchema.safeParse({
      project_id,
      kind,
      label: kind === "otro" ? label : undefined,
      url,
    });
    if (!parsed.success) {
      return {
        ok: false,
        fieldErrors: { url: "Introduce una URL válida." },
      };
    }
  }

  const supabase = await createClient();

  // Tipo fijo sin URL: si existía, se elimina.
  if (kind !== "otro" && !url) {
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("project_id", project_id)
      .eq("kind", kind);
    if (error) return { ok: false, error: error.message };
    revalidateProject(project_id);
    return { ok: true };
  }

  if (id && !url) {
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("project_id", project_id);
    if (error) return { ok: false, error: error.message };
    revalidateProject(project_id);
    return { ok: true };
  }

  if (id) {
    const { error } = await supabase
      .from("documents")
      .update({
        kind,
        label: label || null,
        url,
      })
      .eq("id", id)
      .eq("project_id", project_id);
    if (error) return { ok: false, error: error.message };
    revalidateProject(project_id);
    return { ok: true, id };
  }

  if (kind === "otro") {
    const { data, error } = await supabase
      .from("documents")
      .insert({ project_id, kind, label: label || null, url })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidateProject(project_id);
    return { ok: true, id: data.id };
  }

  const { data: existing, error: selectError } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", project_id)
    .eq("kind", kind)
    .limit(1)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };

  if (existing) {
    const { error } = await supabase
      .from("documents")
      .update({ url })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidateProject(project_id);
    return { ok: true, id: existing.id };
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({ project_id, kind, url })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidateProject(project_id);
  return { ok: true, id: data.id };
}

export async function deleteDocument(
  id: string,
): Promise<DocumentActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Identificador de documento no válido." };
  }

  const supabase = await createClient();
  const { data: document, error: selectError } = await supabase
    .from("documents")
    .select("project_id,client_id")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (document?.project_id) revalidateProject(document.project_id);
  if (document?.client_id) revalidatePath(`/contactos/${document.client_id}`);
  return { ok: true };
}
