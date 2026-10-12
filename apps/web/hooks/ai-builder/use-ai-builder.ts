"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DRAFT_KEYS } from "@/components/form-builder/form-builder/constants";
import { useUpdateForm } from "@/hooks/api/form";
import {
  type AIBuilderFormContext,
  clearAIBuilderFormContext,
  readAIBuilderFormContext,
} from "@/lib/ai-builder/form-context";
import type { AttachedForm, ChatMessage, FormSchema } from "@/lib/ai-builder/types";
import { trpc } from "@/trpc/client";

/**
 * The AI builder, backed by the real `aiBuilder` tRPC router.
 *
 * Generation is a single mutation (`generateSchema`) that returns the canonical,
 * server-validated FormSchema for the assistant turn. While it's in flight a
 * lightweight client-side ticker drives the same streaming UI the hosted model
 * would, so the chat/preview surface is unchanged. Conversations are keyed by a
 * server-minted `sessionId` persisted in localStorage, and a returning user's
 * history is rehydrated through `getChatHistory`.
 */

const SESSION_STORAGE_KEY = "ai_builder_session_id";

/** Same-origin endpoint on the API server, proxied by the web app's /api rewrite. */
const STREAM_ENDPOINT = "/api/ai-builder/stream";

/** Progress lines are streamed as they arrive; only the tail is worth showing. */
const MAX_PROGRESS_LINES = 8;

type GeneratePayload = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId?: string;
  currentSchema?: FormSchema["schema"];
};

type GenerateResult = {
  sessionId: string;
  message: string;
  schema: FormSchema["schema"] | null;
  valid: boolean;
  issues: Array<{ path: string; message: string }>;
  model: string;
  repaired: boolean;
};

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `form_${Date.now()}`;
}

function readStoredSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useAIBuilder() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  const { updateForm } = useUpdateForm();
  /**
   * The form the user came from (form builder → "Use Kiko AI"). It seeds the
   * context of the first message and decides where "Use this form" writes back.
   */
  const [sourceForm, setSourceForm] = useState<AIBuilderFormContext | null>(null);
  const [isUsingForm, setIsUsingForm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const streamingRef = useRef<HTMLDivElement | null>(null);
  /** Cancels the in-flight streaming request ("stop generating"). */
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef("");
  /** Sessions minted during this visit already have their turns in local
   *  state — rehydrating them from the server would duplicate the chat. */
  const localSessionIdsRef = useRef<Set<string>>(new Set());
  /** The session id whose history has been restored, if any. */
  const hydratedSessionRef = useRef<string | null>(null);

  /** Abort any in-flight generation and drop its stream. */
  const clearTimer = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Pick up the form handed over from the builder, then drop it from storage so
  // a later, unrelated visit starts without one. Both reads happen here rather
  // than in a state initializer — like the session key below — so the
  // server-rendered markup matches the first client render.
  useEffect(() => {
    setSourceForm(readAIBuilderFormContext());
    clearAIBuilderFormContext();
  }, []);

  // Restore the conversation key so a returning user continues the same chat.
  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      localSessionIdsRef.current.delete(stored);
      setSessionId(stored);
    }
  }, []);

  // Persist whichever key we ended up with (restored or server-minted).
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } catch {
      // Storage can be unavailable (private mode); the chat just won't persist.
    }
  }, [sessionId]);

  const historyQuery = trpc.aiBuilder.getChatHistory.useQuery(
    { sessionId: sessionId ?? "" },
    {
      enabled:
        Boolean(sessionId) &&
        !localSessionIdsRef.current.has(sessionId ?? "") &&
        hydratedSessionRef.current !== sessionId,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  // Rebuild the chat + preview from persisted history, once per session.
  useEffect(() => {
    const data = historyQuery.data;
    if (!data || !sessionId || hydratedSessionRef.current === sessionId) return;
    hydratedSessionRef.current = sessionId;

    const restoredMessages: ChatMessage[] = [];
    const restoredForms: FormSchema[] = [];

    for (const saved of data.messages) {
      if (saved.role === "user") {
        restoredMessages.push({ role: "user", content: saved.content });
        continue;
      }
      if (saved.role !== "assistant") continue;

      const schema = (saved.metadata?.schema ?? null) as FormSchema["schema"] | null;
      restoredMessages.push({
        role: "assistant",
        content: saved.content,
        schema: schema ?? undefined,
      });
      if (schema) {
        restoredForms.push({ id: `history_${saved.id}`, prompt: "", schema });
      }
    }

    if (restoredMessages.length > 0) setMessages(restoredMessages);
    if (restoredForms.length > 0) {
      setForms(restoredForms);
      setActiveFormId(restoredForms[restoredForms.length - 1]!.id);
    }
  }, [historyQuery.data, sessionId]);

  /**
   * Apply a finished generation to the chat + preview. Shared by the streaming
   * path and the tRPC fallback so both behave identically.
   */
  const applyResult = useCallback((data: GenerateResult) => {
    if (data.sessionId) {
      // This session's turns now live in local state too — skip rehydration.
      localSessionIdsRef.current.add(data.sessionId);
      setSessionId(data.sessionId);
    }

    setMessages((current) => [
      ...current,
      { role: "assistant", content: data.message, schema: data.schema ?? undefined },
    ]);

    if (data.schema) {
      const form: FormSchema = {
        id: randomId(),
        prompt: lastPromptRef.current,
        schema: data.schema,
      };
      setForms((current) => [...current, form]);
      setActiveFormId(form.id);
    }
  }, []);

  /** Keep the streaming box to the most recent progress lines. */
  const appendProgress = useCallback((line: string) => {
    setStreamedContent((current) =>
      [...current.split("\n").filter(Boolean), line].slice(-MAX_PROGRESS_LINES).join("\n"),
    );
  }, []);

  /** Marks the turn finished and clears the streaming placeholder. */
  const finishTurn = useCallback(() => {
    abortRef.current = null;
    setIsLoading(false);
    setIsStreaming(false);
    setStreamedContent("");
  }, []);

  const failTurn = useCallback((message: string) => {
    abortRef.current = null;
    setIsLoading(false);
    // Keep the streaming slot mounted so the error renders in place of the dots.
    setIsStreaming(true);
    setStreamedContent("");
    setStreamError(message);
  }, []);

  // Fallback path: used when the streaming endpoint is unavailable (older API
  // deployment, network hiccup) so generation still completes.
  const generate = trpc.aiBuilder.generateSchema.useMutation({
    onSuccess: (data) => {
      finishTurn();
      setStreamError(null);
      applyResult(data as GenerateResult);
    },
    onError: (error) => {
      failTurn(error.message || "Something went wrong. Please try again.");
    },
  });

  /**
   * Generate through the streaming endpoint and render progress as it arrives.
   *
   * Falls back to the tRPC mutation whenever the stream cannot be established
   * or the API reports a non-2xx (e.g. it is an older build without the route).
   */
  const streamGenerate = useCallback(
    async (payload: GeneratePayload) => {
      const controller = new AbortController();
      abortRef.current = controller;

      let response: Response | null = null;
      try {
        response = await fetch(STREAM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("[ai-builder] stream request failed, falling back:", error);
      }

      if (!response || !response.ok || !response.body) {
        generate.mutate(payload);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let settled = false;

      const handleEvent = (event: Record<string, unknown>) => {
        switch (event.type) {
          case "progress":
            if (typeof event.text === "string" && event.text) appendProgress(event.text);
            break;
          case "done": {
            settled = true;
            finishTurn();
            setStreamError(null);
            applyResult(event as unknown as GenerateResult);
            break;
          }
          case "error":
            settled = true;
            failTurn(
              typeof event.message === "string" && event.message
                ? event.message
                : "Something went wrong. Please try again.",
            );
            break;
          default:
            break;
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line) {
              try {
                handleEvent(JSON.parse(line) as Record<string, unknown>);
              } catch {
                // A partial line can only be the last one; ignore malformed ones.
              }
            }
            newline = buffer.indexOf("\n");
          }
        }
      } catch (error) {
        if (!controller.signal.aborted && !settled) {
          failTurn("The connection was interrupted. Please try again.");
        }
        return;
      }

      if (!settled && !controller.signal.aborted) {
        failTurn("The generation ended unexpectedly. Please try again.");
      }
    },
    [appendProgress, applyResult, failTurn, finishTurn, generate],
  );

  const activeForm = useMemo(
    () => forms.find((form) => form.id === activeFormId),
    [forms, activeFormId],
  );

  /**
   * The form the model should edit this turn: the previewed form, falling back
   * to the newest one produced in the conversation, then to the form the user
   * arrived with from the builder. Sent as `currentSchema` so the very first
   * message is already grounded in that form, and follow-ups ("add an email
   * field") refine the real schema instead of starting over.
   */
  const currentSchema = useMemo(
    () => activeForm?.schema ?? forms[forms.length - 1]?.schema ?? sourceForm?.schema ?? null,
    [activeForm, forms, sourceForm],
  );

  /** The handed-over form, framed for the chat attachment UI. */
  const attachedForm = useMemo<AttachedForm | null>(
    () =>
      sourceForm
        ? {
            formId: sourceForm.formId,
            title: sourceForm.schema.title || "Untitled form",
          }
        : null,
    [sourceForm],
  );

  /** Drop the attachment so it is neither sent as context nor written back. */
  const detachAttachedForm = useCallback(() => setSourceForm(null), []);

  const handleSend = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const prompt = input.trim();
      if (!prompt || isLoading) return;

      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: prompt }];
      lastPromptRef.current = prompt;

      setMessages(nextMessages);
      setInput("");
      setStreamError(null);
      setIsLoading(true);
      setIsStreaming(true);
      setStreamedContent("Understanding your request…");

      void streamGenerate({
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        sessionId: sessionId ?? undefined,
        currentSchema: currentSchema ?? undefined,
      });
    },
    [input, isLoading, messages, sessionId, currentSchema, streamGenerate],
  );

  const handleStopGeneration = useCallback(() => {
    clearTimer();
    generate.reset();
    setIsLoading(false);
    setIsStreaming(false);
    setStreamedContent("");
    setStreamError("Generation stopped.");
  }, [clearTimer, generate]);

  /**
   * Re-send the conversation after an error or an explicit stop.
   *
   * The user's prompt is already in `messages` (it was appended optimistically
   * before the first attempt), so a retry just replays the transcript — the
   * server dedupes the repeated user turn.
   */
  const retryLastSend = useCallback(() => {
    if (isLoading || !messages.some((message) => message.role === "user")) return;

    setStreamError(null);
    setStreamedContent("Understanding your request…");
    setIsLoading(true);
    setIsStreaming(true);

    void streamGenerate({
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      sessionId: sessionId ?? undefined,
      currentSchema: currentSchema ?? undefined,
    });
  }, [isLoading, messages, sessionId, currentSchema, streamGenerate]);

  // `handleStopGeneration` above intentionally keeps the streaming slot mounted
  // with a "stopped" notice, matching the previous behaviour.

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const scrollStreamingToBottom = useCallback(() => {
    const el = streamingRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  /**
   * Hand the previewed form back to the form builder.
   *
   * Coming from the builder (`sourceForm.formId`), the generated schema
   * replaces that form. A form generated from scratch opens as an unsaved
   * draft, so nothing is persisted until the user saves it. Returns the route
   * the caller should navigate to, or `null` when there is nothing to use.
   */
  const handleUseForm = useCallback(
    async (form: FormSchema | undefined): Promise<{ route: string } | null> => {
      if (!form?.schema) return null;

      setIsUsingForm(true);
      try {
        const sourceFormId = sourceForm?.formId ?? null;
        if (sourceFormId) {
          await updateForm(sourceFormId, { schema: form.schema });
          return { route: `/form-builder/${sourceFormId}` };
        }

        try {
          window.localStorage.setItem(
            DRAFT_KEYS.IMPORTED_FORM_SCHEMA,
            JSON.stringify(form.schema),
          );
        } catch {
          throw new Error("Could not load this form into the builder.");
        }
        return { route: "/form-builder?from=ai-builder" };
      } finally {
        setIsUsingForm(false);
      }
    },
    [sourceForm, updateForm],
  );

  const processInitialPrompt = useCallback((prompt?: string) => {
    if (prompt?.trim()) setInput(prompt.trim());
  }, []);

  /* ------------------------------------------------------------------ *
   * Conversation history — list / open / start / delete sessions
   * ------------------------------------------------------------------ */
  const sessionsQuery = trpc.aiBuilder.listSessions.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  /** Wipe local chat state so the next send mints a fresh session. */
  const startNewChat = useCallback(() => {
    clearTimer();
    if (sessionId) localSessionIdsRef.current.delete(sessionId);
    hydratedSessionRef.current = null;
    setSessionId(null);
    setMessages([]);
    setForms([]);
    setActiveFormId(null);
    setInput("");
    setStreamError(null);
    setStreamedContent("");
    setIsStreaming(false);
    setIsLoading(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Storage unavailable — the next generate simply mints a new id.
      }
    }
  }, [clearTimer, sessionId]);

  const deleteSessionMutation = trpc.aiBuilder.deleteSession.useMutation({
    onSuccess: (_data, variables) => {
      void sessionsQuery.refetch();
      // Deleting the conversation we are in resets the chat to a fresh one.
      if (variables.sessionId === sessionId) startNewChat();
    },
  });

  /** Switch to a previously saved conversation (hydrates from the server). */
  const openSession = useCallback(
    (nextSessionId: string) => {
      if (!nextSessionId || nextSessionId === sessionId) return;
      clearTimer();
      hydratedSessionRef.current = null;
      localSessionIdsRef.current.delete(nextSessionId);
      setSessionId(nextSessionId);
      setMessages([]);
      setForms([]);
      setActiveFormId(null);
      setStreamError(null);
      setStreamedContent("");
      setIsStreaming(false);
      setIsLoading(false);
    },
    [clearTimer, sessionId],
  );

  const deleteSession = useCallback(
    (targetSessionId: string) => {
      deleteSessionMutation.mutate({ sessionId: targetSessionId });
    },
    [deleteSessionMutation],
  );

  return {
    messages,
    input,
    isLoading,
    forms,
    activeFormId,
    isStreaming,
    streamedContent,
    streamError,
    showJsonModal,
    activeForm,
    messagesEndRef,
    streamingRef,
    setInput,
    setActiveFormId,
    setStreamedContent,
    setStreamError,
    setShowJsonModal,
    handleSend,
    handleUseForm,
    isUsingForm,
    attachedForm,
    detachAttachedForm,
    processInitialPrompt,
    scrollToBottom,
    scrollStreamingToBottom,
    handleStopGeneration,
    sessions: sessionsQuery.data?.sessions ?? [],
    sessionId,
    startNewChat,
    openSession,
    deleteSession,
    isDeletingSession: deleteSessionMutation.isPending,
    isHydratingHistory: historyQuery.isFetching,
    retryLastSend,
  };
}
