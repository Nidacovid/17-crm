"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { deleteDocument, upsertProjectDocument } from "@/lib/actions/documents";
import { DOCUMENT_KIND, PROJECT_DOC_ORDER } from "@/lib/constants/statuses";
import { DocumentLinkCard } from "@/components/shared/DocumentLinkCard";
import { EditableSection } from "@/components/shared/EditableSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectDocumentRow } from "@/lib/queries/projects";

type FixedKind = (typeof PROJECT_DOC_ORDER)[number];
type OtherItem = { id?: string; label: string; url: string };
type DocsState = { fixed: Record<FixedKind, string>; others: OtherItem[] };

function buildState(documents: ProjectDocumentRow[]): DocsState {
  const fixed = Object.fromEntries(
    PROJECT_DOC_ORDER.map((kind) => [kind, ""]),
  ) as Record<FixedKind, string>;
  const others: OtherItem[] = [];

  for (const document of documents) {
    if ((PROJECT_DOC_ORDER as readonly string[]).includes(document.kind)) {
      fixed[document.kind as FixedKind] = document.url;
    } else if (document.kind === "otro") {
      others.push({
        id: document.id,
        label: document.label ?? "",
        url: document.url,
      });
    }
  }

  return { fixed, others };
}

// Bloque de documentos de la ficha de proyecto: 5 tipos fijos en el orden
// exigido más los de tipo "Otro". Se edita con su propio Editar/Guardar.
export function ProjectDocuments({
  projectId,
  documents,
}: {
  projectId: string;
  documents: ProjectDocumentRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<DocsState>(() => buildState(documents));
  const [initial, setInitial] = useState<DocsState>(() =>
    buildState(documents),
  );

  useEffect(() => {
    const next = buildState(documents);
    setState(next);
    setInitial(next);
  }, [documents]);

  const isDirty = JSON.stringify(state) !== JSON.stringify(initial);

  function updateFixed(kind: FixedKind, url: string) {
    setState((current) => ({
      ...current,
      fixed: { ...current.fixed, [kind]: url },
    }));
  }

  function updateOther(index: number, patch: Partial<OtherItem>) {
    setState((current) => ({
      ...current,
      others: current.others.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function removeOther(index: number) {
    setState((current) => ({
      ...current,
      others: current.others.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    let failed = false;

    for (const kind of PROJECT_DOC_ORDER) {
      if (state.fixed[kind] === initial.fixed[kind]) continue;
      const result = await upsertProjectDocument({
        project_id: projectId,
        kind,
        url: state.fixed[kind],
      });
      if (!result.ok) failed = true;
    }

    const currentIds = new Set(
      state.others.map((item) => item.id).filter(Boolean),
    );
    for (const item of initial.others) {
      if (item.id && !currentIds.has(item.id)) {
        const result = await deleteDocument(item.id);
        if (!result.ok) failed = true;
      }
    }

    for (const item of state.others) {
      const previous = initial.others.find(
        (other) => other.id && other.id === item.id,
      );
      const changed =
        !previous ||
        previous.label !== item.label ||
        previous.url !== item.url;
      if (!changed) continue;
      if (!item.id && !item.url) continue;

      const result = await upsertProjectDocument({
        id: item.id,
        project_id: projectId,
        kind: "otro",
        label: item.label,
        url: item.url,
      });
      if (!result.ok) failed = true;
    }

    setSaving(false);

    if (failed) {
      toast.error("No se pudieron guardar todos los documentos.");
      return;
    }

    toast.success("Documentos guardados");
    setEditing(false);
    setInitial(state);
    router.refresh();
  }

  function handleCancel() {
    setState(initial);
    setEditing(false);
  }

  const hasVisibleDocuments =
    PROJECT_DOC_ORDER.some((kind) => state.fixed[kind]) ||
    state.others.some((item) => item.url);

  return (
    <EditableSection
      title={
        <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">
          Documentos
        </h3>
      }
      editing={editing}
      isDirty={isDirty}
      isSaving={saving}
      onEdit={() => setEditing(true)}
      onCancel={handleCancel}
      onSave={() => void handleSave()}
    >
      {editing ? (
        <div className="space-y-3">
          {PROJECT_DOC_ORDER.map((kind) => (
            <DocumentLinkCard
              key={kind}
              label={DOCUMENT_KIND[kind]}
              editSlot={
                <Input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="Enlace"
                  value={state.fixed[kind]}
                  onChange={(event) => updateFixed(kind, event.target.value)}
                  aria-label={DOCUMENT_KIND[kind]}
                />
              }
            />
          ))}

          {state.others.map((item, index) => (
            <div
              key={item.id ?? `nuevo-${index}`}
              className="space-y-2.5 rounded-lg border border-subtle bg-surface p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={item.label}
                  onChange={(event) =>
                    updateOther(index, { label: event.target.value })
                  }
                  placeholder="Etiqueta del documento"
                  aria-label="Etiqueta del documento"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar documento"
                  className="text-negative hover:text-negative"
                  onClick={() => removeOther(index)}
                >
                  <Trash2 aria-hidden strokeWidth={1.5} />
                </Button>
              </div>
              <Input
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="Enlace"
                value={item.url}
                onChange={(event) =>
                  updateOther(index, { url: event.target.value })
                }
                aria-label="URL del documento"
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setState((current) => ({
                ...current,
                others: [...current.others, { label: "", url: "" }],
              }))
            }
          >
            <Plus aria-hidden strokeWidth={1.5} />
            Añadir documento
          </Button>
        </div>
      ) : hasVisibleDocuments ? (
        <div className="space-y-3">
          {PROJECT_DOC_ORDER.map((kind) =>
            state.fixed[kind] ? (
              <DocumentLinkCard
                key={kind}
                label={DOCUMENT_KIND[kind]}
                url={state.fixed[kind]}
              />
            ) : null,
          )}
          {state.others
            .filter((item) => item.url)
            .map((item) => (
              <DocumentLinkCard
                key={item.id ?? item.url}
                label={item.label || DOCUMENT_KIND.otro}
                url={item.url}
              />
            ))}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Todavía no hay documentos enlazados. Pulsa Editar para añadir el
          informe, el contrato, el repositorio o cualquier otro enlace.
        </p>
      )}
    </EditableSection>
  );
}
