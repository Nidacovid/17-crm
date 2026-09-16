"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KanbanColumn } from "@/components/tasks/KanbanColumn";
import { TaskCompleteDialog } from "@/components/tasks/TaskCompleteDialog";
import { TaskCustomDialog } from "@/components/tasks/TaskCustomDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { deleteCustomTask, moveTask } from "@/lib/actions/tasks";
import { TASK_STATUS } from "@/lib/constants/statuses";
import type { TaskRow, TaskStatus } from "@/lib/queries/tasks";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: TASK_STATUS.todo },
  { status: "doing", label: TASK_STATUS.doing },
  { status: "done", label: TASK_STATUS.done },
];

const TASK_COLUMNS =
  "id,project_id,phase,title,status,position,minutes,cost_eur,started_at,completed_at";

// Lectura en cliente con TanStack Query (excepción de la regla 2.4.22 que
// permite lecturas con RLS desde el navegador para la caché y la
// actualización optimista).
async function fetchTasks(projectId: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TaskRow[];
}

function nextPosition(tasks: TaskRow[], status: TaskStatus): number {
  const max = tasks
    .filter((task) => task.status === status)
    .reduce((highest, task) => Math.max(highest, task.position), 0);
  return max + 1000;
}

// Tablero (5.2) con movimiento optimista (5.6). Las cifras del encabezado
// viven en el servidor y se refrescan con router.refresh().
export function KanbanBoard({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: TaskRow[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [completeTarget, setCompleteTarget] = useState<TaskRow | null>(null);
  const [editTarget, setEditTarget] = useState<TaskRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null);

  const queryKey = ["tasks", projectId] as const;

  const { data: tasks = initialTasks } = useQuery({
    queryKey,
    queryFn: () => fetchTasks(projectId),
    initialData: initialTasks,
  });

  const moveMutation = useMutation({
    mutationFn: ({
      taskId,
      toStatus,
    }: {
      taskId: string;
      toStatus: TaskStatus;
    }) => moveTask(taskId, toStatus),
    onMutate: async ({ taskId, toStatus }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskRow[]>(queryKey);
      queryClient.setQueryData<TaskRow[]>(queryKey, (old) => {
        const list = old ?? [];
        return list.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: toStatus,
                position: nextPosition(list, toStatus),
                // El trigger limpia completed_at y rellena started_at (D-25).
                completed_at: toStatus === "done" ? task.completed_at : null,
                started_at:
                  toStatus === "doing" && task.started_at === null
                    ? new Date().toISOString()
                    : task.started_at,
              }
            : task,
        );
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("No se pudo mover la tarea. Vuelve a intentarlo.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteCustomTask(taskId),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo eliminar la tarea.");
        return;
      }
      toast.success("Tarea eliminada");
      queryClient.invalidateQueries({ queryKey });
      router.refresh();
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("No se pudo eliminar la tarea.");
    },
  });

  function handleMove(task: TaskRow, toStatus: TaskStatus) {
    if (task.status === toStatus) return;
    // Mover a Finished abre el diálogo automáticamente (5.4).
    if (toStatus === "done") {
      setCompleteTarget(task);
      return;
    }
    moveMutation.mutate({ taskId: task.id, toStatus });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={tasks.filter((task) => task.status === column.status)}
            onMove={handleMove}
            onEditEffort={(task) => setCompleteTarget(task)}
            onEditCustom={(task) => setEditTarget(task)}
            onDelete={(task) => setDeleteTarget(task)}
          />
        ))}
      </div>

      <TaskCompleteDialog
        open={completeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCompleteTarget(null);
        }}
        task={completeTarget}
      />

      <TaskCustomDialog
        projectId={projectId}
        task={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar tarea"
        description={`Se eliminará «${deleteTarget?.title ?? ""}». Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar tarea"
        destructive
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}
