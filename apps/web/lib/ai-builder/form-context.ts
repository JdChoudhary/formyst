import type { FormSchema as FormSchemaData } from "@repo/shared";

/**
 * Handoff payload written by the form builder when the user opens Kiko AI, and
 * read by the AI builder so the form currently being edited becomes the
 * starting point of the conversation.
 */
export interface AIBuilderFormContext {
  /** The saved form the chat was launched from, or `null` for a new form. */
  formId: string | null;
  /** The form exactly as it exists in the builder, including unsaved edits. */
  schema: FormSchemaData;
}

/** localStorage key for the one-shot form-builder → AI-builder handoff. */
export const AI_BUILDER_FORM_CONTEXT_KEY = "aiBuilderFormContext";

export function writeAIBuilderFormContext(context: AIBuilderFormContext): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_BUILDER_FORM_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Storage can be unavailable (private mode) — the AI builder then simply
    // opens without a form in context.
  }
}

export function readAIBuilderFormContext(): AIBuilderFormContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_BUILDER_FORM_CONTEXT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AIBuilderFormContext> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.schema) return null;

    return {
      formId: typeof parsed.formId === "string" ? parsed.formId : null,
      schema: parsed.schema as FormSchemaData,
    };
  } catch {
    return null;
  }
}

export function clearAIBuilderFormContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AI_BUILDER_FORM_CONTEXT_KEY);
  } catch {
    // Nothing to clean up — the read path tolerates a missing value.
  }
}
