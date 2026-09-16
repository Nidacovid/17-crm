import { z } from "zod";
import { CLIENT_STATUS_KEYS } from "@/lib/constants/statuses";
import { normalizeUrl } from "@/lib/utils";

export const clientStatusSchema = z.enum(CLIENT_STATUS_KEYS);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const clientSchema = z.object({
  business_name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  business_type: z.string().trim().max(80).optional(),
  status: clientStatusSchema.default("potencial"),
  notes: z.string().trim().max(2000).optional(),
  // URL del informe de Drive: se guarda en documents.kind = 'informe_cliente'.
  // Acepta direcciones sin esquema; se normaliza con https:// al guardar (regla 2.2.10).
  informe_url: z
    .string()
    .trim()
    .refine((v) => v === "" || isHttpUrl(normalizeUrl(v)), {
      message: "Introduce una URL válida.",
    })
    .optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientFormValues = z.input<typeof clientSchema>;
export type ClientFormResult = z.output<typeof clientSchema>;