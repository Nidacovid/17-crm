import { z } from "zod";
import { PHASE_KEYS } from "@/lib/constants/phases";
import { TASK_STATUS_KEYS } from "@/lib/constants/statuses";

export const phaseSchema = z.enum(PHASE_KEYS);
export const taskStatusSchema = z.enum(TASK_STATUS_KEYS);

export const taskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  phase: phaseSchema.nullable().optional(),   // null = tarea personalizada (D-22)
  status: taskStatusSchema.default("todo"),
  position: z.coerce.number(),
  minutes: z.coerce.number().int().min(0).optional().nullable(),
  cost_eur: z.coerce.number().min(0).optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;

// Tarea personalizada (Fase 5.5): solo título y columna de destino.
// `phase = null` y la `position` las fija el servidor.
export const customTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  status: taskStatusSchema.default("todo"),
});

export type CustomTaskInput = z.infer<typeof customTaskSchema>;

// Edición del título de una tarea personalizada (Fase 5.3).
export const taskTitleSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

export type TaskTitleInput = z.infer<typeof taskTitleSchema>;
