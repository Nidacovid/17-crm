import { z } from "zod";
import { PROJECT_EXPENSE_CATEGORY_KEYS } from "@/lib/constants/categories";

export const projectExpenseCategorySchema = z.enum(PROJECT_EXPENSE_CATEGORY_KEYS);

export const projectExpenseSchema = z.object({
  project_id: z.string().uuid(),
  concept: z.string().trim().min(1).max(160),
  category: projectExpenseCategorySchema.default("otros"),
  amount: z.coerce.number().min(0).max(9999999999.99),
  incurred_on: z.iso.date(),
});

export type ProjectExpenseInput = z.infer<typeof projectExpenseSchema>;
