"use client";

import { TaskMoveMenu } from "@/components/tasks/TaskMoveMenu";
import { HoursText } from "@/components/shared/HoursText";
import { MoneyText } from "@/components/shared/MoneyText";
import { phaseAllowsCost } from "@/lib/constants/phases";
import type { TaskRow, TaskStatus } from "@/lib/queries/tasks";

// Tarjeta del kanban (5.3). El clic abre el diálogo de tiempo y coste
// (finalizar o corregir); el menú de tres puntos es la vía de movimiento.
export function TaskCard({
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
  const allowsCost = phaseAllowsCost(task.phase);

  return (
    <article
      onClick={() => onEditEffort(task)}
      className="cursor-pointer rounded-md border border-subtle bg-surface-2 p-3 transition-colors duration-150 hover:bg-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] font-medium text-primary">{task.title}</p>
          {task.phase === null ? (
            <p className="text-[11px] text-muted">Personalizada</p>
          ) : null}
          {task.status === "done" ? (
            <p className="num text-[11px] text-secondary">
              <HoursText minutes={task.minutes} />
              {allowsCost ? (
                <>
                  {" · "}
                  <MoneyText value={task.cost_eur} />
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <TaskMoveMenu
            task={task}
            onMove={onMove}
            onEditEffort={onEditEffort}
            onEditCustom={onEditCustom}
            onDelete={onDelete}
          />
        </div>
      </div>
    </article>
  );
}
