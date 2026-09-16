import { z } from "zod";
import { DOCUMENT_KIND_KEYS } from "@/lib/constants/statuses";

export const documentKindSchema = z.enum(DOCUMENT_KIND_KEYS);

export const documentSchema = z
  .object({
    client_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    kind: documentKindSchema,
    label: z.string().trim().min(1).max(120).optional(),
    url: z.string().trim().url(),
  })
  .refine((d) => Boolean(d.client_id) !== Boolean(d.project_id), {
    message: "El documento debe pertenecer a un cliente o a un proyecto, pero no a ambos.",
  })
  .refine((d) => d.kind !== "otro" || d.label !== undefined, {
    message: "Los documentos de tipo Otro necesitan una etiqueta.",
    path: ["label"],
  });

export type DocumentInput = z.infer<typeof documentSchema>;
