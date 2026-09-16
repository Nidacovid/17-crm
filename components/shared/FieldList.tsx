import type { ReactNode } from "react";

export type FieldItem = { label: string; value: ReactNode };

function hasValue(value: ReactNode): boolean {
  return value !== null && value !== undefined && value !== "";
}

// Modo lectura del patrón ver/editar (D-19): pares etiqueta/valor;
// los campos vacíos no se renderizan y no hay ningún input.
export function FieldList({ fields }: { fields: FieldItem[] }) {
  const visible = fields.filter((field) => hasValue(field.value));
  if (visible.length === 0) return null;

  return (
    <dl className="space-y-2.5">
      {visible.map((field) => (
        <div
          key={field.label}
          className="grid grid-cols-1 gap-1 sm:grid-cols-[140px_1fr] sm:gap-3"
        >
          <dt className="text-xs text-secondary">{field.label}</dt>
          <dd className="min-w-0 break-words text-[13px] text-primary">
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}