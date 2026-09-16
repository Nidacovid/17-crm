import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskCustomDialog } from "@/components/tasks/TaskCustomDialog";
import { HoursText } from "@/components/shared/HoursText";
import { MoneyText } from "@/components/shared/MoneyText";
import { getProjectTasksPage } from "@/lib/queries/tasks";

// Kanban del proyecto: siempre a página completa, nunca en panel (5.1).
export default async function TareasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProjectTasksPage(id);
  if (!data) notFound();

  const { project, tasks, totals } = data;

  return (
    <>
      <PageHeader
        title={`Tareas — ${project.name}`}
        breadcrumbs={[
          { label: "Proyectos", href: "/proyectos" },
          { label: project.name, href: `/proyectos/${project.id}` },
          { label: "Tareas" },
        ]}
        backHref={`/proyectos/${project.id}`}
        actions={
          <>
            <dl className="flex items-center gap-4 text-[11px] text-secondary">
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">Horas totales</dt>
                <dd className="num text-primary">
                  <HoursText minutes={totals.minutes_total} />
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">Coste total</dt>
                <dd className="num text-primary">
                  <MoneyText value={totals.cost_total} />
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">Finalizadas</dt>
                <dd className="num text-primary">
                  {totals.tasks_done} de 9
                </dd>
              </div>
            </dl>
            <TaskCustomDialog projectId={project.id} />
          </>
        }
      />
      <div className="p-6">
        <KanbanBoard projectId={project.id} initialTasks={tasks} />
      </div>
    </>
  );
}