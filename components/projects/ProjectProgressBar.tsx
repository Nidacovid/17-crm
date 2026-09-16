import { cn } from "@/lib/utils";

// Barra de progreso fina del proyecto: tareas finalizadas sobre el total
// de fases (9). Se usa en la lista y en el bloque Tareas de la ficha.
export function ProjectProgressBar({
  done,
  total = 9,
  className,
}: {
  done: number;
  total?: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-surface-2",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-150"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
