"use client";

import { useMemo, useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  PROJECT_STATUS,
  PROJECT_STATUS_KEYS,
} from "@/lib/constants/statuses";
import { PAYMENT_MODE, PAYMENT_MODE_KEYS } from "@/lib/constants/categories";
import type {
  ProjectFormResult,
  ProjectFormValues,
} from "@/lib/schemas/project";
import type { ClientOption } from "@/lib/queries/projects";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateField } from "@/components/shared/DateField";
import { ClientCreateDialog } from "@/components/clients/ClientCreateDialog";
import { formatEUR } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProjectFormProps = {
  form: UseFormReturn<ProjectFormValues, unknown, ProjectFormResult>;
  mode: "create" | "edit";
  clients: ClientOption[];
  businessTypes?: string[];
  vatEnabled?: boolean;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-negative">{message}</p>;
}

// Selector de cliente con búsqueda. En creación incluye la opción
// "Crear cliente nuevo", que abre el formulario de cliente (4.2).
function ClientPicker({
  value,
  onChange,
  clients,
  businessTypes,
  allowCreate,
}: {
  value: string;
  onChange: (id: string) => void;
  clients: ClientOption[];
  businessTypes: string[];
  allowCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const selected = clients.find((client) => client.id === value) ?? null;
  const filtered = useMemo(() => {
    const search = term.trim().toLowerCase();
    return search
      ? clients.filter((client) =>
          client.business_name.toLowerCase().includes(search),
        )
      : clients;
  }, [clients, term]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTerm("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          aria-expanded={open}
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted")}>
            {selected ? selected.business_name : "Seleccionar cliente"}
          </span>
          <ChevronsUpDown
            aria-hidden
            className="size-3.5 text-muted"
            strokeWidth={1.5}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0">
        <div className="p-2">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar cliente"
            aria-label="Buscar cliente"
            autoFocus
          />
        </div>
        <ul className="max-h-56 overflow-y-auto pb-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">Sin resultados.</li>
          ) : (
            filtered.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(client.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-secondary transition-colors hover:bg-hover hover:text-primary"
                >
                  <Check
                    aria-hidden
                    className={cn(
                      "size-3.5 shrink-0",
                      value === client.id ? "text-accent" : "opacity-0",
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="truncate">{client.business_name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        {allowCreate ? (
          <div className="border-t border-subtle p-1.5">
            <ClientCreateDialog
              businessTypes={businessTypes}
              onCreated={(client) => {
                onChange(client.id);
                setOpen(false);
              }}
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center px-1.5 py-1.5 text-left text-[13px] text-accent transition-colors hover:underline"
                >
                  Crear cliente nuevo
                </button>
              }
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// Formulario de proyecto: mismo componente para crear (Dialog) y editar
// (en línea dentro de EditableSection). Validación Zod compartida.
export function ProjectForm({
  form,
  mode,
  clients,
  businessTypes = [],
  vatEnabled = false,
}: ProjectFormProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const net = Number(watch("price_net") ?? 0);
  const vatRate = Number(watch("vat_rate") ?? 0);
  const gross = net * (1 + vatRate / 100);
  // Configuración del plan de pagos (6.1): solo en edición de la ficha.
  const paymentMode = watch("payment_mode") ?? "unico";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="project-client">Cliente</Label>
        <Controller
          control={control}
          name="client_id"
          render={({ field }) => (
            <ClientPicker
              value={(field.value as string) ?? ""}
              onChange={field.onChange}
              clients={clients}
              businessTypes={businessTypes}
              allowCreate={mode === "create"}
            />
          )}
        />
        <FieldError message={errors.client_id?.message} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="project-name">Nombre</Label>
        <Input
          id="project-name"
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-level">Nivel</Label>
        <Controller
          control={control}
          name="level"
          render={({ field }) => (
            <Select
              value={String(field.value ?? 1)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <SelectTrigger id="project-level" className="w-full">
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Nivel 1</SelectItem>
                <SelectItem value="2">Nivel 2</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.level?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-status">Estado</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              value={String(field.value ?? "a_empezar")}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="project-status" className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {PROJECT_STATUS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.status?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-price">Precio (sin IVA)</Label>
        <Input
          id="project-price"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          autoComplete="off"
          aria-invalid={Boolean(errors.price_net)}
          {...register("price_net")}
        />
        <FieldError message={errors.price_net?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-estimated-hours">Horas estimadas</Label>
        <Input
          id="project-estimated-hours"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          autoComplete="off"
          placeholder="Opcional"
          aria-invalid={Boolean(errors.estimated_hours)}
          {...register("estimated_hours")}
        />
        <FieldError message={errors.estimated_hours?.message} />
      </div>

      {mode === "edit" ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="project-payment-mode">Pago</Label>
            <Controller
              control={control}
              name="payment_mode"
              render={({ field }) => (
                <Select
                  value={String(field.value ?? "unico")}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="project-payment-mode" className="w-full">
                    <SelectValue placeholder="Modo de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODE_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {PAYMENT_MODE[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.payment_mode?.message} />
          </div>

          {paymentMode === "plazos" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="project-installments">Nº de plazos</Label>
                <Input
                  id="project-installments"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  max="60"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.installments)}
                  {...register("installments")}
                />
                <FieldError message={errors.installments?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-down-payment">Entrada (opcional)</Label>
                <Input
                  id="project-down-payment"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.down_payment)}
                  {...register("down_payment")}
                />
                <FieldError message={errors.down_payment?.message} />
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {vatEnabled ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="project-vat-rate">IVA (%)</Label>
            <Input
              id="project-vat-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              autoComplete="off"
              aria-invalid={Boolean(errors.vat_rate)}
              {...register("vat_rate")}
            />
            <FieldError message={errors.vat_rate?.message} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-secondary">Precio con IVA</p>
            <p className="num text-[13px] text-primary">{formatEUR(gross)}</p>
          </div>
        </>
      ) : null}

      {mode === "edit" ? (
        <>
          <div className="space-y-1.5">
            <Label>Fecha de inicio</Label>
            <Controller
              control={control}
              name="started_at"
              render={({ field }) => (
                <DateField
                  value={(field.value as string | undefined) ?? ""}
                  onChange={(value) => field.onChange(value || undefined)}
                  aria-label="Fecha de inicio"
                  className="w-full justify-start"
                />
              )}
            />
            <FieldError message={errors.started_at?.message} />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de entrega</Label>
            <Controller
              control={control}
              name="delivered_at"
              render={({ field }) => (
                <DateField
                  value={(field.value as string | undefined) ?? ""}
                  onChange={(value) => field.onChange(value || undefined)}
                  aria-label="Fecha de entrega"
                  className="w-full justify-start"
                />
              )}
            />
            <FieldError message={errors.delivered_at?.message} />
          </div>
        </>
      ) : null}
    </div>
  );
}
