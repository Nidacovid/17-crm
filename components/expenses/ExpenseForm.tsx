"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { Plus } from "lucide-react";
import {
  businessExpenseSchema,
  type BusinessExpenseFormResult,
  type BusinessExpenseFormValues,
} from "@/lib/schemas/businessExpense";
import {
  createBusinessExpense,
  updateBusinessExpense,
} from "@/lib/actions/expenses";
import {
  BUSINESS_EXPENSE_CATEGORY,
  BUSINESS_EXPENSE_CATEGORY_KEYS,
  EXPENSE_RECURRENCE,
  EXPENSE_RECURRENCE_KEYS,
} from "@/lib/constants/categories";
import { APP_TIMEZONE } from "@/lib/dates";
import { DateField } from "@/components/shared/DateField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BusinessExpenseRow } from "@/lib/queries/expenses";

function todayISO(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
}

function emptyValues(): BusinessExpenseFormValues {
  return {
    concept: "",
    category: "otros",
    amount: undefined,
    recurrence: "unico",
    starts_on: todayISO(),
    ends_on: undefined,
    notes: undefined,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-negative">{message}</p>;
}

// Formulario de gasto general del negocio (7.2): alta y edición dentro de un
// diálogo. Se usa desde la cabecera de /gastos y desde la tabla.
export function ExpenseForm({
  expense,
  trigger,
  open,
  onOpenChange,
}: {
  expense?: BusinessExpenseRow;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialogOpen = controlled ? Boolean(open) : internalOpen;

  const form = useForm<
    BusinessExpenseFormValues,
    unknown,
    BusinessExpenseFormResult
  >({
    resolver: zodResolver(businessExpenseSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (expense) {
      form.reset({
        concept: expense.concept,
        category: expense.category,
        amount: expense.amount,
        recurrence: expense.recurrence,
        starts_on: expense.starts_on,
        ends_on: expense.ends_on ?? undefined,
        notes: expense.notes ?? undefined,
      });
    } else {
      form.reset(emptyValues());
    }
  }, [dialogOpen, expense, form]);

  function setDialogOpen(next: boolean) {
    if (controlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  async function handleSubmit(values: BusinessExpenseFormResult) {
    setSaving(true);
    const result = expense
      ? await updateBusinessExpense(expense.id, values)
      : await createBusinessExpense(values);
    setSaving(false);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          form.setError(key as Parameters<typeof form.setError>[0], {
            message,
          });
        }
        toast.error("Revisa los campos marcados.");
      } else {
        toast.error(result.error ?? "No se pudo guardar el gasto.");
      }
      return;
    }

    toast.success(expense ? "Gasto actualizado" : "Gasto añadido");
    form.reset(emptyValues());
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        setDialogOpen(next);
        if (!next) form.reset(emptyValues());
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Editar gasto" : "Añadir gasto"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit(handleSubmit)(event);
          }}
          noValidate
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-concept">Concepto</Label>
              <Input
                id="expense-concept"
                autoComplete="off"
                aria-invalid={Boolean(form.formState.errors.concept)}
                {...form.register("concept")}
              />
              <FieldError message={form.formState.errors.concept?.message} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expense-category">Categoría</Label>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      value={String(field.value ?? "otros")}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="expense-category" className="w-full">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_EXPENSE_CATEGORY_KEYS.map((key) => (
                          <SelectItem key={key} value={key}>
                            {BUSINESS_EXPENSE_CATEGORY[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.category?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-amount">Importe</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  autoComplete="off"
                  aria-invalid={Boolean(form.formState.errors.amount)}
                  {...form.register("amount")}
                />
                <FieldError message={form.formState.errors.amount?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-recurrence">Recurrencia</Label>
                <Controller
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <Select
                      value={String(field.value ?? "unico")}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="expense-recurrence" className="w-full">
                        <SelectValue placeholder="Recurrencia" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_RECURRENCE_KEYS.map((key) => (
                          <SelectItem key={key} value={key}>
                            {EXPENSE_RECURRENCE[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError
                  message={form.formState.errors.recurrence?.message}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fecha de inicio</Label>
                <Controller
                  control={form.control}
                  name="starts_on"
                  render={({ field }) => (
                    <DateField
                      value={(field.value as string | undefined) ?? ""}
                      onChange={field.onChange}
                      aria-label="Fecha de inicio"
                      className="w-full justify-start"
                    />
                  )}
                />
                <FieldError message={form.formState.errors.starts_on?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Fecha de fin (opcional)</Label>
                <Controller
                  control={form.control}
                  name="ends_on"
                  render={({ field }) => (
                    <DateField
                      value={(field.value as string | undefined) ?? ""}
                      onChange={(value) => field.onChange(value || undefined)}
                      placeholder="Sin fecha de fin"
                      aria-label="Fecha de fin"
                      className="w-full justify-start"
                    />
                  )}
                />
                <FieldError message={form.formState.errors.ends_on?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-notes">Notas</Label>
              <Textarea
                id="expense-notes"
                rows={3}
                autoComplete="off"
                {...form.register("notes")}
              />
              <FieldError message={form.formState.errors.notes?.message} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Guardando…"
                  : expense
                    ? "Guardar cambios"
                    : "Añadir gasto"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Botón de cabecera reutilizable (mismo patrón que ClientCreateDialog):
// el PageHeader no puede montar estado de cliente por sí solo.
export function AddBusinessExpenseButton() {
  return (
    <ExpenseForm
      trigger={
        <Button>
          <Plus aria-hidden strokeWidth={1.5} />
          Añadir gasto
        </Button>
      }
    />
  );
}
