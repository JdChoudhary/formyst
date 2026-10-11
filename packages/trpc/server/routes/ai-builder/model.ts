import { z } from "zod";
import { formSchema } from "@repo/shared";

/**
 * Zod schemas for the AI form-builder routes.
 *
 * The generated schema output is validated against the canonical `formSchema`
 * from `@repo/shared`, so the client only ever receives a real, renderable
 * FormSchema (or `null` when the model output could not be salvaged).
 * Conversations are identified by a session uuid.
 */

export const aiBuilderChatMessageInputSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

export const generateSchemaInputSchema = z.object({
  messages: z.array(aiBuilderChatMessageInputSchema).min(1).max(40),
  /** Existing conversation to continue; the server mints one when omitted. */
  sessionId: z.string().uuid().optional(),
  /**
   * The form the client is currently previewing. Passed back on every turn so
   * the model applies follow-up requests ("add an email field") to the real
   * schema instead of regenerating from scratch.
   */
  currentSchema: formSchema.optional(),
});

export const schemaIssueOutputSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const generateSchemaOutputSchema = z.object({
  sessionId: z.string(),
  /** Human-friendly assistant turn shown in the chat. */
  message: z.string(),
  /** Canonical schema, or null when the output could not be validated. */
  schema: formSchema.nullable(),
  valid: z.boolean(),
  issues: z.array(schemaIssueOutputSchema),
  model: z.string(),
  repaired: z.boolean(),
});

export const savedMessageOutputSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  modelUsed: z.string().nullable(),
  tokensUsed: z.number().int().nullable(),
  createdAt: z.date(),
});

export const chatSessionOutputSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messageCount: z.number().int(),
});

export const getChatHistoryInputSchema = z.object({
  sessionId: z.string().uuid(),
});

export const getChatHistoryOutputSchema = z.object({
  sessionId: z.string(),
  messages: z.array(savedMessageOutputSchema),
  count: z.number().int(),
});

export const listSessionsOutputSchema = z.object({
  sessions: z.array(chatSessionOutputSchema),
  count: z.number().int(),
});

export const saveMessageInputSchema = z.object({
  sessionId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const sessionIdInputSchema = z.object({
  sessionId: z.string().uuid(),
});

export const deleteSessionOutputSchema = z.object({
  success: z.boolean(),
});

export const healthOutputSchema = z.object({
  status: z.literal("healthy"),
  service: z.literal("form-builder-ai"),
  provider: z.string(),
  model: z.string(),
  configured: z.boolean(),
  availableModels: z.array(z.string()),
});
