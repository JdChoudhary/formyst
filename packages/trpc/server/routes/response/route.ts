import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { responseService, formService } from "../../services";
import {
  saveDraftInputSchema,
  submitResponseInputSchema,
  getDraftInputSchema,
  listResponsesInputSchema,
  startResponseInputSchema,
  stageResponseInputSchema,
  completeResponseInputSchema,
  getResponseInputSchema,
  createWebhookInputSchema,
  deleteWebhookInputSchema,
  listWebhooksInputSchema,
  SubmissionValidationError,
} from "@repo/services/response";
import {
  draftOutputSchema,
  submitOutputSchema,
  listResponsesOutputSchema,
  responseRowOutputSchema,
  responseEventOutputSchema,
  responseAnswerOutputSchema,
  webhookOutputSchema,
} from "./model";

const TAGS = ["Form Response"];
const WEBHOOK_TAGS = ["Form Webhook"];
const getPath = generatePath("/forms");

/**
 * Field-validation failures reach the client as HTTP 400
 * { message, code, issues: [{ path, message }] } — trpc-to-openapi reads
 * `cause.issues` when the cause is an Error named "ZodError".
 *
 * zod 4.4.3's `ZodError` is not `instanceof Error` in this build (its
 * prototype chain is `ZodError -> Object`), so passing one directly makes
 * tRPC wrap it in an `UnknownCauseError` that drops `issues` — field errors
 * would never reach the renderer. Use a real Error carrying the issues.
 */
function fieldValidationError(errors: Record<string, string>): TRPCError {
  const issues = Object.entries(errors).map(([fieldId, message]) => ({
    code: "custom" as const,
    path: [fieldId],
    message,
  }));
  const cause = new Error("Submission failed validation");
  cause.name = "ZodError";
  (cause as unknown as { issues: typeof issues }).issues = issues;
  return new TRPCError({
    code: "BAD_REQUEST",
    message: "Submission failed validation",
    cause,
  });
}

/**
 * Express hands us `IncomingHttpHeaders` (values may be `undefined`, and
 * repeated headers arrive as `string[]`). The submission service only needs a
 * flat `Record<string, string>` — it reads `cookie` for the password gate — so
 * normalise the shape at the boundary.
 */
function toHeaderRecord(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      record[key] = value;
    } else if (Array.isArray(value)) {
      record[key] = value.join(", ");
    }
  }
  return record;
}

export const responseRouter = router({
  /**
   * Autosave / manual-save of an in-progress response.
   * Public — no auth required, keyed by (formId, sessionId).
   */
  saveDraft: publicProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/{formId}/draft"), tags: TAGS } })
    .input(saveDraftInputSchema)
    .output(draftOutputSchema)
    .mutation(async ({ input }) => {
      const row = await responseService.saveDraft(input);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return { ...row, events: [] };
    }),

  /**
   * Final submission. Public — creates the submitted response + answers.
   */
  submit: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{formId}/submit"), tags: TAGS } })
    .input(submitResponseInputSchema)
    .output(submitOutputSchema)
    .mutation(async ({ input, ctx }) => {
      let row;
      try {
        row = await responseService.submit({
          ...input,
          httpHeaders: toHeaderRecord(ctx.req.headers),
        });
      } catch (error) {
        if (error instanceof SubmissionValidationError) {
          // Serialized by trpc-to-openapi as HTTP 400 with
          // { message, code, issues: [{ path: [fieldId], message }] }.
          throw fieldValidationError(error.errors);
        }
        throw error;
      }
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return { success: true, responseId: row.id, status: row.status };
    }),

  /**
   * Resume an in-progress draft for a returning session. Public.
   */
  getDraft: publicProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{formId}/draft/{sessionId}"), tags: TAGS },
    })
    .input(getDraftInputSchema)
    .output(draftOutputSchema.nullable())
    .query(async ({ input }) => {
      return responseService.getBySession(input.formId, input.sessionId);
    }),

  /**
   * All responses + answers + events for analytics. Owner only.
   */
  getAll: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{formId}/responses"), tags: TAGS } })
    .input(listResponsesInputSchema)
    .output(listResponsesOutputSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!ctx.user || !userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const owned = await formService.getById(input.formId, userId);
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return responseService.getAll(input.formId);
    }),

  // ---- New Typeform-style endpoints ----

  /**
   * POST /forms/:id/responses — Start a new response session.
   * Public — creates a draft response row with a public submissionId.
   */
  startResponse: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{formId}/responses"), tags: TAGS } })
    .input(startResponseInputSchema)
    .output(responseRowOutputSchema)
    .mutation(async ({ input }) => {
      const row = await responseService.startResponse(input);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return row;
    }),

  /**
   * PATCH /forms/:id/responses/:submissionId — Autosave / stage answers.
   * Public — keyed by (formId, submissionId, sessionId).
   */
  stageResponse: publicProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/{formId}/responses/{submissionId}"),
        tags: TAGS,
      },
    })
    .input(stageResponseInputSchema)
    .output(responseRowOutputSchema)
    .mutation(async ({ input }) => {
      const row = await responseService.stageResponse(input);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Response not found" });
      }
      return row;
    }),

  /**
   * POST /forms/:id/responses/:submissionId/complete — Final submission.
   * Public — validates and marks the response as submitted.
   */
  completeResponse: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{formId}/responses/{submissionId}/complete"),
        tags: TAGS,
      },
    })
    .input(completeResponseInputSchema)
    .output(submitOutputSchema)
    .mutation(async ({ input, ctx }) => {
      let row;
      try {
        row = await responseService.completeResponse({
          ...input,
          httpHeaders: toHeaderRecord(ctx.req.headers),
        });
      } catch (error) {
        if (error instanceof SubmissionValidationError) {
          throw fieldValidationError(error.errors);
        }
        throw error;
      }
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Response not found" });
      }
      return { success: true, responseId: row.id, status: row.status };
    }),

  /**
   * GET /forms/:id/responses/:submissionId — Resume or view a response.
   * Public — keyed by (formId, submissionId, sessionId).
   */
  getResponse: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/{formId}/responses/{submissionId}"),
        tags: TAGS,
      },
    })
    .input(getResponseInputSchema)
    .output(
      responseRowOutputSchema.extend({ answers: z.array(responseAnswerOutputSchema) }).nullable(),
    )
    .query(async ({ input }) => {
      return responseService.getResponse(input);
    }),

  // ---- Webhooks ----

  /**
   * POST /forms/:id/webhooks — Register a webhook. Owner only.
   */
  createWebhook: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{formId}/webhooks"), tags: WEBHOOK_TAGS } })
    .input(createWebhookInputSchema)
    .output(webhookOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!ctx.user || !userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const owned = await formService.getById(input.formId, userId);
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      const row = await responseService.createWebhook(input);
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create webhook" });
      }
      return row;
    }),

  /**
   * DELETE /forms/:id/webhooks/:webhookId — Remove a webhook. Owner only.
   */
  deleteWebhook: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{formId}/webhooks/{webhookId}"),
        tags: WEBHOOK_TAGS,
      },
    })
    .input(deleteWebhookInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!ctx.user || !userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const owned = await formService.getById(input.formId, userId);
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      const deleted = await responseService.deleteWebhook(input);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
      }
      return { success: true };
    }),

  /**
   * GET /forms/:id/webhooks — List webhooks. Owner only.
   */
  listWebhooks: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{formId}/webhooks"), tags: WEBHOOK_TAGS } })
    .input(listWebhooksInputSchema)
    .output(z.array(webhookOutputSchema))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!ctx.user || !userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const owned = await formService.getById(input.formId, userId);
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return responseService.listWebhooks(input);
    }),
});
