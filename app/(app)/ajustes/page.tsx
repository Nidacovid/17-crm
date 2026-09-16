import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function AjustesPage() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="p-6">
        <EmptyState
          icon={Settings}
          title="Aquí irán tus preferencias"
          description="Esta pantalla todavía no tiene contenido. Se completará en una fase posterior."
        />
      </div>
    </>
  );
}
