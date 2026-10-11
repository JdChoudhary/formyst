import { z } from "zod";
import { themeSchema } from "@repo/shared";

export const themeOutputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  origin: z.enum(["new", "duplicate", "auto-branding"]),
  sourceThemeId: z.string().uuid().nullable(),
  config: themeSchema,
  createdBy: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createThemeInputSchema = z.object({
  name: z.string().min(1).max(120),
  origin: z.enum(["new", "duplicate", "auto-branding"]).default("new"),
  sourceThemeId: z.string().uuid().optional(),
  isDefault: z.boolean().optional(),
  config: themeSchema.optional(),
});

export const updateThemeInputSchema = createThemeInputSchema
  .omit({ origin: true, sourceThemeId: true })
  .partial();

export const themeIdInputSchema = z.object({
  id: z.string().uuid(),
});
