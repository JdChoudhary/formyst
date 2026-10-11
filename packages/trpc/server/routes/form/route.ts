import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { formSchema } from "@repo/shared";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { formService, responseService } from "../../services";
import {
  formOutputSchema,
  formVersionOutputSchema,
  formDetailOutputSchema,
  createFormInputSchema,
  updateFormInputSchema,
  formIdInputSchema,
  getFormBySlugInputSchema,
  listFormsInputSchema,
  saveVersionInputSchema,
  restoreVersionInputSchema,
  saveDraftInputSchema,
} from "./model";

const TAGS = ["Form"];
const getPath = generatePath("/form");

function requireUser(ctx: { user?: { id: string } }): asserts ctx is { user: { id: string } } {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
}

export const formRouter = router({
  getAll: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listFormsInputSchema.optional())
    .output(z.array(formOutputSchema))
    .query(async ({ input, ctx }) => {
      requireUser(ctx);
      return formService.getAll(ctx.user.id, {
        folderId: input?.folderId,
        search: input?.search,
        publishedOnly: input?.publishedOnly,
      });
    }),

  getById: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{id}"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(formDetailOutputSchema)
    .query(async ({ input, ctx }) => {
      requireUser(ctx);
      const form = await formService.getByIdWithCurrentVersion(input.id, ctx.user.id);
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return form;
    }),

  getBySlug: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/public/{slug}"), tags: TAGS } })
    .input(getFormBySlugInputSchema)
    .output(formDetailOutputSchema)
    .query(async ({ input }) => {
      const form = await formService.getPublishedDetailBySlug(input.slug);
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return form;
    }),

  getPublishedById: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/public-id/{id}"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(formDetailOutputSchema.nullable())
    .query(async ({ input }) => {
      return formService.getPublishedById(input.id);
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createFormInputSchema)
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const form = await formService.create(ctx.user.id, ctx.user.id, input);
      if (!form) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create form" });
      }
      return form;
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{id}"), tags: TAGS } })
    .input(updateFormInputSchema)
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const updated = await formService.update(input.id, ctx.user.id, input);
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/{id}"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const deleted = await formService.delete(input.id, ctx.user.id);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return { success: true };
    }),

  publish: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/publish"), tags: TAGS } })
    .input(
      z.object({
        id: z.string(),
        schema: formSchema.optional(),
      }),
    )
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const published = await formService.publish(input.id, ctx.user.id, ctx.user.id, input.schema);
      if (!published) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return published;
    }),

  unpublish: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/unpublish"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const unpublished = await formService.unpublish(input.id, ctx.user.id);
      if (!unpublished) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return unpublished;
    }),

  duplicate: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/duplicate"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(formDetailOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const copy = await formService.duplicate(input.id, ctx.user.id, ctx.user.id);
      if (!copy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return copy;
    }),

  versions: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{id}/versions"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(z.array(formVersionOutputSchema))
    .query(async ({ input, ctx }) => {
      requireUser(ctx);
      return formService.getVersions(input.id, ctx.user.id);
    }),

  saveVersion: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/versions"), tags: TAGS } })
    .input(saveVersionInputSchema)
    .output(formVersionOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const version = await formService.saveVersion(input.id, ctx.user.id, ctx.user.id, input);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return version;
    }),

  saveDraft: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/draft"), tags: TAGS } })
    .input(saveDraftInputSchema)
    .output(formVersionOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const version = await formService.saveDraft(input.id, ctx.user.id, ctx.user.id, input.schema);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return version;
    }),

  restoreVersion: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/versions/restore"), tags: TAGS } })
    .input(restoreVersionInputSchema)
    .output(formVersionOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const version = await formService.restoreVersion(
        input.id,
        ctx.user.id,
        input.versionId,
        ctx.user.id,
        input.changeSummary,
      );
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form or version not found" });
      }
      return version;
    }),

  /* -------------------------------------------------------------------- */
  /* API access                                                           */
  /* -------------------------------------------------------------------- */

  /** Create or rotate the form's API key. Plaintext is returned once. */
  generateApiKey: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/api-key"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(z.object({ apiKey: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const result = await formService.generateApiKey(input.id, ctx.user.id);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return result;
    }),

  /** Revoke the API key and disable the API. */
  revokeApiKey: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/{id}/api-key"), tags: TAGS } })
    .input(formIdInputSchema)
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const form = await formService.revokeApiKey(input.id, ctx.user.id);
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return form;
    }),

  /** Enable/disable API submissions without rotating the key. */
  setApiEnabled: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{id}/api-enabled"), tags: TAGS } })
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      requireUser(ctx);
      const form = await formService.setApiEnabled(input.id, ctx.user.id, input.enabled);
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return form;
    }),

  /**
   * External submission endpoint advertised in Settings → API.
   *
   * Authenticates with `Authorization: Bearer <api key>` against the form's
   * stored key hash, then runs the normal submit pipeline so every configured
   * policy (rate limit, duplicate prevention, response limit, profanity
   * filter, bot trap) applies to API submissions too.
   */
  apiSubmit: publicProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/api-submit", tags: TAGS } })
    .input(z.object({ formId: z.string().uuid(), data: z.record(z.string(), z.unknown()) }))
    .output(z.object({ success: z.boolean(), responseId: z.string().nullable() }))
    .mutation(async ({ input, ctx }) => {
      const header = ctx.req.headers.authorization;
      const apiKey = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (!apiKey) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing API key" });
      }

      const valid = await formService.verifyApiKey(input.formId, apiKey);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid API key" });
      }

      const response = await responseService.submit({
        formId: input.formId,
        sessionId: `api_${crypto.randomUUID()}`,
        submissionData: input.data,
      });
      if (!response) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return { success: true, responseId: response.id };
    }),
});
