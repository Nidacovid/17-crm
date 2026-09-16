import { z } from "zod";

// Un valor vacío llega como `""` desde el formulario y como `null` desde un
// payload ya transformado (la acción revalida lo que el diálogo ya validó).
// Se normaliza a "ausente" para que el parseo sea idempotente: sin esto,
// `z.coerce.number()` convertiría `null` en `0` y un coste vacío dispararía
// la comprobación D-04 en las fases sin coste.
const emptyToUndefined = (value: unknown) =>
  value === null || value === undefined || value === "" ? undefined : value;

// Diálogo de finalización de tarea (Fase 5): horas y minutos por separado,
// que se combinan en tasks.minutes. Ambos campos pueden ir vacíos (D-02).
export const taskCompletionSchema = z
  .object({
    hours: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).optional(),
    ),
    minutes: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).optional(),
    ),
    cost_eur: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0).max(999999.99).optional(),
    ),
  })
  .transform((v) => ({
    minutes:
      v.hours === undefined && v.minutes === undefined
        ? null
        : (v.hours ?? 0) * 60 + (v.minutes ?? 0),
    cost_eur: v.cost_eur ?? null,
  }));

export type TaskCompletionInput = z.input<typeof taskCompletionSchema>;
export type TaskCompletionParsed = z.output<typeof taskCompletionSchema>;
