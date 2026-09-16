"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Panel lateral superpuesto para rutas interceptadas (D-18).
// Cerrar equivale a volver atrás: la URL vuelve a la lista.
export function DetailPanelShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-l border-subtle p-0 sm:w-[min(560px,100vw)] sm:max-w-none"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">
          Detalle de {title}
        </SheetDescription>
        <div className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-2">
          <span className="truncate text-xs text-secondary">{title}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cerrar panel"
            onClick={() => router.back()}
          >
            <X aria-hidden strokeWidth={1.5} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}