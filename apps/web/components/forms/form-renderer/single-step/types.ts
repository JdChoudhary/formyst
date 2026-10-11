import type { FormSchema } from "@repo/shared/form/form-types";
import type { FormProgress } from "@/lib/form-progress/types";
import type { QuizResult } from "@/lib/quiz/scoring";

export interface PublicFormProps {
  formId: string;
  schema: FormSchema;
  theme?: string;
}

export interface SingleStepFormState {
  formData: Record<string, any>;
  errors: Record<string, string>;
  submitting: boolean;
  submitted: boolean;
  quizResults: QuizResult | null;
  duplicateError: {
    message: string;
    timeRemaining?: number;
    attemptsRemaining?: number;
  } | null;

  /** Hidden field values resolved from URL parameters (keyed by field ref). */
  hidden: Record<string, unknown>;

  progress: FormProgress | null;
  progressLoading: boolean;
  progressSaving: boolean;
  progressError: string | null;
  offline: boolean;
}

export interface SingleStepFormActions {
  setFormData: (data: Record<string, any>) => void;
  setErrors: (errors: Record<string, string>) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmitted: (submitted: boolean) => void;
  handleFieldValueChange: (fieldId: string, value: any) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  clearProgress: () => Promise<void>;
  saveNow: (
    formData: Record<string, any>,
    currentStep?: number,
    totalSteps?: number,
    lastFieldId?: string | null,
  ) => Promise<void>;
  lastFieldId: string | null;
  recordFieldFocus: (fieldId: string) => void;
  recordFieldBlur: (fieldId: string, timeSpentMs: number) => void;
  recordFieldView: (fieldId: string) => void;
}
