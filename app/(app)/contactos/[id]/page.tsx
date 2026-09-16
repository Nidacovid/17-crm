import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { getClientDetail } from "@/lib/queries/clients";

// Ficha de contacto a página completa: la usan el enlace directo y el
// acceso desde móvil (D-18). Mismo contenido que el panel lateral.
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientDetail(id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <ClientDetail {...data} />
    </div>
  );
}