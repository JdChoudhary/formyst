import { useEffect, useMemo, useRef, useState } from "react";
import { useFormProgress } from "@/hooks/form-progress";
// import { usePrepopulation } from "@/hooks/prepopulation/usePrepopulation";
import { toast } from "@/hooks/use-toast";

import {
  computeFieldVisibility,
  extractSubmissionIdentity,
  resolveHiddenValues,
} from "@repo/shared";
import type { FormField, FormSchema } from "@repo/shared/form/form-types";

import { getLocalDuplicateState, recordLocalSubmission } from "@/lib/forms/duplicate-prevention";
import { calculateQuizScore, type QuizResult } from "@/lib/quiz/scoring";
import type { SingleStepFormActions, SingleStepFormState } from "../types";

import { submitSingleStepForm, validateSingleStepForm } from "../utils/form-utils";

const getDefaultValueForField = (field: FormField): any => {
  switch (field.type) {
    case "checkbox":
    case "ranking":
    case "file_upload":
      return [];
    case "multiple_choice":
    case "dropdown":
    case "picture_choice":
    case "number":
    case "date":
    case "signature":
      return "";
    case "rating":
    case "nps":
    case "opinion_scale":
    case "yes_no":
      return null;
    case "matrix":
    case "contact_info":
    case "payment":
    case "group":
      return {};
    case "short_text":
    case "long_text":
    case "email":
    case "phone_number":
    case "website":
    default:
      return "";
  }
};

/** Shallow value comparison for the small hidden-value maps. */
const shallowEqualValues = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

const initializeFormData = (fields: FormField[]): Record<string, any> => {
  const formData: Record<string, any> = {};

  fields.forEach((field) => {
    formData[field.ref ?? ""] = getDefaultValueForField(field);
  });

  return formData;
};

export const useSingleStepForm = (
  formId: string,
  schema: FormSchema,
  fields: FormField[],
): SingleStepFormState &
  SingleStepFormActions & {
    fieldVisibility: Record<string, { visible: boolean; disabled: boolean }>;
    logicMessages: string[];
    requiredOverrides: Record<string, boolean>;
    variables: Record<string, unknown>;
    hidden: Record<string, unknown>;
  } => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult | null>(null);
  const [lastFieldId, setLastFieldId] = useState<string | null>(null);
  const isLoadingProgressRef = useRef(true);
  const [duplicateError, setDuplicateError] = useState<{
    message: string;
    timeRemaining?: number;
    attemptsRemaining?: number;
  } | null>(null);
  const [hidden, setHidden] = useState<Record<string, unknown>>({});
  const initializedFieldsRef = useRef<Set<string>>(new Set());
  const lastFieldIdRef = useRef<string | null>(null);
  /** True while the duplicate banner was set by the local (localStorage) guard. */
  const localDuplicateBlockRef = useRef(false);

  const {
    progress,
    loading: progressLoading,
    saving: progressSaving,
    error: progressError,
    saveProgress,
    saveNow,
    loadProgress,
    clearProgress,
    recordEvent,
    flushEvents,
    sessionId,
  } = useFormProgress(formId, fields.length, {
    enabled: true,
    storage: "server",
    autoSaveInterval: 3000,
    retentionDays: 7,
  });

  // const {
  // 	prepopulatedData,
  // 	loading: prepopLoading,
  // 	errors: prepopErrors,
  // } = usePrepopulation(fields);

  useEffect(() => {
    const currentFieldRefs = new Set(fields.map((field) => field.ref ?? ""));
    const newFieldRefs = [...currentFieldRefs].filter(
      (ref) => !initializedFieldsRef.current.has(ref),
    );

    if (newFieldRefs.length > 0) {
      setFormData((prevFormData) => {
        const newFormData = { ...prevFormData };
        fields.forEach((field) => {
          const ref = field.ref ?? "";
          if (newFieldRefs.includes(ref)) {
            newFormData[ref] = getDefaultValueForField(field);
          }
        });
        return newFormData;
      });

      newFieldRefs.forEach((ref) => initializedFieldsRef.current.add(ref));
    }
  }, [fields]);

  useEffect(() => {
    if (isLoadingProgressRef.current && progress?.formData) {
      queueMicrotask(() => {
        setFormData((prevFormData) => ({
          ...prevFormData,
          ...progress.formData,
        }));
        isLoadingProgressRef.current = false;
      });
    }
  }, [progress]);

  const hasTriedLoadingRef = useRef(false);
  useEffect(() => {
    if (formId && !progress && !hasTriedLoadingRef.current) {
      hasTriedLoadingRef.current = true;
      loadProgress();
    }
  }, [formId, progress, loadProgress]);

  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      const filledFields = Object.values(formData).filter(
        (value) =>
          value !== "" &&
          value !== null &&
          value !== undefined &&
          !(Array.isArray(value) && value.length === 0),
      ).length;

      if (filledFields > 0) {
        saveProgress(formData, 0, 1, lastFieldIdRef.current);
      }
    }
  }, [formData, saveProgress]);

  // Resolve hidden field values from URL params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    const nextHidden = resolveHiddenValues(schema, params);
    queueMicrotask(() => {
      // Keep the previous reference when nothing actually changed — a fresh
      // object on every run would re-render, and any effect keyed on `hidden`
      // would then re-run, which can loop forever.
      setHidden((previous) =>
        shallowEqualValues(previous, nextHidden) ? previous : nextHidden,
      );
      setFormData((previous) => {
        const next = { ...previous };
        let changed = false;

        for (const field of fields) {
          const ref = field.ref ?? "";
          const prepopulation = (
            field as FormField & {
              prepopulation?: {
                enabled?: boolean;
                source?: string;
                config?: { urlParam?: string; overwriteExisting?: boolean };
              };
            }
          ).prepopulation;
          if (
            !prepopulation?.enabled ||
            prepopulation.source !== "url" ||
            nextHidden[ref] === undefined
          ) {
            continue;
          }

          const current = next[ref];
          const isEmpty =
            current === undefined ||
            current === null ||
            current === "" ||
            (Array.isArray(current) && current.length === 0);
          if (isEmpty || prepopulation.config?.overwriteExisting) {
            next[ref] = nextHidden[ref];
            changed = true;
          }
        }

        return changed ? next : previous;
      });
    });
  }, [schema, fields]);

  // Local duplicate guard — mirrors the server's duplicate-prevention policy
  // using this browser's recorded submissions, so a returning respondent sees
  // the notice before filling the form in again. The server stays
  // authoritative; this only avoids a wasted attempt.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const duplicatePrevention = (schema.settings as any)?.duplicatePrevention;
    const state = getLocalDuplicateState(
      formId,
      duplicatePrevention,
      extractSubmissionIdentity(schema, { ...formData, ...hidden }),
    );
    if (state.blocked && state.message) {
      localDuplicateBlockRef.current = true;
      setDuplicateError({ message: state.message, timeRemaining: state.timeRemaining });
    } else if (localDuplicateBlockRef.current) {
      localDuplicateBlockRef.current = false;
      setDuplicateError(null);
    }
  }, [schema, formId, formData, hidden]);

  const logicResult = useMemo(
    () => computeFieldVisibility(schema, formData, hidden, {}),
    [schema, formData, hidden],
  );
  const fieldVisibility = logicResult.visibility;
  const logicMessages = logicResult.logicMessages;

  const handleFieldValueChange = (fieldRef: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldRef]: value }));
    lastFieldIdRef.current = fieldRef;
    setLastFieldId(fieldRef);
    recordEvent({ fieldId: fieldRef, eventType: "change", value });
    if (errors[fieldRef]) {
      setErrors((prev) => ({ ...prev, [fieldRef]: "" }));
    }
  };

  const recordFieldFocus = (fieldRef: string) => {
    recordEvent({ fieldId: fieldRef, eventType: "focus" });
  };

  const recordFieldView = (fieldRef: string) => {
    recordEvent({ fieldId: fieldRef, eventType: "view" });
  };

  const recordFieldBlur = (fieldRef: string, timeSpentMs: number) => {
    recordEvent({ fieldId: fieldRef, eventType: "blur", timeSpentMs });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const botTrap = (e.currentTarget.elements.namedItem("__bot_trap") as HTMLInputElement | null)
      ?.value;

    // Apply required overrides from logic rules before validation
    const effectiveFields = fields.map((field) => {
      const ref = field.ref ?? "";
      if (ref in logicResult.requiredOverrides) {
        return {
          ...field,
          validations: {
            ...field.validations,
            required: logicResult.requiredOverrides[ref],
          },
        };
      }
      return field;
    });
    const { errors: validationErrors, isValid } = validateSingleStepForm(effectiveFields, formData);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setDuplicateError(null);

    try {
      const result = await submitSingleStepForm(formId, formData, {
        submissionData: botTrap ? { ...formData, __bot_trap: botTrap } : formData,
        sessionId,
        lastFieldId: lastFieldIdRef.current,
        lastStepReached: 0,
        events: flushEvents(),
      });

      if (result.success) {
        const quizSettings = (schema.settings as any)?.quiz;
        if (quizSettings?.enabled) {
          const quizResult = calculateQuizScore(schema, formData);
          setQuizResults(quizResult);
        }

        // Remember this browser's submission for the local duplicate guard.
        recordLocalSubmission(formId, schema, { ...formData, ...hidden });

        setSubmitted(true);
        toast.success("Form submitted successfully!");

        clearProgress();

        const shouldShowQuizResults =
          quizSettings?.enabled &&
          (quizSettings?.showScore !== false || quizSettings?.showCorrectAnswers !== false);

        if (schema.settings?.redirect_after_submit_url && !shouldShowQuizResults) {
          setTimeout(() => {
            window.location.href = `${schema.settings!.redirect_after_submit_url}?ref=ikiform`;
          }, 2000);
        }
      } else if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
        // Server-side validation rejected the submission — highlight the fields.
        setErrors(result.fieldErrors);
        toast.error("Please fix the highlighted fields and try again.");
      } else if (result.error === "Bot detected") {
        toast.error(result.message || "Bot detected. Access denied.");
      } else if (result.error === "Duplicate submission detected") {
        setDuplicateError({
          message: result.message || "You have already submitted this form.",
          timeRemaining: result.timeRemaining,
          attemptsRemaining: result.attemptsRemaining,
        });
      } else if (result.error === "Rate limit exceeded") {
        toast.error(result.message || "Too many requests. Please try again later.");
      } else if (result.error === "Response limit reached") {
        toast.error(result.message || "This form is no longer accepting responses.");
      } else if (result.error === "Content validation failed") {
        toast.error(result.message || "Your submission contains inappropriate content.");
      } else {
        toast.error(result.message || "Failed to submit form");
      }
    } catch (error: any) {
      if (error?.error === "Bot detected") {
        toast.error(error.message || "Bot detected. Access denied.");
      } else if (error?.error === "Duplicate submission detected") {
        setDuplicateError({
          message: error.message || "You have already submitted this form.",
          timeRemaining: error.timeRemaining,
          attemptsRemaining: error.attemptsRemaining,
        });
      } else if (error?.error === "Rate limit exceeded") {
        toast.error(error.message || "Too many requests. Please try again later.");
      } else if (error?.error === "Response limit reached") {
        toast.error(error.message || "This form is no longer accepting responses.");
      } else if (error?.error === "Content validation failed") {
        toast.error(error.message || "Your submission contains inappropriate content.");
      } else {
        toast.error("Failed to submit form. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    submitting,
    submitted,
    duplicateError,
    setFormData,
    setErrors,
    setSubmitting,
    setSubmitted,
    handleFieldValueChange,
    handleSubmit,
    fieldVisibility,
    logicMessages,
    requiredOverrides: logicResult.requiredOverrides,
    variables: logicResult.variables,
    hidden,
    quizResults,

    progress,
    progressLoading,
    progressSaving,
    progressError,
    offline: progress?.offline ?? false,
    saveNow,
    clearProgress,
    lastFieldId,
    recordFieldFocus,
    recordFieldBlur,
    recordFieldView,
  };
};
