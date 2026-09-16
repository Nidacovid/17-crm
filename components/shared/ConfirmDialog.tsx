"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Contenido extra entre la descripción y los botones (p. ej. un input). */
  children?: ReactNode;
  /** Contenido extra bajo los botones (p. ej. una acción secundaria discreta). */
  footer?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  busyLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
};

// Regla 2.3.18: toda acción destructiva pasa por aquí.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  busy = false,
  busyLabel = "Eliminando…",
  confirmDisabled = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => void onConfirm()}
            disabled={busy || confirmDisabled}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </DialogFooter>
        {footer}
      </DialogContent>
    </Dialog>
  );
}