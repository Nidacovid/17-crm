import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import { getProjectDetail } from "@/lib/queries/projects";

// Ficha de proyecto a página completa: la usan el enlace directo y el
// acceso desde móvil (D-18). Mismo contenido que el panel lateral.
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProjectDetail(id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <ProjectDetail {...data} />
    </div>
  );
}
