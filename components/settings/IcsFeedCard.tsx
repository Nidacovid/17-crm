"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { regenerateIcsToken } from "@/lib/actions/settings";

// 10.8 / D-13: feed .ics propio con los vencimientos, suscribible desde
// cualquier cliente de calendario en modo solo lectura.
export function IcsFeedCard({ url }: { url: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Dirección copiada");
    } catch {
      toast.error("No se pudo copiar la dirección.");
    }
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateIcsToken();
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo regenerar el token.");
        return;
      }
      toast.success("Token del feed regenerado");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-lg border border-subtle bg-surface p-5">
      <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        Feed de calendario (.ics)
      </h2>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            value={url}
            readOnly
            aria-label="Dirección del feed .ics"
            className="num text-xs"
            onFocus={(event) => event.target.select()}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCopy()}
          >
            <Copy aria-hidden strokeWidth={1.5} />
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted">
          En la app Calendario de Apple: Archivo → Nueva suscripción de
          calendario, y pega esta dirección.
        </p>
      </div>

      <div className="flex justify-end border-t border-subtle pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted hover:text-negative"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          Regenerar token del feed
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Regenerar token del feed"
        description="La dirección anterior dejará de funcionar y tendrás que volver a suscribirte en tu app de calendario con la nueva dirección."
        confirmLabel="Regenerar token"
        busy={pending}
        busyLabel="Regenerando…"
        onConfirm={() => void handleRegenerate()}
      />
    </section>
  );
}