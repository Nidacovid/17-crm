import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function MetricasPage() {
  return (
    <>
      <PageHeader title="Métricas" />
      <div className="p-6">
        <EmptyState
          icon={BarChart3}
          title="Aquí irán tus métricas"
          description="Esta pantalla todavía no tiene contenido. Se completará en una fase posterior."
        />
      </div>
    </>
  );
}
