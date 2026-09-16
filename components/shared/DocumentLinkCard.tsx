"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentLinkCardProps = {
  /** Etiqueta del tipo de documento (se muestra en mayúsculas). */
  label: string;
  url?: string | null;
  /** En modo edición: campo de URL renderizado en lugar del enlace. */
  editSlot?: ReactNode;
  className?: string;
};

// Recuadro con borde de 1 px, tipo arriba en mayúsculas y enlace truncado
// que abre en pestaña nueva. Botón de copiar al pasar el ratón.
export function DocumentLinkCard({
  label,
  url,
  editSlot,
  className,
}: DocumentLinkCardProps) {
  if (editSlot) {
    return (
      <div
        className={cn("rounded-lg border border-subtle bg-surface p-3.5", className)}
      >
        <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
          {label}
        </p>
        <div className="mt-2">{editSlot}</div>
      </div>
    );
  }

  if (!url) return null;

  return (
    <div
      className={cn(
        "group/card rounded-lg border border-subtle bg-surface p-3.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
          {label}
        </p>
        <button
          type="button"
          aria-label="Copiar URL"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("URL copiada");
            } catch {
              toast.error("No se pudo copiar la URL");
            }
          }}
          className="flex size-5 items-center justify-center rounded-sm text-muted transition-opacity hover:text-primary md:opacity-0 md:group-hover/card:opacity-100"
        >
          <Copy aria-hidden className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 flex items-center gap-1.5 text-[13px] text-accent hover:underline"
      >
        <span className="truncate">{url}</span>
        <ExternalLink
          aria-hidden
          className="size-3.5 shrink-0"
          strokeWidth={1.5}
        />
      </a>
    </div>
  );
}