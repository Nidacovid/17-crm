"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveProject, hardDeleteProject } from "@/lib/actions/projects";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Input } from "@/components/ui/input";

// D-10: "Eliminar proyecto" archiva (estado cancelado), conservando horas,
// costes e historial. El borrado físico real exige escribir el nombre exacto.
export function ArchiveProjectDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [hardOpen, setHardOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleArchive() {
    setArchiving(true);
    const result = await archiveProject(projectId);
    setArchiving(false);

    if (result.ok) {
      toast.success("Proyecto archivado");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "No se pudo archivar el proyecto.");
    }
  }

  async function handleHardDelete() {
    setDeleting(true);
    const result = await hardDeleteProject(projectId, typedName);
    setDeleting(false);

    if (result.ok) {
      toast.success("Proyecto eliminado");
      setHardOpen(false);
      onOpenChange(false);
      router.push("/proyectos");
    } else {
      toast.error(result.error ?? "No se pudo eliminar el proyecto.");
    }
  }

  return (
    <>
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Archivar proyecto"
        description="El proyecto pasará a Cancelado y dejará de aparecer en las listas activas. Se conservan sus horas, costes e historial para que las métricas sigan siendo correctas."
        confirmLabel="Cancelar proyecto"
        cancelLabel="Volver"
        busy={archiving}
        busyLabel="Archivando…"
        onConfirm={handleArchive}
        footer={
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setHardOpen(true)}
              className="text-xs text-muted transition-colors hover:text-primary"
            >
              Eliminar definitivamente
            </button>
          </div>
        }
      />

      <ConfirmDialog
        open={hardOpen}
        onOpenChange={(next) => {
          setHardOpen(next);
          if (!next) setTypedName("");
        }}
        title="Eliminar definitivamente"
        description={`Se borrará el proyecto y todos sus datos asociados de forma permanente. Escribe "${projectName}" para confirmar.`}
        confirmLabel="Eliminar"
        destructive
        busy={deleting}
        busyLabel="Eliminando…"
        confirmDisabled={typedName.trim() !== projectName}
        onConfirm={handleHardDelete}
      >
        <Input
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          placeholder={projectName}
          aria-label="Nombre del proyecto"
          autoComplete="off"
        />
      </ConfirmDialog>
    </>
  );
}
