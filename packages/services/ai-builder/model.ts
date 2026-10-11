import type { FormSchema } from "@repo/shared";

/**
 * Shared types for the AI form-builder service.
 *
 * The service is provider-agnostic at the edge: it talks to the configured
 * chat-completions provider (Gemini by default) and always returns a canonical
 * `FormSchema` validated against `@repo/shared`'s `formSchema`.
 */

export interface AIBuilderChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIBuilderGenerateInput {
  userId: string;
  role: string;
  email: string;
  messages: AIBuilderChatMessage[];
  sessionId?: string;
  /**
   * The form as the client currently shows it (preview/import state). Sent so
   * follow-ups like "add an email field" edit the real schema instead of
   * starting over. Falls back to the last schema persisted for the session.
   */
  currentSchema?: FormSchema | null;
  ip: string;
  userAgent: string;
}

export interface AIBuilderSchemaIssue {
  path: string;
  message: string;
}

export interface AIBuilderGenerateResult {
  sessionId: string;
  /** Human-friendly text shown in the chat for the assistant turn. */
  message: string;
  /** Null when the model output could not be validated after repair. */
  schema: FormSchema | null;
  valid: boolean;
  issues: AIBuilderSchemaIssue[];
  model: string;
  repaired: boolean;
}

export interface AIBuilderSavedMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  /** Provider model that produced the turn (assistant turns only). */
  modelUsed: string | null;
  /** Total tokens billed for the turn, when reported by the provider. */
  tokensUsed: number | null;
  createdAt: Date;
}

export interface AIBuilderChatSession {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Number of persisted messages in the session. */
  messageCount: number;
}

/**
 * Minimal in-memory sliding-window limiter.
 *
 * Session requests are per-user and low volume, so a process-local window is
 * acceptable here (mirrors the reference route's per-IP budget). If the API
 * ever runs across multiple instances, swap this for a Redis-backed limiter —
 * the `check` contract stays the same.
 */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    let allowed = true;
    let retryAfterMs = 0;

    if (timestamps.length >= this.max) {
      allowed = false;
      const oldest = timestamps[0] ?? now;
      retryAfterMs = Math.max(1_000, cutoff + this.windowMs - oldest + 1_000);
    } else {
      timestamps.push(now);
      this.hits.set(key, timestamps);
    }

    // Opportunistic cleanup so the map never grows unbounded.
    if (this.hits.size > 10_000) {
      for (const [k, times] of this.hits) {
        const live = times.filter((t) => t > cutoff);
        if (live.length === 0) this.hits.delete(k);
      }
    }

    return { allowed, retryAfterMs };
  }
}