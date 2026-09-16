"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completeTask,
  updateTaskEffort,
  type TaskActionResult,
} from "@/lib/actions/tasks";
import { taskCompletionSchema } from "@/lib/schemas/taskCompletion";
import { phaseAllowsCost } from "@/lib/constants/phases";
import type { TaskRow } from "@/lib/queries/tasks";

// 5.4: diálogo clave. Se abre al mover a Finished y, reabierto desde el menú
// o al pulsar la tarjeta, corrige el tiempo y el coste de una tarea.
export function TaskCompleteDialog({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRow | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (!open || !task) return;
    const total = task.minutes ?? 0;
    setHours(task.minutes !== null ? String(Math.floor(total / 60)) : "");
    setMinutes(task.minutes !== null ? String(total % 60) : "");
    setCost(task.cost_eur !== null ? String(task.cost_eur) : "");
  }, [open, task]);

  const allowsCost = task ? phaseAllowsCost(task.phase) : true;
  const noTimeWarning = hours.trim() === "" && minutes.trim() === "";

  const mutation = useMutation({
    mutationFn: async (): Promise<TaskActionResult> => {
      if (!task) return { ok: false, error: "La tarea ya no existe." };

      const input = {
        hours: hours.trim() === "" ? undefined : Number(hours),
        minutes: minutes.trim() === "" ? undefined : Number(minutes),
        cost_eur:
          allowsCost && cost.trim() !== "" ? Number(cost) : undefined,
      };

      const parsed = taskCompletionSchema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: "Revisa el tiempo y el coste introducidos.",
        };
      }

      return task.status === "done"
        ? updateTaskEffort(task.id, parsed.data)
        : completeTask(task.id, parsed.data);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(
          result.fieldErrors?.cost_eur ??
            result.error ??
            "No se pudo guardar la tarea.",
        );
        return;
      }
      toast.success("Tarea finalizada");
      if (task) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", task.project_id],
        });
      }
      router.refresh();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("No se pudo guardar la tarea.");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {task ? `Finalizar: ${task.title}` : "Finalizar tarea"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tiempo dedicado</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label="Horas"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  className="w-20"
                />
                <span className="text-xs text-secondary">horas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={1}
                  inputMode="numeric"
                  aria-label="Minutos"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className="w-20"
                />
                <span className="text-xs text-secondary">min</span>
              </div>
            </div>
          </div>

          {allowsCost ? (
            <div className="space-y-1.5">
              <Label htmlFor="task-cost">Coste (€)</Label>
              <Input
                id="task-cost"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
              />
            </div>
          ) : (
            <p className="text-xs text-muted">
              Esta fase no registra coste de IA.
            </p>
          )}

          {noTimeWarning ? (
            <p className="text-[11px] text-muted">
              Sin tiempo registrado, este proyecto no contará en las métricas
              de rentabilidad.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !task}
          >
            {mutation.isPending ? "Guardando…" : "Guardar y finalizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
