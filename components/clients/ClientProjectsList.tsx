import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { MoneyText } from "@/components/shared/MoneyText";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ClientProjectRow } from "@/lib/queries/clients";

// Proyectos del cliente: nombre · estado · precio. Al pulsar navega a la
// ficha del proyecto (panel superpuesto o página completa en móvil).
export function ClientProjectsList({
  projects,
}: {
  projects: ClientProjectRow[];
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Este cliente todavía no tiene proyectos."
        description="Cuando crees un proyecto para este cliente aparecerá aquí, con su estado y su precio."
      />
    );
  }

  return (
    <ul className="divide-y divide-subtle overflow-hidden rounded-lg border border-subtle bg-surface">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/proyectos/${project.id}`}
            className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-hover"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-accent">
              {project.name}
            </span>
            <StatusBadge status={project.status} />
            <MoneyText
              value={project.price_net}
              className="w-24 shrink-0 text-right text-[13px] text-secondary"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}