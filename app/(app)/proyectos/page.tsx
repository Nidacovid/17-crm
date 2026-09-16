import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectCreateDialog } from "@/components/projects/ProjectCreateDialog";
import { ProjectFilters } from "@/components/projects/ProjectFilters";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { getClientOptions, getProjectsList } from "@/lib/queries/projects";
import { getBusinessTypes } from "@/lib/queries/clients";
import { PROJECT_STATUS_KEYS } from "@/lib/constants/statuses";

const VALID_ESTADOS = new Set<string>(["todos", ...PROJECT_STATUS_KEYS]);

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q = "", estado } = await searchParams;
  const statusFilter =
    estado && VALID_ESTADOS.has(estado) ? estado : "todos";

  const [{ rows, counts }, clients, businessTypes] = await Promise.all([
    getProjectsList({ q }),
    getClientOptions(),
    getBusinessTypes(),
  ]);

  // D-10: los cancelados no se muestran sin filtro; su pestaña los hace accesibles.
  const visibleRows =
    statusFilter === "todos"
      ? rows.filter((row) => row.status !== "cancelado")
      : rows.filter((row) => row.status === statusFilter);

  return (
    <>
      <PageHeader
        title="Proyectos"
        actions={
          <ProjectCreateDialog
            clients={clients}
            businessTypes={businessTypes}
          />
        }
      />
      <div className="space-y-4 p-6">
        <ProjectFilters counts={counts} />
        {visibleRows.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={
              rows.length > 0 ? "Sin resultados" : "Aún no tienes proyectos"
            }
            description={
              rows.length > 0
                ? "Ningún proyecto coincide con la búsqueda o el filtro seleccionados. Prueba con otros términos."
                : "Genera el primero para empezar a registrar horas, costes y pagos."
            }
          />
        ) : (
          <ProjectsTable rows={visibleRows} />
        )}
      </div>
    </>
  );
}
