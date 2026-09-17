"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { clientSchema } from "@/lib/schemas/client";
import type {
  ClientFormResult,
  ClientFormValues,
} from "@/lib/schemas/client";
import { deleteClient, updateClient } from "@/lib/actions/clients";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DocumentLinkCard } from "@/components/shared/DocumentLinkCard";
import { EditableSection } from "@/components/shared/EditableSection";
import { FieldList, type FieldItem } from "@/components/shared/FieldList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientNotesLog } from "@/components/clients/ClientNotesLog";
import { ClientProjectsList } from "@/components/clients/ClientProjectsList";
import { DOCUMENT_KIND } from "@/lib/constants/statuses";
import { formatDate, formatPhone } from "@/lib/format";
import { normalizeUrl } from "@/lib/utils";
import type { ClientDetailData } from "@/lib/queries/clients";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">
      {children}
    </h3>
  );
}

// Ficha de contacto completa. Único componente compartido por la página
// completa y por el panel lateral interceptado (D-18).
export function ClientDetail({
  client,
  informeUrl,
  projects,
  notes,
  businessTypes,
}: ClientDetailData) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<ClientFormValues, unknown, ClientFormResult>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      business_name: client.business_name,
      contact_name: client.contact_name ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      business_type: client.business_type ?? "",
      status: client.status,
      notes: client.notes ?? "",
      informe_url: informeUrl ?? "",
    },
  });

  async function handleSave(values: ClientFormResult) {
    setSaving(true);
    const result = await updateClient(client.id, values);
    setSaving(false);

    if (result.ok) {
      toast.success("Cambios guardados");
      form.reset({
        ...values,
        informe_url: values.informe_url
          ? normalizeUrl(values.informe_url)
          : "",
      });
      setEditing(false);
      return;
    }

    if (result.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        form.setError(
          key as Parameters<typeof form.setError>[0],
          { message },
        );
      }
      toast.error("Revisa los campos marcados.");
    } else {
      toast.error(result.error ?? "No se pudo guardar el contacto.");
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    form.reset();
  }

  function requestDelete() {
    if (projects.length > 0) {
      toast.error(
        `Este cliente tiene ${projects.length} ${
          projects.length === 1 ? "proyecto asociado" : "proyectos asociados"
        } y no se puede eliminar. Elimina primero sus proyectos.`,
      );
      return;
    }
    setConfirmDelete(true);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteClient(client.id);
    setDeleting(false);
    setConfirmDelete(false);

    if (result.ok) {
      toast.success("Contacto eliminado");
      router.push("/contactos");
    } else {
      toast.error(result.error ?? "No se pudo eliminar el contacto.");
    }
  }

  const fields: FieldItem[] = [
    { label: "Nombre del contacto", value: client.contact_name },
    {
      label: "Teléfono",
      value: client.phone ? formatPhone(client.phone) : null,
    },
    { label: "Email", value: client.email },
    { label: "Tipo de negocio", value: client.business_type },
    { label: "Estado", value: <StatusBadge status={client.status} /> },
    {
      label: "Último contacto",
      value: client.last_contact_at ? formatDate(client.last_contact_at) : null,
    },
    {
      label: "Notas",
      value: client.notes ? (
        <span className="whitespace-pre-line">{client.notes}</span>
      ) : null,
    },
  ];

  return (
    <div className="space-y-8">
      <EditableSection
        editing={editing}
        isDirty={form.formState.isDirty}
        isSaving={saving}
        onEdit={() => setEditing(true)}
        onCancel={handleCancelEdit}
        onSave={() => void form.handleSubmit(handleSave)()}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-negative hover:text-negative"
            onClick={requestDelete}
          >
            <Trash2 aria-hidden strokeWidth={1.5} />
            Eliminar
          </Button>
        }
        title={
          <div className="space-y-1.5">
            <h2 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em] text-primary">
              {client.business_name}
            </h2>
            <StatusBadge status={client.status} />
          </div>
        }
      >
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit(handleSave)(event);
            }}
            noValidate
          >
            <ClientForm
              form={form}
              mode="edit"
              businessTypes={businessTypes}
              excludeClientId={client.id}
              lastContactAt={client.last_contact_at}
            />
          </form>
        ) : (
          <div className="space-y-6">
            <FieldList fields={fields} />
            {informeUrl ? (
              <section className="space-y-2.5">
                <SectionHeading>Informe</SectionHeading>
                <DocumentLinkCard
                  label={DOCUMENT_KIND.informe_cliente}
                  url={informeUrl}
                />
              </section>
            ) : null}
          </div>
        )}
      </EditableSection>

      <section className="space-y-2.5">
        <SectionHeading>Proyectos</SectionHeading>
        <ClientProjectsList projects={projects} />
      </section>

      <section className="space-y-2.5">
        <SectionHeading>Historial de contacto</SectionHeading>
        <ClientNotesLog clientId={client.id} notes={notes} />
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar contacto"
        description="Se eliminará este contacto, su informe y todas sus notas de contacto. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        busy={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}