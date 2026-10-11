import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { themeService } from "../../services";
import {
  themeOutputSchema,
  createThemeInputSchema,
  updateThemeInputSchema,
  themeIdInputSchema,
} from "./model";

const TAGS = ["Theme"];
const getPath = generatePath("/theme");

function requireUser(ctx: { user?: { id: string } }): asserts ctx is { user: { id: string } } {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
}

export const themeRouter = router({
  getAll: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(z.undefined())
    .output(z.array(themeOutputSchema))
    .query(async ({ ctx }) => {
      requireUser(ctx);
      return (await themeService.getAll(ctx.user.id)) as any;
    }),

  getById: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{id}"), tags: TAGS } })
    .input(themeIdInputSchema)
    .output(themeOutputSchema)
    .query(async ({ input, ctx }) => {
      requireUser(ctx);
      const theme = await themeService.getById(ctx.user.id, input.id);
      if (!theme) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      }
      return theme as any;
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createThemeInputSchema)
    .output(themeOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const theme = await themeService.create(ctx.user.id, ctx.user.id, input);
      if (!theme) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create theme" });
      }
      return theme as any;
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{id}"), tags: TAGS } })
    .input(updateThemeInputSchema.extend({ id: z.string().uuid() }))
    .output(themeOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const { id, ...data } = input;
      const theme = await themeService.update(ctx.user.id, id, data);
      if (!theme) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      }
      return theme as any;
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/{id}"), tags: TAGS } })
    .input(themeIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const deleted = await themeService.delete(ctx.user.id, input.id);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      }
      return { success: true };
    }),

  duplicate: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/duplicate"), tags: TAGS } })
    .input(themeIdInputSchema)
    .output(themeOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const copy = await themeService.duplicate(ctx.user.id, input.id, ctx.user.id);
      if (!copy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      }
      return copy as any;
    }),

  setDefault: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/set-default"), tags: TAGS } })
    .input(themeIdInputSchema)
    .output(themeOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const theme = await themeService.setDefault(ctx.user.id, input.id);
      if (!theme) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      }
      return theme as any;
    }),
});
