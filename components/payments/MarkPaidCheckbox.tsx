"use client";

import { Checkbox } from "@/components/ui/checkbox";

// Casilla de cobrado (6.1). Al marcar, paid_at = hoy; al desmarcar, null.
// La mutación y la actualización optimista viven en PaymentsTable; aquí solo
// el control, deshabilitado mientras la mutación está en curso.
export function MarkPaidCheckbox({
  paid,
  disabled = false,
  onToggle,
}: {
  paid: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={paid}
      disabled={disabled}
      onCheckedChange={(checked) => onToggle(checked === true)}
      aria-label={
        paid ? "Marcar como pendiente de cobro" : "Marcar como cobrado"
      }
    />
  );
}
