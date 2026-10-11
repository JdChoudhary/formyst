import { z } from "zod";

export const responseRowOutputSchema = z.object({
  id: z.string(),
  formId: z.string(),
  formVersionId: z.string(),
  userId: z.string().nullable(),
  status: z.enum(["draft", "submitted", "partial", "abandoned", "spam", "deleted"]),
  sessionId: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  completedFields: z.number().int(),
  totalFields: z.number().int(),
  completionPercentage: z.number().int(),
  ipHash: z.string().nullable(),
  userAgent: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  referrer: z.string().nullable(),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  utmTerm: z.string().nullable(),
  utmContent: z.string().nullable(),
  startedAt: z.date(),
  submittedAt: z.date().nullable(),
  lastActivityAt: z.date(),
  timeSpentSeconds: z.number().int().nullable(),
  lastFieldId: z.string().nullable(),
  lastStepReached: z.number().int(),
  isDuplicate: z.boolean(),
  isSpam: z.boolean(),
  aiProcessed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const responseEventOutputSchema = z.object({
  id: z.string(),
  responseId: z.string(),
  fieldId: z.string().nullable(),
  eventType: z.enum(["view", "focus", "blur", "change", "step"]),
  value: z.unknown().nullable(),
  timeSpentMs: z.number().int().nullable(),
  happenedAt: z.date(),
});

export const draftOutputSchema = responseRowOutputSchema.extend({
  events: z.array(responseEventOutputSchema),
});

export const submitOutputSchema = z.object({
  success: z.boolean(),
  responseId: z.string(),
  status: z.string(),
});

export const listResponsesOutputSchema = z.object({
  responses: z.array(responseRowOutputSchema),
  answers: z.array(
    z.object({
      id: z.string(),
      responseId: z.string(),
      fieldId: z.string(),
      fieldType: z.string(),
      fieldLabel: z.string(),
      value: z.unknown(),
      valueText: z.string().nullable(),
      sortOrder: z.number().int().nullable(),
      createdAt: z.date(),
    }),
  ),
  events: z.array(responseEventOutputSchema),
});

export const webhookOutputSchema = z.object({
  id: z.string(),
  formId: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  secret: z.string().nullable(),
  active: z.boolean(),
  lastTriggeredAt: z.date().nullable(),
  failureCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const responseAnswerOutputSchema = z.object({
  id: z.string(),
  responseId: z.string(),
  formId: z.string(),
  formVersionId: z.string(),
  fieldId: z.string(),
  fieldRef: z.string().nullable(),
  fieldType: z.string(),
  fieldLabel: z.string(),
  answerType: z.string(),
  value: z.unknown(),
  valueText: z.string().nullable(),
  valueNumber: z.number().int().nullable(),
  valueChoiceIds: z.array(z.string()).nullable(),
  valueBoolean: z.boolean().nullable(),
  sortOrder: z.number().int().nullable(),
  createdAt: z.date(),
});
