"use client";

import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_STATUS, TASK_STATUS_KEYS } from "@/lib/constants/statuses";
import type { TaskRow, TaskStatus } from "@/lib/queries/tasks";

// Menú de la tarjeta (5.3). El movimiento por menú es el mecanismo principal
// (D-20); el arrastrar y soltar solo llega en la Fase 14.
export function TaskMoveMenu({
  task,
  onMove,
  onEditEffort,
  onEditCustom,
  onDelete,
}: {
  task: TaskRow;
  onMove: (task: TaskRow, toStatus: TaskStatus) => void;
  onEditEffort: (task: TaskRow) => void;
  onEditCustom: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}) {
  const isCustom = task.phase === null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Acciones de la tarea"
        >
          <MoreVertical aria-hidden strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Mover a</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {TASK_STATUS_KEYS.map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={task.status === status}
                onClick={() => onMove(task, status)}
              >
                {TASK_STATUS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {task.status === "done" ? (
          <DropdownMenuItem onClick={() => onEditEffort(task)}>
            Editar tiempo y coste
          </DropdownMenuItem>
        ) : null}
        {isCustom ? (
          <DropdownMenuItem onClick={() => onEditCustom(task)}>
            Editar tarea
          </DropdownMenuItem>
        ) : null}
        {isCustom ? (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(task)}
          >
            Eliminar tarea
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
