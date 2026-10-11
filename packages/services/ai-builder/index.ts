import db, { aiChatMessage, aiChatSession, and, asc, desc, eq, sql } from "@repo/database";
import { validateFormSchema } from "@repo/shared";
import {
  forbiddenError,
  internalError,
  notFoundError,
  tooManyRequestsError,
} from "../errors";
import type {
  AIBuilderChatSession,
  AIBuilderGenerateInput,
  AIBuilderGenerateResult,
  AIBuilderSavedMessage,
  ProviderChatMessage,
} from "./model";
import type { FormSchema } from "@repo/shared";
import { SlidingWindowRateLimiter } from "./model";
import { buildSystemPrompt, getAvailableGeminiModels, getGeminiModel } from "./lib/prompt";
import { completeChat, streamChat } from "./lib/provider";
import { extractJsonFromText, finalizeSchema } from "./lib/schema";
import { sanitizeSingleMessage, validateAndSanitizeMessages } from "./lib/security";

/**
 * Service-layer error codes/`TRPCError`s are mapped centrally (see
 * `@repo/trpc/utils/errors`), so throwing typed `ServiceError`s here is enough.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** First line of the opening prompt, trimmed to something list-friendly. */
function deriveSessionTitle(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}…` : cleaned;
}

function buildAssistantMessage({
  valid,
  fieldCount,
}: {
  valid: boolean;
  fieldCount: number;
}): string {
  if (valid) {
    return fieldCount > 0
      ? `I generated a form with ${fieldCount} field${fieldCount === 1 ? "" : "s"}. Preview it on the right, then use it in the builder.`
      : "I generated a form for you. Preview it on the right, then use it in the builder.";
  }
  return "I put together a draft form, but couldn't fully validate every field. You can still preview it — some fields may need a quick review.";
}

function mapMessage(row: typeof aiChatMessage.$inferSelect): AIBuilderSavedMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role,
    content: row.content,
    metadata: row.metadata ?? {},
    modelUsed: row.modelUsed,
    tokensUsed: row.tokensUsed,
    createdAt: row.createdAt,
  };
}

function addTokenCounts(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return a + b;
}

/**
 * AI form-builder service (Express/tRPC port of the ikiform
 * `/api/ai-builder` + `/api/ai-builder/chat` routes).
 *
 * Responsibilities:
 * - premium gate (server-side mirror of the web `usePremiumStatus` rule)
 * - per-user sliding-window rate limit (429 on exhaustion)
 * - input sanitization + prompt-injection rejection
 * - Gemini completion (through its OpenAI-compatible endpoint), then schema
 *   extraction and validation against the canonical `formSchema` from
 *   `@repo/shared` (with one repair pass)
 * - conversation persistence as `ai_chat_sessions` + `ai_chat_messages`, so a
 *   prior chat can be replayed to the model as context
 */
export class AIBuilderService {
  private readonly limiter = new SlidingWindowRateLimiter(
    Number(process.env.AI_BUILDER_RATE_LIMIT_MAX) || 20,
    Number(process.env.AI_BUILDER_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000,
  );

  private readonly maxMessages = Number(process.env.AI_BUILDER_MAX_MESSAGES) || 40;
  private readonly maxInputLength = Number(process.env.AI_BUILDER_MAX_INPUT_LENGTH) || 8_000;

  /**
   * Admins are always entitled; with no allow-list configured the feature is
   * open to signed-in users (this deployment has no billing provider).
   */
  isEntitled(user: { role: string; email: string }): boolean {
    if (user.role === "admin") return true;
    const allowList = (process.env.PREMIUM_EMAILS ?? process.env.NEXT_PUBLIC_PREMIUM_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (allowList.length === 0) return true;
    return allowList.includes((user.email ?? "").toLowerCase());
  }

  /** Throws a typed FORBIDDEN error when the user is not entitled. */
  assertEntitled(user: { role: string; email: string }): void {
    if (!this.isEntitled(user)) {
      throw forbiddenError("Premium subscription required");
    }
  }

  private checkRateLimit(userId: string): { allowed: boolean; retryAfterMs: number } {
    return this.limiter.check(`ai:${userId}`);
  }

  /** True when `sessionId` exists and is owned by `userId`. */
  private async sessionBelongsTo(userId: string, sessionId: string): Promise<boolean> {
    if (!isUuid(sessionId)) return false;
    const [row] = await db
      .select({ id: aiChatSession.id })
      .from(aiChatSession)
      .where(and(eq(aiChatSession.id, sessionId), eq(aiChatSession.userId, userId)))
      .limit(1);
    return Boolean(row);
  }

  /**
   * Resolve the conversation to append to.
   *
   * A caller-supplied id is honoured only when it is a real session owned by
   * the user; otherwise a fresh session is created and its id returned so the
   * client can switch to it (this also recovers from stale localStorage ids
   * and prevents writing into another user's chat).
   */
  private async ensureSession(
    userId: string,
    sessionId: string | undefined,
    firstMessage: string | undefined,
  ): Promise<string> {
    const candidate = sessionId?.trim();
    if (candidate && (await this.sessionBelongsTo(userId, candidate))) {
      return candidate;
    }

    const [created] = await db
      .insert(aiChatSession)
      .values({
        userId,
        title: firstMessage ? deriveSessionTitle(firstMessage) : null,
      })
      .returning({ id: aiChatSession.id });

    if (!created) {
      throw internalError("Chat session could not be created", "ai_session_create_failed");
    }
    return created.id;
  }

  private async persist(
    sessionId: string,
    role: AIBuilderSavedMessage["role"],
    content: string,
    metadata: Record<string, unknown>,
    options: { modelUsed?: string | null; tokensUsed?: number | null } = {},
  ): Promise<AIBuilderSavedMessage> {
    const [row] = await db
      .insert(aiChatMessage)
      .values({
        sessionId,
        role,
        content,
        metadata,
        modelUsed: options.modelUsed ?? null,
        tokensUsed: options.tokensUsed ?? null,
      })
      .returning();

    if (!row) {
      throw internalError("Chat message could not be saved", "ai_builder_persist_failed");
    }

    // Bump the session so the list view stays ordered by recency.
    await db
      .update(aiChatSession)
      .set({ updatedAt: new Date() })
      .where(eq(aiChatSession.id, sessionId));

    return mapMessage(row);
  }

  /** Best-effort persistence — a storage hiccup must not lose the generation. */
  private async persistSafe(
    sessionId: string,
    role: AIBuilderSavedMessage["role"],
    content: string,
    metadata: Record<string, unknown>,
    options: { modelUsed?: string | null; tokensUsed?: number | null } = {},
  ): Promise<void> {
    try {
      await this.persist(sessionId, role, content, metadata, options);
    } catch (error) {
      console.error(`[ai-builder] failed to persist ${role} message:`, error);
    }
  }

  /**
   * True when the conversation's newest message already *is* this turn.
   *
   * A retried generation (network blip, "try again" after an error) would
   * otherwise append the same prompt a second time, so the client's history
   * rehydration shows the question twice.
   */
  private async isDuplicateTurn(
    sessionId: string,
    role: AIBuilderSavedMessage["role"],
    content: string,
  ): Promise<boolean> {
    try {
      const [row] = await db
        .select({ role: aiChatMessage.role, content: aiChatMessage.content })
        .from(aiChatMessage)
        .where(eq(aiChatMessage.sessionId, sessionId))
        .orderBy(desc(aiChatMessage.createdAt))
        .limit(1);

      return Boolean(row && row.role === role && row.content === content);
    } catch (error) {
      // Deduping is best-effort — a lookup failure should never block a turn.
      console.error("[ai-builder] duplicate-turn check failed:", error);
      return false;
    }
  }

  /**
   * Generate (or refine) a form schema from a conversation.
   *
   * When `options.onProgress` is supplied the provider call is streamed
   * (AI SDK `streamText`) and each newly-detected field is reported, so a UI
   * can show live progress instead of a spinner. The returned result is
   * identical either way.
   */
  async generateSchema(
    input: AIBuilderGenerateInput,
    options: { onProgress?: (message: string) => void } = {},
  ): Promise<AIBuilderGenerateResult> {
    this.assertEntitled({ role: input.role, email: input.email });

    const { allowed, retryAfterMs } = this.checkRateLimit(input.userId);
    if (!allowed) {
      const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      throw tooManyRequestsError(
        `Too many requests. Please try again in ${seconds} second${seconds === 1 ? "" : "s"}.`,
        retryAfterMs,
      );
    }

    const { messages } = validateAndSanitizeMessages(input.messages.slice(-this.maxMessages));
    for (const message of messages) {
      if (message.content.length > this.maxInputLength) {
        message.content = message.content.slice(0, this.maxInputLength);
      }
    }

    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const sessionId = await this.ensureSession(input.userId, input.sessionId, lastUser?.content);

    // Persist the user turn up front so history stays complete even if the
    // provider call fails. Skipped when a retry re-sends the same prompt.
    if (lastUser && !(await this.isDuplicateTurn(sessionId, "user", lastUser.content))) {
      await this.persistSafe(sessionId, "user", lastUser.content, {
        timestamp: new Date().toISOString(),
        ip: input.ip,
        userAgent: input.userAgent,
      });
    }

    const systemPrompt = process.env.AI_FORM_SYSTEM_PROMPT || buildSystemPrompt();

    // Follow-up context: the form as it exists right now, so requests like
    // "add an email field" edit the real schema instead of starting over.
    // Priority: what the client is previewing → the last schema we persisted
    // for this conversation → none (a brand-new form).
    const contextSchema =
      input.currentSchema ?? (await this.lastPersistedSchema(sessionId)) ?? null;
    const contextMessages = buildContextMessages(contextSchema);

    const historyMessages: ProviderChatMessage[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const providerMessages: ProviderChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      ...historyMessages,
    ];

    const completion = options.onProgress
      ? await streamChat(providerMessages, {
          jsonMode: true,
          onDelta: createProgressReporter(options.onProgress),
        })
      : await completeChat(providerMessages, { jsonMode: true });
    const rawText = completion.content;

    let result = finalizeSchema(extractJsonFromText(rawText));
    let repaired = false;
    let totalTokens = completion.usage.totalTokens;

    // One repair pass: feed the validator issues back to the model and ask for
    // corrected JSON. Bounded to a single retry to keep latency/cost sane.
    if (!result.valid) {
      repaired = true;
      const repairMessages: ProviderChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        ...historyMessages,
        { role: "assistant", content: rawText },
        {
          role: "user",
          content: [
            "Your previous output failed schema validation.",
            "Issues:",
            ...(result.issues.length > 0
              ? result.issues.map((issue) => `- ${issue.path}: ${issue.message}`)
              : ["- The JSON did not match the required shape."]),
            "Respond with a single corrected JSON object only.",
          ].join("\n"),
        },
      ];

      try {
        const repairedCompletion = await completeChat(repairMessages, {
          jsonMode: true,
          temperature: 0.2,
        });
        result = finalizeSchema(extractJsonFromText(repairedCompletion.content));
        totalTokens = addTokenCounts(totalTokens, repairedCompletion.usage.totalTokens);
      } catch (error) {
        console.error("[ai-builder] schema repair attempt failed:", error);
      }
    }

    const message = buildAssistantMessage({
      valid: result.valid,
      fieldCount: countFields(result.schema),
    });

    await this.persistSafe(
      sessionId,
      "assistant",
      message,
      {
        timestamp: new Date().toISOString(),
        provider: "gemini",
        valid: result.valid,
        repaired,
        issues: result.issues,
        schema: result.schema,
      },
      { modelUsed: completion.model, tokensUsed: totalTokens },
    );

    return {
      sessionId,
      message,
      schema: result.schema,
      valid: result.valid,
      issues: result.issues,
      model: completion.model,
      repaired,
    };
  }

  /**
   * The most recent schema this conversation produced, read from the
   * assistant turns' persisted metadata. Used when the client does not send
   * its own copy (e.g. a rehydrated session before the preview mounts).
   */
  private async lastPersistedSchema(sessionId: string): Promise<AIBuilderGenerateInput["currentSchema"]> {
    try {
      const rows = await db
        .select({ metadata: aiChatMessage.metadata })
        .from(aiChatMessage)
        .where(and(eq(aiChatMessage.sessionId, sessionId), eq(aiChatMessage.role, "assistant")))
        .orderBy(desc(aiChatMessage.createdAt))
        .limit(5);

      for (const row of rows) {
        const schema = row.metadata?.schema;
        if (!schema || typeof schema !== "object") continue;
        const parsed = validateFormSchema(schema);
        if (parsed.valid) return parsed.data;
      }
    } catch (error) {
      // Context is best-effort — never fail a generation over it.
      console.error("[ai-builder] failed to load persisted schema context:", error);
    }
    return null;
  }

  /**
   * Persisted history for a conversation, oldest message first. Returns an
   * empty list when the session is unknown or not owned by the caller, so the
   * client never learns whether another user's session id exists.
   */
  async getChatHistory(userId: string, sessionId: string): Promise<AIBuilderSavedMessage[]> {
    if (!(await this.sessionBelongsTo(userId, sessionId))) {
      return [];
    }

    const rows = await db
      .select()
      .from(aiChatMessage)
      .where(eq(aiChatMessage.sessionId, sessionId))
      .orderBy(asc(aiChatMessage.createdAt));

    return rows.map(mapMessage);
  }

  /** Append a single message to a session the user owns. */
  async saveMessage(
    userId: string,
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<AIBuilderSavedMessage> {
    const sanitized = sanitizeSingleMessage(content);
    if (!(await this.sessionBelongsTo(userId, sessionId))) {
      throw notFoundError("Chat session not found", "ai_session_not_found");
    }
    return this.persist(sessionId, role, sanitized, metadata);
  }

  /** The user's conversations, most recently active first. */
  async listSessions(userId: string, limit = 50): Promise<AIBuilderChatSession[]> {
    const rows = await db
      .select({
        id: aiChatSession.id,
        title: aiChatSession.title,
        createdAt: aiChatSession.createdAt,
        updatedAt: aiChatSession.updatedAt,
        messageCount: sql<number>`count(${aiChatMessage.id})::int`,
      })
      .from(aiChatSession)
      .leftJoin(aiChatMessage, eq(aiChatMessage.sessionId, aiChatSession.id))
      .where(eq(aiChatSession.userId, userId))
      .groupBy(aiChatSession.id)
      .orderBy(desc(aiChatSession.updatedAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      messageCount: Number(row.messageCount) || 0,
    }));
  }

  /** Remove a session (and, by cascade, its messages) if the user owns it. */
  async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    if (!isUuid(sessionId)) return false;
    const deleted = await db
      .delete(aiChatSession)
      .where(and(eq(aiChatSession.id, sessionId), eq(aiChatSession.userId, userId)))
      .returning({ id: aiChatSession.id });

    return deleted.length > 0;
  }

  /** Used by the tRPC health endpoint. */
  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  }

  /** Provider/config summary for the health endpoint. */
  health(): {
    status: "healthy";
    service: "form-builder-ai";
    provider: string;
    model: string;
    configured: boolean;
    availableModels: string[];
  } {
    return {
      status: "healthy",
      service: "form-builder-ai",
      // Gemini is consumed through its OpenAI-compatible endpoint via the `openai` SDK.
      provider: "gemini (openai-compatible, openai sdk)",
      model: getGeminiModel(),
      configured: this.isConfigured(),
      availableModels: getAvailableGeminiModels(),
    };
  }
}

/**
 * Turn a stream of raw JSON deltas into human progress lines.
 *
 * The model streams the schema as JSON text; counting the field `"type"` keys
 * it has emitted so far yields a live question counter without parsing a
 * document that is not valid JSON until the stream completes.
 */
function createProgressReporter(
  onProgress: (message: string) => void,
): (delta: string) => void {
  let buffer = "";
  let lastCount = -1;

  onProgress("Understanding your request…");

  return (delta) => {
    buffer += delta;
    const count = (buffer.match(/"type"\s*:/g) ?? []).length;
    if (count === lastCount) return;
    lastCount = count;
    onProgress(
      count > 0 ? `Designing question ${count}…` : "Choosing the right field types…",
    );
  };
}

function countFields(schema: unknown): number {
  if (!schema || typeof schema !== "object") return 0;
  const fields = (schema as { fields?: unknown }).fields;
  return Array.isArray(fields) ? fields.length : 0;
}

/**
 * Frame the form the conversation is currently editing as explicit context.
 *
 * The model only ever sees text, so without this a follow-up such as "add an
 * email field" has no idea what it is editing and regenerates from scratch.
 * The schema is echoed back as a system message (server-controlled, never
 * client-authored) plus a short instruction that the next output must be the
 * complete updated schema.
 */
function buildContextMessages(schema: FormSchema | null): ProviderChatMessage[] {
  if (!schema) return [];

  return [
    {
      role: "system",
      content: [
        "Current form the user is editing (JSON):",
        JSON.stringify(schema),
        "",
        "When the user's next message asks for a change, treat that JSON as the starting point:",
        "apply only the requested edits and keep everything else unchanged, then output the",
        "complete updated schema as a single JSON object.",
      ].join("\n"),
    },
  ];
}
