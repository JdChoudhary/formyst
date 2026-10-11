import { z } from "zod";
import { themeSchema } from "@repo/shared";

/** Create input — accepts the full renderer config. */
export const createThemeInputSchema = z
  .object({
    name: z.string().min(1).max(120),
    origin: z.enum(["new", "duplicate", "auto-branding"]).default("new"),
    sourceThemeId: z.string().uuid().optional(),
    isDefault: z.boolean().optional(),
    config: themeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.origin === "duplicate" && !data.sourceThemeId) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceThemeId"],
        message: "sourceThemeId is required when origin is duplicate",
      });
    }
  });

export const updateThemeInputSchema = createThemeInputSchema
  .omit({ origin: true, sourceThemeId: true })
  .partial();

export const themeIdInputSchema = z.object({
  id: z.string().uuid(),
});

export type CreateThemeInput = z.infer<typeof createThemeInputSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeInputSchema>;
