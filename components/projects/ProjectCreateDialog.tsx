"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createProject } from "@/lib/actions/projects";
import { projectSchema } from "@/lib/schemas/project";
import type {
  ProjectFormResult,
  ProjectFormValues,
} from "@/lib/schemas/project";
import type { ClientOption } from "@/lib/queries/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/ProjectForm";

const EMPTY_VALUES: ProjectFormValues = {
  client_id: "",
  name: "",
  level: 1,
  status: "a_empezar",
  price_net: 0,
  vat_rate: 0,
  estimated_hours: undefined,
};

// Botón principal de la lista + diálogo de creación. Mínimo obligatorio:
// cliente y nombre; el resto es opcional (4.2).
export function ProjectCreateDialog({
  clients,
  businessTypes,
}: {
  clients: ClientOption[];
  businessTypes: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(
    null,
  );

  const form = useForm<ProjectFormValues, unknown, ProjectFormResult>({
    resolver: zodResolver(projectSchema),
    defaultValues: EMPTY_VALUES,
  });

  function closeDialog() {
    setOpen(false);
    setCreated(null);
    form.reset(EMPTY_VALUES);
  }

  async function handleCreate(values: ProjectFormResult) {
    setSaving(true);
    const result = await createProject(values);
    setSaving(false);

    if (result.ok) {
      toast.success("Proyecto creado");
      if (result.id && result.code) {
        setCreated({ id: result.id, code: result.code });
      }
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
      toast.error(result.error ?? "No se pudo crear el proyecto.");
    }
  }

  function goTo(tasks: boolean) {
    const id = created?.id;
    closeDialog();
    if (id) router.push(tasks ? `/proyectos/${id}/tareas` : `/proyectos/${id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
        } else {
          closeDialog();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden strokeWidth={1.5} />
          Generar Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {created ? (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Proyecto creado</DialogTitle>
              <DialogDescription>
                {created.code} está listo, con sus 9 tareas generadas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => goTo(false)}
              >
                Ver proyecto
              </Button>
              <Button type="button" onClick={() => goTo(true)}>
                Ir a Tareas
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Generar Proyecto</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit(handleCreate)(event);
              }}
              noValidate
            >
              <div className="space-y-5">
                <ProjectForm
                  form={form}
                  mode="create"
                  clients={clients}
                  businessTypes={businessTypes}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creando…" : "Crear proyecto"}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
