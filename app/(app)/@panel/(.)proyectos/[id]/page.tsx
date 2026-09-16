import { ProjectDetail } from "@/components/projects/ProjectDetail";
import { DetailPanelShell } from "@/components/shared/DetailPanelShell";
import { getProjectDetail } from "@/lib/queries/projects";

// Ruta interceptada: la ficha se abre como panel lateral sobre la lista
// cuando la navegación es interna (D-18). La recarga muestra la página
// completa desde app/(app)/proyectos/[id]/page.tsx.
export default async function InterceptedProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProjectDetail(id);
  if (!data) return null;

  return (
    <DetailPanelShell title={data.project.name}>
      <div className="p-5">
        <ProjectDetail {...data} />
      </div>
    </DetailPanelShell>
  );
}
