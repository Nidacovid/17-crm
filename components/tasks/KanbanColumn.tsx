"use client";

import { TaskCard } from "@/components/tasks/TaskCard";
import type { TaskRow, TaskStatus } from "@/lib/queries/tasks";

// Columna del tablero (5.2): cabecera con nombre y recuento, y las tarjetas
// ordenadas por `position`.
export function KanbanColumn({
  status,
  label,
  tasks,
  onMove,
  onEditEffort,
  onEditCustom,
  onDelete,
}: {
  status: TaskStatus;
  label: string;
  tasks: TaskRow[];
  onMove: (task: TaskRow, toStatus: TaskStatus) => void;
  onEditEffort: (task: TaskRow) => void;
  onEditCustom: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}) {
  const ordered = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <section
      aria-label={label}
      className="flex flex-col rounded-lg border border-subtle bg-surface"
    >
      <header className="flex items-center justify-between border-b border-subtle px-3 py-2.5">
        <h2 className="text-xs font-medium text-primary">{label}</h2>
        <span
          data-status={status}
          className="num text-[11px] text-muted"
        >
          {ordered.length}
        </span>
      </header>
      <div className="flex min-h-24 flex-col gap-2 p-3">
        {ordered.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted">
            Sin tareas en esta columna.
          </p>
        ) : (
          ordered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMove={onMove}
              onEditEffort={onEditEffort}
              onEditCustom={onEditCustom}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}
