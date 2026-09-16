"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import { APP_TIMEZONE } from "@/lib/dates";
import {
  createProjectExpense,
  deleteProjectExpense,
  updateProjectExpense,
} from "@/lib/actions/expenses";
import {
  PROJECT_EXPENSE_CATEGORY,
  PROJECT_EXPENSE_CATEGORY_KEYS,
} from "@/lib/constants/categories";
import { EditableSection } from "@/components/shared/EditableSection";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DateField } from "@/components/shared/DateField";
import { MoneyText } from "@/components/shared/MoneyText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatEUR } from "@/lib/format";
import type {
  ProjectExpenseCategory,
  ProjectExpenseRow,
} from "@/lib/queries/expenses";

type DraftExpense = {
  id?: string;
  concept: string;
  category: ProjectExpenseCategory;
  amount: string;
  incurred_on: string;
};

function buildState(expenses: ProjectExpenseRow[]): DraftExpense[] {
  return expenses.map((expense) => ({
    id: expense.id,
    concept: expense.concept,
    category: expense.category,
    amount: String(expense.amount),
    incurred_on: expense.incurred_on,
  }));
}

function serialize(rows: DraftExpense[]): string {
  return rows
    .map(
      (row) =>
        `${row.id ?? ""}|${row.concept}|${row.category}|${row.amount}|${row.incurred_on}`,
    )
    .join("\n");
}

// Bloque "Gastos extra" de la ficha de proyecto (7.1, D-05): por debajo son
// filas, pero visualmente se percibe como la celda única de gastos extra
// (total destacado a la derecha). Se edita con su propio Editar/Guardar.
export function ProjectExpensesBlock({
  projectId,
  expenses,
  totals,
}: {
  projectId: string;
  expenses: ProjectExpenseRow[];
  totals: { cost_tokens: number; cost_extra: number; cost_total: number };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<DraftExpense[]>(() =>
    buildState(expenses),
  );
  const [initial, setInitial] = useState<DraftExpense[]>(() =>
    buildState(expenses),
  );
  const [deleteTarget, setDeleteTarget] = useState<ProjectExpenseRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const next = buildState(expenses);
    setState(next);
    setInitial(next);
  }, [expenses]);

  const isDirty = serialize(state) !== serialize(initial);

  const draftTotal = useMemo(
    () =>
      state.reduce((sum, row) => {
        const amount = Number(row.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [state],
  );

  function updateRow(index: number, patch: Partial<DraftExpense>) {
    setState((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(index: number) {
    setState((current) => current.filter((_, i) => i !== index));
  }

  async function handleSave() {
    // Las filas nuevas totalmente vacías se descartan (no hay nada que guardar).
    const rowsToSave = state.filter(
      (row) => row.id || row.concept.trim() || row.amount !== "",
    );
    const invalid = rowsToSave.some(
      (row) =>
        !row.concept.trim() ||
        !Number.isFinite(Number(row.amount)) ||
        Number(row.amount) < 0 ||
        !row.incurred_on,
    );
    if (invalid) {
      toast.error("Revisa el concepto, el importe y la fecha de cada gasto.");
      return;
    }

    setSaving(true);
    let failed = false;

    const stateIds = new Set(state.map((row) => row.id).filter(Boolean));
    for (const row of initial) {
      if (row.id && !stateIds.has(row.id)) {
        const result = await deleteProjectExpense(row.id);
        if (!result.ok) failed = true;
      }
    }

    for (const row of rowsToSave) {
      const payload = {
        concept: row.concept.trim(),
        category: row.category,
        amount: Number(row.amount),
        incurred_on: row.incurred_on,
      };
      if (row.id) {
        const previous = initial.find((item) => item.id === row.id);
        const changed =
          !previous ||
          previous.concept !== row.concept ||
          previous.category !== row.category ||
          previous.amount !== row.amount ||
          previous.incurred_on !== row.incurred_on;
        if (changed) {
          const result = await updateProjectExpense(row.id, payload);
          if (!result.ok) failed = true;
        }
      } else {
        const result = await createProjectExpense({
          project_id: projectId,
          ...payload,
        });
        if (!result.ok) failed = true;
      }
    }

    setSaving(false);

    if (failed) {
      toast.error("No se pudieron guardar todos los gastos.");
      return;
    }

    toast.success("Gastos guardados");
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setState(initial);
    setEditing(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteProjectExpense(deleteTarget.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo eliminar el gasto.");
      return;
    }
    toast.success("Gasto eliminado");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <EditableSection
      title={
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">
            Gastos extra
          </h3>
          <MoneyText
            value={draftTotal}
            className="text-[16px] font-medium text-primary"
          />
        </div>
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
          {state.map((row, index) => (
            <div
              key={row.id ?? `nuevo-${index}`}
              className="space-y-2.5 rounded-lg border border-subtle bg-surface p-3.5"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={row.concept}
                  onChange={(event) =>
                    updateRow(index, { concept: event.target.value })
                  }
                  placeholder="Concepto"
                  aria-label="Concepto"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar gasto"
                  className="text-negative hover:text-negative"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 aria-hidden strokeWidth={1.5} />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <Select
                  value={row.category}
                  onValueChange={(value) =>
                    updateRow(index, {
                      category: value as ProjectExpenseCategory,
                    })
                  }
                >
                  <SelectTrigger className="w-full" aria-label="Categoría">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_EXPENSE_CATEGORY_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {PROJECT_EXPENSE_CATEGORY[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={row.amount}
                  onChange={(event) =>
                    updateRow(index, { amount: event.target.value })
                  }
                  placeholder="Importe"
                  aria-label="Importe"
                />
                <DateField
                  value={row.incurred_on}
                  onChange={(value) => updateRow(index, { incurred_on: value })}
                  aria-label="Fecha"
                  className="w-full justify-start"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setState((current) => [
                ...current,
                {
                  concept: "",
                  category: "otros",
                  amount: "",
                  incurred_on: formatInTimeZone(
                    new Date(),
                    APP_TIMEZONE,
                    "yyyy-MM-dd",
                  ),
                },
              ])
            }
          >
            <Plus aria-hidden strokeWidth={1.5} />
            Añadir gasto
          </Button>
        </div>
      ) : state.length === 0 ? (
        <p className="text-xs text-muted">Sin gastos extra registrados.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-subtle bg-surface">
          <ul>
            {state.map((row, index) => (
              <li
                key={row.id ?? index}
                className="flex items-center gap-3 border-b border-subtle px-3.5 py-2.5 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] text-primary">
                  {row.concept}
                </span>
                <span className="hidden shrink-0 text-xs text-secondary sm:block">
                  {PROJECT_EXPENSE_CATEGORY[row.category]}
                </span>
                <MoneyText
                  value={Number(row.amount)}
                  className="shrink-0 text-[13px]"
                />
                <span className="num shrink-0 text-xs text-secondary">
                  {formatDate(row.incurred_on)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Acciones del gasto ${row.concept}`}
                    >
                      <MoreVertical aria-hidden strokeWidth={1.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      Editar
                    </DropdownMenuItem>
                    {row.id ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          setDeleteTarget(
                            expenses.find((item) => item.id === row.id) ??
                              null,
                          )
                        }
                      >
                        Borrar
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="num text-xs text-muted">
        Tokens de IA: {formatEUR(totals.cost_tokens)} · Gastos extra:{" "}
        {formatEUR(totals.cost_extra)} · Total: {formatEUR(totals.cost_total)}
      </p>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar gasto extra"
        description={`Se eliminará «${deleteTarget?.concept ?? "este gasto"}» de ${formatEUR(
          deleteTarget?.amount ?? 0,
        )}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar gasto"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </EditableSection>
  );
}
