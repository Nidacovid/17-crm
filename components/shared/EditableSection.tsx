"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";

type EditableSectionProps = {
  /** Bloque de título a la izquierda de la cabecera (nombre, badge…). */
  title?: ReactNode;
  /** Acciones extra junto a Editar en modo lectura. */
  actions?: ReactNode;
  editing: boolean;
  isDirty: boolean;
  isSaving?: boolean;
  onEdit: () => void;
  /** Se invoca tras la confirmación, si hay cambios sin guardar. */
  onCancel: () => void;
  /** Dispara el guardado (el padre lo conecta a su formulario). */
  onSave: () => void;
  children: ReactNode;
  className?: string;
};

// Patrón ver/editar (D-19): lectura por defecto, edición explícita,
// Guardar/Cancelar en cabecera y confirmación al descartar cambios.
export function EditableSection({
  title,
  actions,
  editing,
  isDirty,
  isSaving = false,
  onEdit,
  onCancel,
  onSave,
  children,
  className,
}: EditableSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  function requestCancel() {
    if (isDirty) setConfirmOpen(true);
    else onCancel();
  }

  return (
    <section className={cn("flex flex-col gap-5", className)}>
      <header className="flex items-start justify-between gap-4">
        {title ? <div className="min-w-0 flex-1">{title}</div> : null}
        <div className="flex shrink-0 items-center gap-2">
          {actions && !editing ? actions : null}
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={requestCancel}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil aria-hidden strokeWidth={1.5} />
              Editar
            </Button>
          )}
        </div>
      </header>
      {children}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Descartar cambios"
        description="Hay cambios sin guardar. Si continúas, se perderán."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          onCancel();
        }}
      />
    </section>
  );
}