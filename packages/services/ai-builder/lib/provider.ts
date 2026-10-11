import OpenAI, { APIError, APIConnectionTimeoutError, APIUserAbortError } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import type { ProviderChatMessage } from "../model";
import { internalError, serviceUnavailableError } from "../../errors";
import { getGeminiModel } from "./prompt";

/**
 * Google Gemini through its OpenAI-compatible endpoint.
 *
 * Gemini exposes an OpenAI SDK-shaped surface at `/v1beta/openai`, so the
 * official `openai` client works verbatim — only `baseURL` and the API key
 * differ. That keeps the provider swappable with any other OpenAI-compatible
 * gateway (Groq, OpenRouter, a local server) through env config alone.
 */

/** Gemini's OpenAI-compatible base URL (note the trailing `openai/` segment). */
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

/** Lazily created so a missing key surfaces as a service error, not a crash on import. */
let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    // Name the variable (never the value) so the 503 is self-diagnosing.
    console.error(
      "[ai-builder] GEMINI_API_KEY is missing or empty — set it in the API's .env and restart the server.",
    );
    throw serviceUnavailableError(
      "The AI builder is not configured on this server. Ask an administrator to set GEMINI_API_KEY and restart the API.",
    );
  }
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL,
      // Per-request timeouts come from `timeoutSignal()`; this is the socket-level ceiling.
      timeout: timeoutMs() + 5_000,
      maxRetries: 1,
    });
  }
  return client;
}

export interface CompleteChatOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /**
   * Ask the provider for a single JSON object. Gemini's OpenAI-compatible
   * endpoint supports `response_format: { type: "json_object" }`.
   */
  jsonMode?: boolean;
}

export interface CompleteChatUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface CompleteChatResult {
  content: string;
  model: string;
  finishReason: string;
  usage: CompleteChatUsage;
}

/**
 * The OpenAI SDK keeps `system` turns in the same message list, so the
 * service's ordered conversation replays as-is.
 */
function toProviderMessages(messages: ProviderChatMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function usageFrom(usage: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
} | null | undefined): CompleteChatUsage {
  const toValue = (value: number | undefined): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  return {
    promptTokens: toValue(usage?.prompt_tokens),
    completionTokens: toValue(usage?.completion_tokens),
    totalTokens: toValue(usage?.total_tokens),
  };
}

const DEFAULT_TIMEOUT_MS = 90_000;

function timeoutMs(): number {
  return Number(process.env.AI_BUILDER_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
}

function timeoutSignal(): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/** Map OpenAI SDK / provider failures onto the service's typed errors. */
function toProviderError(error: unknown): never {
  if (error instanceof APIUserAbortError || (error instanceof Error && error.name === "AbortError")) {
    throw internalError("The AI provider request timed out", error);
  }
  if (error instanceof APIConnectionTimeoutError) {
    throw internalError("The AI provider request timed out", error);
  }
  if (error instanceof APIError) {
    if (error.status === 429) {
      throw serviceUnavailableError("The AI service is busy. Please try again in a moment.");
    }
    if (error.status === 401 || error.status === 403) {
      console.error("[ai-builder] provider rejected GEMINI_API_KEY", error.status, error.message);
      throw serviceUnavailableError(
        "The AI builder is not configured correctly on this server. Ask an administrator to check GEMINI_API_KEY.",
      );
    }
    throw internalError(`AI provider error (${error.status ?? "unknown"}): ${error.message}`);
  }
  throw error;
}

/**
 * Single-shot completion. Returns the assistant's text plus usage metadata.
 */
export async function completeChat(
  messages: ProviderChatMessage[],
  opts: CompleteChatOptions = {},
): Promise<CompleteChatResult> {
  const model = getGeminiModel();
  const conversation = toProviderMessages(messages);
  const { signal, clear } = timeoutSignal();

  try {
    const completion = await getClient().chat.completions.create(
      {
        model,
        messages: conversation,
        temperature: opts.temperature ?? 0.4,
        top_p: opts.topP ?? 0.9,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal },
    );

    const content = (completion.choices[0]?.message?.content ?? "").trim();
    if (!content) {
      throw internalError("The AI provider returned an empty response");
    }

    return {
      content,
      model,
      finishReason: completion.choices[0]?.finish_reason ?? "stop",
      usage: usageFrom(completion.usage),
    };
  } catch (error) {
    return toProviderError(error);
  } finally {
    clear();
  }
}

export interface StreamChatOptions extends CompleteChatOptions {
  /** Called with each incremental text chunk as it arrives. */
  onDelta?: (delta: string) => void;
}

export interface StreamChatResult extends CompleteChatResult {}

/**
 * Streaming completion — same contract as {@link completeChat}, but text
 * arrives incrementally. Returns the fully assembled answer once the stream
 * ends, so callers that only care about the final result can ignore `onDelta`.
 */
export async function streamChat(
  messages: ProviderChatMessage[],
  opts: StreamChatOptions = {},
): Promise<StreamChatResult> {
  const model = getGeminiModel();
  const conversation = toProviderMessages(messages);
  const { signal, clear } = timeoutSignal();

  try {
    const stream = await getClient().chat.completions.create(
      {
        model,
        messages: conversation,
        temperature: opts.temperature ?? 0.4,
        top_p: opts.topP ?? 0.9,
        max_tokens: opts.maxTokens ?? 4096,
        stream: true,
        ...(opts.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal },
    );

    let content = "";
    let finishReason = "stop";

    for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        content += delta;
        opts.onDelta?.(delta);
      }
      const reason = chunk.choices?.[0]?.finish_reason;
      if (reason) finishReason = reason;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw internalError("The AI provider returned an empty response");
    }

    return {
      content: trimmed,
      model,
      finishReason,
      // Gemini's streaming responses often omit `usage`; the caller treats
      // null the same as it does for non-streaming providers.
      usage: usageFrom(null),
    };
  } catch (error) {
    return toProviderError(error);
  } finally {
    clear();
  }
}
