import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ClientCreateDialog } from "@/components/clients/ClientCreateDialog";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { ClientsTable } from "@/components/clients/ClientsTable";
import {
  getBusinessTypes,
  getClientsList,
} from "@/lib/queries/clients";
import { CLIENT_STATUS_KEYS } from "@/lib/constants/statuses";

const VALID_ESTADOS = new Set<string>(["todos", ...CLIENT_STATUS_KEYS]);

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q = "", estado } = await searchParams;
  const statusFilter =
    estado && VALID_ESTADOS.has(estado) ? estado : "todos";
  const isFiltered = Boolean(q) || statusFilter !== "todos";

  const [{ rows, counts }, businessTypes] = await Promise.all([
    getClientsList({ q }),
    getBusinessTypes(),
  ]);

  const visibleRows =
    statusFilter === "todos"
      ? rows
      : rows.filter((row) => row.status === statusFilter);

  return (
    <>
      <PageHeader
        title="Contactos"
        actions={<ClientCreateDialog businessTypes={businessTypes} />}
      />
      <div className="space-y-4 p-6">
        <ClientFilters counts={counts} />
        {visibleRows.length === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={Users}
              title="Sin resultados"
              description="Ningún contacto coincide con la búsqueda o el filtro seleccionados. Prueba con otros términos."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Aún no tienes contactos"
              description="Crea el primero para empezar a registrar proyectos."
            />
          )
        ) : (
          <ClientsTable rows={visibleRows} />
        )}
      </div>
    </>
  );
}