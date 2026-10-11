import { z } from "zod";

export const fieldEventInputSchema = z.object({
  fieldId: z.string().nullable().optional(),
  eventType: z.enum(["view", "focus", "blur", "change", "step"]),
  value: z.unknown().optional(),
  timeSpentMs: z.number().int().nonnegative().optional(),
});
export type FieldEventInput = z.infer<typeof fieldEventInputSchema>;

const MAX_DATA_BYTES = 100_000;

const dataRecordSchema = z
  .record(z.string(), z.unknown())
  .refine((data) => {
    try {
      return JSON.stringify(data).length <= MAX_DATA_BYTES;
    } catch {
      return false;
    }
  }, "Payload too large (max 100KB)");

// ---- Legacy endpoints (kept for backward compatibility) ----

export const saveDraftInputSchema = z.object({
  formId: z.string().uuid(),
  sessionId: z.string().min(1).max(200),
  formData: dataRecordSchema,
  currentStep: z.number().int().nonnegative().default(0),
  lastFieldId: z.string().nullable().optional(),
  lastStepReached: z.number().int().nonnegative().optional(),
  events: z.array(fieldEventInputSchema).max(1000).optional(),
});
export type SaveDraftInput = z.infer<typeof saveDraftInputSchema>;

export const submitResponseInputSchema = z.object({
  formId: z.string().uuid(),
  sessionId: z.string().min(1).max(200),
  submissionData: dataRecordSchema,
  lastFieldId: z.string().nullable().optional(),
  lastStepReached: z.number().int().nonnegative().optional(),
  events: z.array(fieldEventInputSchema).max(1000).optional(),
  /** HTTP headers from the originating request, used for server-side policy checks
   * (password cookie, bot-detection headers). Not stored with the response. */
  httpHeaders: z.record(z.string(), z.string()).optional(),
});
export type SubmitResponseInput = z.infer<typeof submitResponseInputSchema>;

export const getDraftInputSchema = z.object({
  formId: z.string().uuid(),
  sessionId: z.string().min(1).max(200),
});
export type GetDraftInput = z.infer<typeof getDraftInputSchema>;

export const listResponsesInputSchema = z.object({
  formId: z.string().uuid(),
});
export type ListResponsesInput = z.infer<typeof listResponsesInputSchema>;

// ---- New Typeform-style endpoints ----

/** POST /forms/:id/responses — Start a new response session */
export const startResponseInputSchema = z.object({
  formId: z.string().uuid(),
  sessionId: z.string().min(1).max(200),
  landedAt: z.string().datetime().optional(),
  metadata: z
    .object({
      referrer: z.string().max(2000).optional(),
      utmSource: z.string().max(200).optional(),
      utmMedium: z.string().max(200).optional(),
      utmCampaign: z.string().max(200).optional(),
      utmTerm: z.string().max(200).optional(),
      utmContent: z.string().max(200).optional(),
    })
    .optional(),
});
export type StartResponseInput = z.infer<typeof startResponseInputSchema>;

/** PATCH /forms/:id/responses/:submissionId — Autosave / stage answers */
export const stageResponseInputSchema = z.object({
  formId: z.string().uuid(),
  submissionId: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(200),
  formData: dataRecordSchema,
  currentStep: z.number().int().nonnegative().default(0),
  lastFieldId: z.string().nullable().optional(),
  lastStepReached: z.number().int().nonnegative().optional(),
  events: z.array(fieldEventInputSchema).max(1000).optional(),
});
export type StageResponseInput = z.infer<typeof stageResponseInputSchema>;

/** POST /forms/:id/responses/:submissionId/complete — Final submission */
export const completeResponseInputSchema = z.object({
  formId: z.string().uuid(),
  submissionId: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(200),
  submissionData: dataRecordSchema,
  lastFieldId: z.string().nullable().optional(),
  lastStepReached: z.number().int().nonnegative().optional(),
  events: z.array(fieldEventInputSchema).max(1000).optional(),
  /** HTTP headers from the originating request, used for server-side policy checks
   * (password cookie, bot-detection headers). Not stored with the response. */
  httpHeaders: z.record(z.string(), z.string()).optional(),
});
export type CompleteResponseInput = z.infer<typeof completeResponseInputSchema>;

/** GET /forms/:id/responses/:submissionId — Resume or view a response */
export const getResponseInputSchema = z.object({
  formId: z.string().uuid(),
  submissionId: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(200),
});
export type GetResponseInput = z.infer<typeof getResponseInputSchema>;

// ---- Webhooks ----

/** POST /forms/:id/webhooks — Register a webhook */
export const createWebhookInputSchema = z.object({
  formId: z.string().uuid(),
  url: z.string().url().max(2000),
  events: z.array(z.enum(["response.created", "response.completed", "response.updated"])).default(["response.completed"]),
  secret: z.string().max(200).optional(),
  active: z.boolean().default(true),
});
export type CreateWebhookInput = z.infer<typeof createWebhookInputSchema>;

/** DELETE /forms/:id/webhooks/:webhookId — Remove a webhook */
export const deleteWebhookInputSchema = z.object({
  formId: z.string().uuid(),
  webhookId: z.string().uuid(),
});
export type DeleteWebhookInput = z.infer<typeof deleteWebhookInputSchema>;

/** GET /forms/:id/webhooks — List webhooks */
export const listWebhooksInputSchema = z.object({
  formId: z.string().uuid(),
});
export type ListWebhooksInput = z.infer<typeof listWebhooksInputSchema>;
