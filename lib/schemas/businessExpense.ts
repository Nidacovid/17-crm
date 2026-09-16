import { z } from "zod";
import { BUSINESS_EXPENSE_CATEGORY_KEYS, EXPENSE_RECURRENCE_KEYS } from "@/lib/constants/categories";

export const businessExpenseCategorySchema = z.enum(BUSINESS_EXPENSE_CATEGORY_KEYS);
export const expenseRecurrenceSchema = z.enum(EXPENSE_RECURRENCE_KEYS);

// Los campos opcionales vacíos del formulario llegan como ""; se normalizan a
// ausente antes de validar para que "sin fecha de fin" no sea un error.
const emptyToUndefined = (value: unknown) =>
  value === null || value === undefined || value === "" ? undefined : value;

export const businessExpenseSchema = z
  .object({
    concept: z.string().trim().min(1).max(160),
    category: businessExpenseCategorySchema.default("otros"),
    amount: z.coerce.number().min(0).max(9999999999.99),
    recurrence: expenseRecurrenceSchema.default("unico"),
    starts_on: z.iso.date(),
    ends_on: z.preprocess(emptyToUndefined, z.iso.date().optional()),
    notes: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(2000).optional(),
    ),
  })
  .refine((e) => e.ends_on === undefined || e.ends_on >= e.starts_on, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["ends_on"],
  });

export type BusinessExpenseInput = z.infer<typeof businessExpenseSchema>;
export type BusinessExpenseFormValues = z.input<typeof businessExpenseSchema>;
export type BusinessExpenseFormResult = z.output<typeof businessExpenseSchema>;
