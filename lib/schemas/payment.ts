import { z } from "zod";

export const paymentSchema = z.object({
  project_id: z.string().uuid(),
  seq: z.coerce.number().int().min(1),
  label: z.string().trim().max(120).optional(),
  amount: z.coerce.number().positive().max(9999999999.99),
  due_date: z.iso.date(),
  paid_at: z.iso.date().optional(),
  method: z.string().trim().max(60).optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
