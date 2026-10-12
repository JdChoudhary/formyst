import type { FormSchema as FormSchemaData } from "@repo/shared";

/**
 * A form produced during an AI builder session. `schema` is a full, canonical
 * FormSchema ready to be previewed or imported into the form builder.
 */
export interface FormSchema {
  id: string;
  prompt: string;
  schema: FormSchemaData;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Present on assistant messages that produced a form schema. */
  schema?: FormSchemaData | null;
}

export interface ChatSuggestion {
  text: string;
  icon: React.ReactNode;
}

/**
 * A form handed to the chat from the builder ("Use Kiko AI"). It is surfaced
 * as an attachment on the conversation and sent as context with each message.
 */
export interface AttachedForm {
  /** The saved form it came from, or `null` for a new, unsaved form. */
  formId: string | null;
  title: string;
}

/** A persisted conversation, as listed by `aiBuilder.listSessions`. */
export interface ChatSession {
  id: string;
  title: string | null;
  /** ISO string over the wire; `Date` in server-side callers. */
  createdAt: Date | string;
  updatedAt: Date | string;
  messageCount: number;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamedContent: string;
  streamError: string | null;
  showSuggestions: boolean;
  suggestions: ChatSuggestion[];
  setInput: (value: string) => void;
  input: string;
  handleSend: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Abort the in-flight generation. */
  handleStopGeneration: () => void;
  /** Re-send after an error or a stop. */
  retryLastSend: () => void;
  setShowSuggestions: (visible: boolean) => void;
  setStreamedContent: (value: string) => void;
  setStreamError: (value: string | null) => void;
  streamingRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  mounted: boolean;
  /** Saved conversations, newest activity first. */
  sessions: ChatSession[];
  /** The conversation currently open (null before the first message). */
  sessionId: string | null;
  /** Start a brand-new conversation. */
  startNewChat: () => void;
  /** Open a saved conversation by id. */
  openSession: (sessionId: string) => void;
  /** Permanently delete a saved conversation. */
  deleteSession: (sessionId: string) => void;
  isDeletingSession: boolean;
  /** True while a saved conversation's history is being fetched. */
  isHydratingHistory: boolean;
  /** The form attached from the builder, shown above the composer. */
  attachedForm: AttachedForm | null;
  /** Detach the form so it stops being sent as context. */
  onDetachForm: () => void;
}

export interface PreviewPanelProps {
  forms: FormSchema[];
  activeFormId: string | null;
  setActiveFormId: (id: string) => void;
  router: { push: (href: string) => void };
  setShowJsonModal: (show: boolean) => void;
  activeForm: FormSchema | undefined;
  /**
   * Hand the previewed form back to the builder and return the route to open.
   * Replaces the form the chat started from, or loads an unsaved draft.
   */
  onUseForm: (form: FormSchema | undefined) => Promise<{ route: string } | null>;
  /** True while "Use this form" is writing the form back. */
  isUsingForm: boolean;
}
