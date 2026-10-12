import { z } from "zod";
import { formSchema } from "@repo/shared";

export const createFormInputSchema = z.object({
  title: z.string().min(1).max(255),
  publicTitle: z.string().max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  schema: formSchema.optional(),
  themeId: z.string().uuid().nullable().optional(),
  themeUrl: z.string().url().nullable().optional(),
});

export const updateFormInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  themeId: z.string().uuid().nullable().optional(),
  themeUrl: z.string().url().nullable().optional(),
});

export const saveVersionInputSchema = z.object({
  schema: formSchema,
  source: z.enum(["manual", "ai", "import", "restore"]).default("manual"),
  prompt: z.string().max(5000).optional(),
  changeSummary: z.string().max(2000).optional(),
  restoredFromVersionId: z.string().optional(),
});

export type CreateFormInput = z.infer<typeof createFormInputSchema>;
export type UpdateFormInput = z.infer<typeof updateFormInputSchema>;
export type SaveVersionInput = z.infer<typeof saveVersionInputSchema>;
