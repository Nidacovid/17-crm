import { z } from "zod";
import { PROJECT_STATUS_KEYS } from "@/lib/constants/statuses";
import { PAYMENT_MODE_KEYS } from "@/lib/constants/categories";

export const projectStatusSchema = z.enum(PROJECT_STATUS_KEYS);
export const paymentModeSchema = z.enum(PAYMENT_MODE_KEYS);

// Un campo vacío del formulario llega como ""; sin normalizarlo,
// z.coerce.number() lo convertiría en 0 y dispararía min(1) en los plazos.
const emptyToUndefined = (value: unknown) =>
  value === null || value === undefined || value === "" ? undefined : value;

export const projectSchema = z.object({
  client_id: z.string().uuid({ message: "Selecciona un cliente." }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Escribe el nombre del proyecto." })
    .max(160),
  level: z.coerce.number().int().refine((v) => v === 1 || v === 2, {
    message: "El nivel debe ser 1 o 2.",
  }).default(1),
  status: projectStatusSchema.default("a_empezar"),
  price_net: z.coerce.number().min(0).max(9999999999.99).default(0),
  vat_rate: z.coerce.number().min(0).max(100).default(0),
  estimated_hours: z.coerce.number().min(0).max(9999.99).optional(),
  payment_mode: paymentModeSchema.default("unico"),
  installments: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(60).optional(),
  ),
  down_payment: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(9999999999.99).optional(),
  ),
  started_at: z.iso.date().optional(),
  delivered_at: z.iso.date().optional(),
})
  .refine((v) => v.payment_mode !== "plazos" || Boolean(v.installments), {
    message: "Indica el número de plazos.",
    path: ["installments"],
  })
  .refine(
    (v) =>
      v.payment_mode !== "plazos" ||
      v.down_payment === undefined ||
      v.price_net <= 0 ||
      v.down_payment < v.price_net,
    {
      message: "La entrada debe ser menor que el precio.",
      path: ["down_payment"],
    },
  );

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectFormValues = z.input<typeof projectSchema>;
export type ProjectFormResult = z.output<typeof projectSchema>;
