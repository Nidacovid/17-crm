"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomTask,
  updateTaskTitle,
  type TaskActionResult,
} from "@/lib/actions/tasks";
import { TASK_STATUS, TASK_STATUS_KEYS } from "@/lib/constants/statuses";
import type { TaskRow, TaskStatus } from "@/lib/queries/tasks";

// 5.5: crear tarea personalizada (título + columna). Con `task` se reutiliza
// como edición del título de una tarea personalizada (5.3).
export function TaskCustomDialog({
  projectId,
  task,
  open,
  onOpenChange,
  trigger,
}: {
  projectId: string;
  task?: TaskRow | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");

  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : internalOpen;

  useEffect(() => {
    if (!actualOpen) return;
    setTitle(task ? task.title : "");
    setStatus("todo");
  }, [actualOpen, task]);

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  const mutation = useMutation({
    mutationFn: async (): Promise<TaskActionResult> => {
      if (task) return updateTaskTitle(task.id, { title });
      return createCustomTask(projectId, { title, status });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(
          result.fieldErrors?.title ??
            result.error ??
            "No se pudo guardar la tarea.",
        );
        return;
      }
      toast.success(task ? "Tarea actualizada" : "Tarea creada");
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      router.refresh();
      setOpen(false);
    },
    onError: () => {
      toast.error("No se pudo guardar la tarea.");
    },
  });

  return (
    <Dialog
      open={actualOpen}
      onOpenChange={(next) => {
        if (!mutation.isPending) setOpen(next);
      }}
    >
      {trigger !== undefined ? (
        <DialogTrigger asChild>
          {trigger ?? <Button type="button" variant="outline" />}
        </DialogTrigger>
      ) : !task ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <Plus aria-hidden strokeWidth={1.5} />
            Añadir tarea
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {task ? "Editar tarea" : "Añadir tarea"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nombre de la tarea"
              autoFocus
            />
          </div>

          {!task ? (
            <div className="space-y-1.5">
              <Label>Columna de destino</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TaskStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {TASK_STATUS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || title.trim() === ""}
          >
            {mutation.isPending
              ? "Guardando…"
              : task
                ? "Guardar"
                : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
