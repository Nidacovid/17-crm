import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type TaskRow = Pick<
  Database["public"]["Tables"]["tasks"]["Row"],
  | "id"
  | "project_id"
  | "phase"
  | "title"
  | "status"
  | "position"
  | "minutes"
  | "cost_eur"
  | "started_at"
  | "completed_at"
>;
export type TaskStatus = Database["public"]["Enums"]["task_status"];

// Regla 2.2.12: columnas explícitas, nunca select('*').
export const TASK_COLUMNS =
  "id,project_id,phase,title,status,position,minutes,cost_eur,started_at,completed_at";

export type ProjectTasksTotals = {
  minutes_total: number;
  cost_total: number;
  tasks_done: number;
  tasks_total: number;
};

export type ProjectTasksData = {
  project: { id: string; name: string; code: string };
  tasks: TaskRow[];
  totals: ProjectTasksTotals;
};

// Lectura de la pantalla completa del kanban (5.1): proyecto, sus tareas y
// las cifras del encabezado tomadas de v_project_totals.
export async function getProjectTasksPage(
  projectId: string,
): Promise<ProjectTasksData | null> {
  const supabase = await createClient();

  const projectResult = await supabase
    .from("projects")
    .select("id,name,code")
    .eq("id", projectId)
    .maybeSingle();
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) return null;

  const [tasksResult, totalsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase
      .from("v_project_totals")
      .select("minutes_total,cost_total,tasks_done,tasks_total")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (totalsResult.error) throw new Error(totalsResult.error.message);

  return {
    project: projectResult.data,
    tasks: tasksResult.data ?? [],
    totals: {
      minutes_total: totalsResult.data?.minutes_total ?? 0,
      cost_total: totalsResult.data?.cost_total ?? 0,
      tasks_done: totalsResult.data?.tasks_done ?? 0,
      tasks_total: totalsResult.data?.tasks_total ?? 0,
    },
  };
}
