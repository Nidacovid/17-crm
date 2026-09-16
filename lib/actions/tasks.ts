"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { z as zod } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  customTaskSchema,
  taskStatusSchema,
  taskTitleSchema,
  type CustomTaskInput,
} from "@/lib/schemas/task";
import { taskCompletionSchema } from "@/lib/schemas/taskCompletion";
import { phaseAllowsCost } from "@/lib/constants/phases";
import type { Database } from "@/types/database";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPhase = Database["public"]["Enums"]["task_phase"];

export type TaskActionResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

const uuidSchema = zod.string().uuid();
const costNotAllowedMessage = "Esta fase no registra coste de IA.";

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function revalidateProjectTasks(projectId: string) {
  revalidatePath(`/proyectos/${projectId}/tareas`);
  revalidatePath(`/proyectos/${projectId}`);
}

// position = max(position de la columna) + 1000 (5.6).
async function nextPosition(
  supabase: SupabaseClient<Database>,
  projectId: string,
  status: TaskStatus,
): Promise<number> {
  const { data } = await supabase
    .from("tasks")
    .select("position")
    .eq("project_id", projectId)
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1000;
}

async function getTaskPhase(
  supabase: SupabaseClient<Database>,
  taskId: string,
): Promise<{
  project_id: string;
  phase: TaskPhase | null;
  status: TaskStatus;
} | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("project_id,phase,status")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

// D-04 en servidor: rechaza coste en fase que no lo admite (doble barrera).
function rejectCostIfNotAllowed(
  phase: TaskPhase | null,
  cost: number | null,
): TaskActionResult | null {
  if (cost !== null && !phaseAllowsCost(phase)) {
    return { ok: false, fieldErrors: { cost_eur: costNotAllowedMessage } };
  }
  return null;
}

export async function moveTask(
  taskId: string,
  toStatus: TaskStatus,
): Promise<TaskActionResult> {
  if (!uuidSchema.safeParse(taskId).success) {
    return { ok: false, error: "Identificador de tarea no válido." };
  }
  if (!taskStatusSchema.safeParse(toStatus).success) {
    return { ok: false, error: "Estado de tarea no válido." };
  }

  const supabase = await createClient();
  const task = await getTaskPhase(supabase, taskId);
  if (!task) return { ok: false, error: "La tarea ya no existe." };

  const position = await nextPosition(supabase, task.project_id, toStatus);
  const { error } = await supabase
    .from("tasks")
    .update({ status: toStatus, position })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectTasks(task.project_id);
  return { ok: true };
}

export async function completeTask(
  taskId: string,
  input: unknown,
): Promise<TaskActionResult> {
  if (!uuidSchema.safeParse(taskId).success) {
    return { ok: false, error: "Identificador de tarea no válido." };
  }
  const parsed = taskCompletionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const task = await getTaskPhase(supabase, taskId);
  if (!task) return { ok: false, error: "La tarea ya no existe." };

  const rejected = rejectCostIfNotAllowed(task.phase, parsed.data.cost_eur);
  if (rejected) return rejected;

  const position = await nextPosition(supabase, task.project_id, "done");
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "done",
      position,
      minutes: parsed.data.minutes,
      cost_eur: parsed.data.cost_eur,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectTasks(task.project_id);
  return { ok: true };
}

// Corrección de tiempo y coste de una tarea ya finalizada (5.3/5.4).
export async function updateTaskEffort(
  taskId: string,
  input: unknown,
): Promise<TaskActionResult> {
  if (!uuidSchema.safeParse(taskId).success) {
    return { ok: false, error: "Identificador de tarea no válido." };
  }
  const parsed = taskCompletionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const task = await getTaskPhase(supabase, taskId);
  if (!task) return { ok: false, error: "La tarea ya no existe." };

  const rejected = rejectCostIfNotAllowed(task.phase, parsed.data.cost_eur);
  if (rejected) return rejected;

  const { error } = await supabase
    .from("tasks")
    .update({
      minutes: parsed.data.minutes,
      cost_eur: parsed.data.cost_eur,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectTasks(task.project_id);
  return { ok: true };
}

export async function createCustomTask(
  projectId: string,
  input: CustomTaskInput,
): Promise<TaskActionResult> {
  if (!uuidSchema.safeParse(projectId).success) {
    return { ok: false, error: "Identificador de proyecto no válido." };
  }
  const parsed = customTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const position = await nextPosition(supabase, projectId, parsed.data.status);
  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    phase: null,
    title: parsed.data.title,
    status: parsed.data.status,
    position,
  });
  if (error) return { ok: false, error: error.message };

  revalidateProjectTasks(projectId);
  return { ok: true };
}

export async function updateTaskTitle(
  taskId: string,
  input: unknown,
): Promise<TaskActionResult> {
  if (!uuidSchema.safeParse(taskId).success) {
    return { ok: false, error: "Identificador de tarea no válido." };
  }
  const parsed = taskTitleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const task = await getTaskPhase(supabase, taskId);
  if (!task) return { ok: false, error: "La tarea ya no existe." };
  if (task.phase !== null) {
    return { ok: false, error: "Las tareas de fase no se pueden editar." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ title: parsed.data.title })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectTasks(task.project_id);
  return { ok: true };
}

export async function deleteCustomTask(
  taskId: string,
): Promise<TaskActionResult> {
  if (!uuidSchema.safeParse(taskId).success) {
    return { ok: false, error: "Identificador de tarea no válido." };
  }

  const supabase = await createClient();
  const task = await getTaskPhase(supabase, taskId);
  if (!task) return { ok: false, error: "La tarea ya no existe." };
  if (task.phase !== null) {
    return { ok: false, error: "Las 9 tareas fijas no se pueden borrar." };
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateProjectTasks(task.project_id);
  return { ok: true };
}
