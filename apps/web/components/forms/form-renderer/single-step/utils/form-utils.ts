import { getFields, normalizeFormSchemaSafe, validateSubmission } from "@repo/shared";
import type { FormField, FormSchema } from "@repo/shared/form/form-types";

import { parseFieldErrors } from "@/lib/forms/submission-errors";

/** Flat, ordered field list. */
export const getAllFields = (schema: FormSchema): FormField[] => {
  const v2 = normalizeFormSchemaSafe(schema);
  return v2 ? getFields(v2) : [];
};

/** Uses the shared validator — identical logic to the server. */
export const validateSingleStepForm = (
  fields: FormField[],
  formData: Record<string, any>,
): { errors: Record<string, string>; isValid: boolean } => {
  // The shared validator works off the full schema; emulate by passing a
  // minimal valid schema carrying the given fields.
  const pseudoSchema = { title: "form", fields } as FormSchema;
  const result = validateSubmission(pseudoSchema, formData);
  // Only surface errors for the fields we were given (draft/partial renders).
  const errors: Record<string, string> = {};
  const fieldRefs = new Set(fields.map((field) => field.ref ?? ""));
  for (const [fieldId, message] of Object.entries(result.errors)) {
    if (fieldRefs.has(fieldId)) errors[fieldId] = message;
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
};

export const submitSingleStepForm = async (
  formId: string,
  formData: Record<string, any>,
  meta?: {
    submissionData?: Record<string, any>;
    sessionId?: string | null;
    lastFieldId?: string | null;
    lastStepReached?: number;
    events?: Array<{
      fieldId?: string | null;
      eventType: "view" | "focus" | "blur" | "change" | "step";
      value?: unknown;
      timeSpentMs?: number;
    }>;
  },
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  timeRemaining?: number;
  attemptsRemaining?: number;
}> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    const response = await fetch(`/api/forms/${formId}/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        submissionData: meta?.submissionData ?? formData,
        sessionId: meta?.sessionId ?? undefined,
        lastFieldId: meta?.lastFieldId ?? null,
        lastStepReached: meta?.lastStepReached ?? 0,
        events: meta?.events ?? [],
        httpHeaders: {
          cookie: typeof document !== "undefined" ? document.cookie : "",
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const fieldErrors = parseFieldErrors(result);

      return {
        success: false,
        message: result.message || "Failed to submit form",
        error: result.error,
        fieldErrors,
        timeRemaining: result.timeRemaining,
        attemptsRemaining: result.attemptsRemaining,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error submitting form:", error);
    return {
      success: false,
      message: "Failed to submit form. Please try again.",
    };
  }
};
