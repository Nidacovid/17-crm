import { z } from "zod";

export const clientNoteSchema = z.object({
  client_id: z.string().uuid(),
  note_date: z.iso.date(),
  body: z.string().trim().min(1).max(2000),
});

export type ClientNoteInput = z.infer<typeof clientNoteSchema>;
