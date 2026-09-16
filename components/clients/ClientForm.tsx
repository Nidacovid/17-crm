"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Controller, type UseFormReturn } from "react-hook-form";
import {
  DOCUMENT_KIND,
  CLIENT_STATUS,
  CLIENT_STATUS_KEYS,
} from "@/lib/constants/statuses";
import { findClientByPhone } from "@/lib/actions/clients";
import type {
  ClientFormResult,
  ClientFormValues,
} from "@/lib/schemas/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentLinkCard } from "@/components/shared/DocumentLinkCard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ClientFormProps = {
  form: UseFormReturn<ClientFormValues, unknown, ClientFormResult>;
  mode: "create" | "edit";
  businessTypes: string[];
  /** En edición, el propio cliente se excluye del aviso de duplicados. */
  excludeClientId?: string;
  /** Solo lectura, calculado por trigger. */
  lastContactAt?: string | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-negative">{message}</p>;
}

// Formulario de cliente: mismo componente para crear (Dialog) y editar
// (en línea dentro de EditableSection). Validación Zod compartida.
export function ClientForm({
  form,
  mode,
  businessTypes,
  excludeClientId,
  lastContactAt,
}: ClientFormProps) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const phoneValue = watch("phone") ?? "";
  const [duplicate, setDuplicate] = useState<{
    id: string;
    business_name: string;
  } | null>(null);

  useEffect(() => {
    const trimmed = phoneValue.trim();
    if (!trimmed) {
      setDuplicate(null);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await findClientByPhone(trimmed, excludeClientId);
      setDuplicate(result.match);
    }, 300);
    return () => clearTimeout(timer);
  }, [phoneValue, excludeClientId]);

  const typeValue = watch("business_type") ?? "";
  const [typesOpen, setTypesOpen] = useState(false);
  const suggestions = useMemo(() => {
    const term = typeValue.trim().toLowerCase();
    return businessTypes
      .filter((value) => !term || value.toLowerCase().includes(term))
      .filter((value) => value.toLowerCase() !== term)
      .slice(0, 6);
  }, [typeValue, businessTypes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="client-business-name">Negocio</Label>
          <Input
            id="client-business-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.business_name)}
            {...register("business_name")}
          />
          <FieldError message={errors.business_name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-contact-name">Nombre del contacto</Label>
          <Input
            id="client-contact-name"
            autoComplete="off"
            {...register("contact_name")}
          />
          <FieldError message={errors.contact_name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-phone">Teléfono</Label>
          <Input
            id="client-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="600123456"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          {duplicate ? (
            <p className="text-xs text-warning">
              Ya existe el contacto{" "}
              <Link
                href={`/contactos/${duplicate.id}`}
                className="underline underline-offset-2"
              >
                {duplicate.business_name}
              </Link>{" "}
              con este teléfono.
            </p>
          ) : null}
          <FieldError message={errors.phone?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-email">Email</Label>
          <Input
            id="client-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="relative space-y-1.5">
          <Label htmlFor="client-business-type">Tipo de negocio</Label>
          <Input
            id="client-business-type"
            autoComplete="off"
            aria-autocomplete="list"
            {...register("business_type")}
            onFocus={() => setTypesOpen(true)}
            onBlur={() => setTypesOpen(false)}
          />
          {typesOpen && suggestions.length > 0 ? (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-subtle bg-surface-2 py-1">
              {suggestions.map((value) => (
                <li key={value}>
                  <button
                    type="button"
                    // preventDefault evita que el clic cierre la lista antes de aplicar.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setValue("business_type", value, { shouldDirty: true });
                      setTypesOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-[13px] text-secondary transition-colors hover:bg-hover hover:text-primary"
                  >
                    {value}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-status">Estado</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value ?? "potencial"}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="client-status"
                  className="w-full"
                  aria-invalid={Boolean(errors.status)}
                >
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUS_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {CLIENT_STATUS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.status?.message} />
        </div>

        {mode === "edit" ? (
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-xs text-secondary">Último contacto</p>
            <p className="text-[13px] text-secondary">
              {lastContactAt ? formatDate(lastContactAt) : "Sin registros"}
              <span className="ml-1.5 text-[11px] text-muted">
                (se calcula automáticamente)
              </span>
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="client-notes">Notas</Label>
          <Textarea
            id="client-notes"
            rows={4}
            className={cn("resize-y", errors.notes ? "border-destructive" : "")}
            {...register("notes")}
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">
          Informe
        </h3>
        <DocumentLinkCard
          label={DOCUMENT_KIND.informe_cliente}
          editSlot={
            <>
              <Input
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="Enlace de Drive (docs.google.com/…)"
                aria-invalid={Boolean(errors.informe_url)}
                {...register("informe_url")}
              />
              <FieldError message={errors.informe_url?.message} />
            </>
          }
        />
      </div>
    </div>
  );
}