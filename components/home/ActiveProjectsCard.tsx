import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProjectProgressBar } from "@/components/projects/ProjectProgressBar";
import type { HomeProjectRow } from "@/lib/queries/home";

// 8.3: proyectos en desarrollo (o "A empezar" si hay menos de tres) con
// acceso directo a la ficha, que se abre como panel lateral (D-18).
export async function ActiveProjectsCard({
  data,
}: {
  data: Promise<HomeProjectRow[]>;
}) {
  const projects = await data;

  return (
    <section className="flex flex-col rounded-lg border border-subtle bg-surface p-5">
      <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        Proyectos actuales
      </h2>
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No tienes proyectos en desarrollo."
          description="Crea un proyecto para verlo aquí y entrar en su ficha con un clic."
        />
      ) : (
        <ul className="mt-3 space-y-1">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/proyectos/${project.id}`}
                className="block rounded-md px-2 py-2 transition-colors hover:bg-hover"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-accent">
                    {project.name}
                  </span>
                  <StatusBadge status={project.status} />
                </div>
                <span className="mt-0.5 block truncate text-xs text-secondary">
                  {project.business_name}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <ProjectProgressBar
                    done={project.tasks_done}
                    className="flex-1"
                  />
                  <span className="num text-[11px] text-muted">
                    {project.tasks_done} / 9
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
