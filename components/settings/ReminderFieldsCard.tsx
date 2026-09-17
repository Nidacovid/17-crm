"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateReminderSettings } from "@/lib/actions/settings";

// 10.8: hora del aviso y días de antelación de los eventos de cobro.
export function ReminderFieldsCard({
  reminderTime,
  reminderDaysBefore,
}: {
  reminderTime: string;
  reminderDaysBefore: number;
}) {
  const router = useRouter();
  const [time, setTime] = useState(reminderTime);
  const [days, setDays] = useState(String(reminderDaysBefore));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateReminderSettings({
        reminder_time: time,
        reminder_days_before: days,
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "No se pudo guardar el aviso.");
        return;
      }
      toast.success("Aviso de cobro guardado");
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-lg border border-subtle bg-surface p-5">
      <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        Aviso de cobros
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reminder-time">Hora del aviso</Label>
          <Input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-invalid={fieldErrors.reminder_time !== undefined}
            className="num"
          />
          {fieldErrors.reminder_time ? (
            <p className="text-xs text-negative">{fieldErrors.reminder_time}</p>
          ) : (
            <p className="text-xs text-muted">
              Salta a esa hora el día del vencimiento.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reminder-days">Días de antelación</Label>
          <Input
            id="reminder-days"
            type="number"
            min={0}
            max={60}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            aria-invalid={fieldErrors.reminder_days_before !== undefined}
            className="num"
          />
          {fieldErrors.reminder_days_before ? (
            <p className="text-xs text-negative">
              {fieldErrors.reminder_days_before}
            </p>
          ) : (
            <p className="text-xs text-muted">
              Adelanta el evento esos días antes del vencimiento.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={pending || !time}
        >
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </section>
  );
}