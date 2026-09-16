import { FilterGroup, type FilterOption } from "@/components/shared/FilterGroup";
import { SearchInput } from "@/components/shared/SearchInput";
import type { ProjectStatusCounts } from "@/lib/queries/projects";

// Buscador (nombre del proyecto y nombre del negocio) + filtro de estado con
// recuentos, ambos reflejados en la URL (?q=&estado=). "Cancelados" queda
// desactivado por defecto: sin filtro solo se muestran los proyectos activos.
export function ProjectFilters({ counts }: { counts: ProjectStatusCounts }) {
  const options: FilterOption[] = [
    { value: "todos", label: "Todos", count: counts.todos },
    { value: "a_empezar", label: "A empezar", count: counts.a_empezar },
    {
      value: "en_desarrollo",
      label: "En desarrollo",
      count: counts.en_desarrollo,
    },
    { value: "terminado", label: "Terminados", count: counts.terminado },
    { value: "cancelado", label: "Cancelados", count: counts.cancelado },
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput placeholder="Buscar por proyecto o negocio" />
      <FilterGroup options={options} paramKey="estado" />
    </div>
  );
}
