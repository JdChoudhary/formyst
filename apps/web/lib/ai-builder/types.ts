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
}

export interface PreviewPanelProps {
  forms: FormSchema[];
  activeFormId: string | null;
  setActiveFormId: (id: string) => void;
  router: { push: (href: string) => void };
  setShowJsonModal: (show: boolean) => void;
  activeForm: FormSchema | undefined;
}
