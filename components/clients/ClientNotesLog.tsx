"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addClientNote,
  deleteClientNote,
  updateClientNote,
} from "@/lib/actions/notes";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DateField } from "@/components/shared/DateField";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { ClientNoteRow } from "@/lib/queries/clients";

function todayIso(): string {
  return formatInTimeZone(new Date(), "Europe/Madrid", "yyyy-MM-dd");
}

// Historial de contacto: lista cronológica descendente con compositor
// compacto arriba y edición/borrado por nota desde el menú de tres puntos.
export function ClientNotesLog({
  clientId,
  notes,
}: {
  clientId: string;
  notes: ClientNoteRow[];
}) {
  const [body, setBody] = useState("");
  const [noteDate, setNoteDate] = useState(todayIso);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [toDelete, setToDelete] = useState<ClientNoteRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd() {
    if (!body.trim()) {
      setAddError("Escribe el texto de la nota.");
      return;
    }
    setAdding(true);
    setAddError(null);
    const result = await addClientNote({
      client_id: clientId,
      note_date: noteDate,
      body: body.trim(),
    });
    setAdding(false);
    if (result.ok) {
      setBody("");
      setNoteDate(todayIso());
      toast.success("Nota añadida");
    } else {
      setAddError(
        result.fieldErrors?.body ?? result.error ?? "No se pudo guardar la nota.",
      );
    }
  }

  function startEdit(note: ClientNoteRow) {
    setEditingId(note.id);
    setEditBody(note.body);
    setEditDate(note.note_date);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    if (!editBody.trim()) return;
    setSavingEdit(true);
    const result = await updateClientNote(editingId, {
      note_date: editDate,
      body: editBody.trim(),
    });
    setSavingEdit(false);
    if (result.ok) {
      setEditingId(null);
      toast.success("Nota actualizada");
    } else {
      toast.error(result.error ?? "No se pudo actualizar la nota.");
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const result = await deleteClientNote(toDelete.id);
    setDeleting(false);
    if (result.ok) {
      toast.success("Nota eliminada");
      setToDelete(null);
    } else {
      toast.error(result.error ?? "No se pudo eliminar la nota.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <DateField
          value={noteDate}
          onChange={setNoteDate}
          aria-label="Fecha de la nota"
        />
        <Input
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (addError) setAddError(null);
          }}
          placeholder="Nueva nota de contacto"
          aria-label="Nueva nota de contacto"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAdd();
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleAdd()}
          disabled={adding}
          className="shrink-0"
        >
          {adding ? "Añadiendo…" : "Añadir"}
        </Button>
      </div>
      {addError ? <p className="text-xs text-negative">{addError}</p> : null}

      {notes.length === 0 ? (
        <p className="py-2 text-xs text-muted">
          Todavía no hay notas de contacto. La primera que añadas actualizará
          la fecha de último contacto.
        </p>
      ) : (
        <ul className="divide-y divide-subtle">
          {notes.map((note) =>
            editingId === note.id ? (
              <li key={note.id} className="space-y-2 py-2.5">
                <Textarea
                  value={editBody}
                  onChange={(event) => setEditBody(event.target.value)}
                  rows={3}
                  aria-label="Texto de la nota"
                  className="resize-y"
                />
                <div className="flex items-center justify-between gap-2">
                  <DateField
                    value={editDate}
                    onChange={setEditDate}
                    aria-label="Fecha de la nota"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      disabled={savingEdit}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSaveEdit()}
                      disabled={savingEdit || !editBody.trim()}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </li>
            ) : (
              <li key={note.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="num text-xs text-muted">
                    {formatDate(note.note_date)}
                  </p>
                  <p className="mt-0.5 text-[13px] break-words whitespace-pre-line text-primary">
                    {note.body}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Acciones de la nota"
                    >
                      <MoreHorizontal strokeWidth={1.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEdit(note)}>
                      <Pencil strokeWidth={1.5} />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setToDelete(note)}
                    >
                      <Trash2 strokeWidth={1.5} />
                      Borrar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ),
          )}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Eliminar nota"
        description={
          toDelete
            ? `Se eliminará la nota del ${formatDate(toDelete.note_date)}. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        busy={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}