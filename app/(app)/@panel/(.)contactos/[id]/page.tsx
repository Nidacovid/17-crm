import { ClientDetail } from "@/components/clients/ClientDetail";
import { DetailPanelShell } from "@/components/shared/DetailPanelShell";
import { getClientDetail } from "@/lib/queries/clients";

// Ruta interceptada: la ficha se abre como panel lateral sobre la lista
// cuando la navegación es interna (D-18). La recarga muestra la página
// completa desde app/(app)/contactos/[id]/page.tsx.
export default async function InterceptedClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientDetail(id);
  if (!data) return null;

  return (
    <DetailPanelShell title={data.client.business_name}>
      <div className="p-5">
        <ClientDetail {...data} />
      </div>
    </DetailPanelShell>
  );
}