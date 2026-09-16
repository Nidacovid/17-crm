import { FilterGroup, type FilterOption } from "@/components/shared/FilterGroup";
import { SearchInput } from "@/components/shared/SearchInput";
import { CLIENT_STATUS } from "@/lib/constants/statuses";
import type { ClientStatusCounts } from "@/lib/queries/clients";

// Buscador (negocio, teléfono y tipo de negocio) + filtro de estado con
// recuentos, ambos reflejados en la URL (?q=&estado=).
export function ClientFilters({ counts }: { counts: ClientStatusCounts }) {
  const options: FilterOption[] = [
    { value: "todos", label: "Todos", count: counts.todos },
    { value: "terminado", label: CLIENT_STATUS.terminado, count: counts.terminado },
    { value: "en_proceso", label: CLIENT_STATUS.en_proceso, count: counts.en_proceso },
    { value: "potencial", label: CLIENT_STATUS.potencial, count: counts.potencial },
    { value: "nada", label: CLIENT_STATUS.nada, count: counts.nada },
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput placeholder="Buscar por negocio, teléfono o tipo" />
      <FilterGroup options={options} paramKey="estado" />
    </div>
  );
}