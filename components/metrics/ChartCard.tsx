import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ChartCardEmpty = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Marco común de toda gráfica o tabla de Métricas (7.6): título, descripción,
// zona de acciones (por ejemplo el selector de periodo), estado vacío y estado
// de carga. Se construye una sola vez y lo reutilizan todas las oleadas.
export function ChartCard({
  title,
  description,
  actions,
  empty,
  loading = false,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  empty?: ChartCardEmpty;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-subtle bg-surface",
        className,
      )}
    >
      <header className="flex flex-col gap-2 border-b border-subtle px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-primary">{title}</h2>
          {description ? (
            <p className="text-xs text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {loading ? (
        <div className="p-5">
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      ) : empty ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
        />
      ) : (
        <div className="p-5">{children}</div>
      )}
    </section>
  );
}
