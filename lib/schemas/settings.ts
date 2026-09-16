import { z } from "zod";

export const settingsSchema = z.object({
  currency: z.string().trim().length(3).default("EUR"),
  timezone: z.string().trim().min(1).default("Europe/Madrid"),
  vat_enabled: z.boolean().default(false),
  vat_default_rate: z.coerce.number().min(0).max(100).default(21),
  target_hourly_rate: z.coerce.number().min(0).max(999999.99).optional(),
  wip_limit: z.coerce.number().int().min(1).max(50).default(3),
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/, {
    message: "La hora debe tener el formato HH:MM.",
  }).default("09:00"),
  reminder_days_before: z.coerce.number().int().min(0).max(60).default(0),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
