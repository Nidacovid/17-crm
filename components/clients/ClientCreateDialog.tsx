"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/actions/clients";
import { clientSchema } from "@/lib/schemas/client";
import type {
  ClientFormResult,
  ClientFormValues,
} from "@/lib/schemas/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/ClientForm";

const EMPTY_VALUES: ClientFormValues = {
  business_name: "",
  contact_name: "",
  phone: "",
  email: "",
  business_type: "",
  status: "potencial",
  notes: "",
  informe_url: "",
};

// Botón principal de la pantalla + diálogo de creación con ClientForm.
// `onCreated` y `trigger` permiten reutilizarlo desde el selector de cliente
// del formulario de proyecto ("Crear cliente nuevo").
export function ClientCreateDialog({
  businessTypes,
  onCreated,
  trigger,
}: {
  businessTypes: string[];
  onCreated?: (client: { id: string; business_name: string }) => void;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<ClientFormValues, unknown, ClientFormResult>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function handleCreate(values: ClientFormResult) {
    setSaving(true);
    const result = await createClient(values);
    setSaving(false);

    if (result.ok) {
      toast.success("Contacto creado");
      if (result.id) {
        onCreated?.({ id: result.id, business_name: values.business_name });
      }
      form.reset(EMPTY_VALUES);
      setOpen(false);
      return;
    }

    if (result.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        form.setError(key as Parameters<typeof form.setError>[0], {
          message,
        });
      }
      toast.error("Revisa los campos marcados.");
    } else {
      toast.error(result.error ?? "No se pudo crear el contacto.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(EMPTY_VALUES);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus aria-hidden strokeWidth={1.5} />
            Nuevo contacto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo contacto</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit(handleCreate)(event);
          }}
          noValidate
        >
          <div className="space-y-5">
            <ClientForm form={form} mode="create" businessTypes={businessTypes} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando…" : "Crear contacto"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}