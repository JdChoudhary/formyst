"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FormFieldRenderer } from "@/components/form-builder/form-field-renderer";
import { getLivePatternError } from "@/components/form-builder/form-field-renderer/components/text-input-field";
import { Separator } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useFormStyling } from "@/hooks/use-form-styling";
import type { FormField, FormSchema } from "@repo/shared/form/form-types";
import { getPublicFormTitle } from "@/lib/utils/form-utils";
import { interpolateRecall } from "@repo/shared";
import { DuplicateSubmissionError } from "./duplicate-submission-error";

interface SingleStepFormContentProps {
  formId: string;
  schema: FormSchema;
  fields: FormField[];
  formData: Record<string, any>;
  errors: Record<string, string>;
  submitting: boolean;
  onFieldValueChange: (fieldRef: string, value: any) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  fieldVisibility?: Record<string, { visible: boolean; disabled: boolean }>;
  logicMessages?: string[];
  duplicateError?: {
    message: string;
    timeRemaining?: number;
    attemptsRemaining?: number;
  } | null;
  onFieldFocus?: (fieldRef: string) => void;
  onFieldBlur?: (fieldRef: string, timeSpentMs: number) => void;
  onFieldView?: (fieldRef: string) => void;
  requiredOverrides?: Record<string, boolean>;
  variables?: Record<string, unknown>;
  /** Hidden field values resolved from URL parameters (keyed by field ref). */
  hidden?: Record<string, unknown>;
  showMultiStepNav?: boolean;
  isLastPage?: boolean;
  onNext?: () => void;
  onBack?: () => void;
  showAttachment?: boolean;
  /** Multi-step: "Step 2 of 4" — replaces the form title at the top. */
  stepLabel?: string;
  /** Multi-step: the current step's name. */
  stepTitle?: string;
}

export const SingleStepFormContent: React.FC<SingleStepFormContentProps> = ({
  formId,
  schema,
  fields,
  formData,
  errors,
  submitting,
  onFieldValueChange,
  onSubmit,
  fieldVisibility,
  logicMessages,
  duplicateError,
  onFieldFocus,
  onFieldBlur,
  onFieldView,
  showMultiStepNav = false,
  isLastPage = true,
  onNext,
  onBack,
  showAttachment = false,
  stepLabel,
  stepTitle,
  requiredOverrides,
  variables: logicVariables,
  hidden: hiddenValues,
}) => {
  const firstFieldRef = useRef<any>(null);
  const focusStartRef = useRef<Record<string, number>>({});
  const viewedRef = useRef<Set<string>>(new Set());
  const { customStyles, getButtonStyles } = useFormStyling(schema);

  const visibleFields = fieldVisibility
    ? fields.filter((field) => fieldVisibility[field.ref ?? ""]?.visible !== false)
    : fields;

  const handleFieldFocus = (fieldRef: string) => {
    focusStartRef.current[fieldRef] = Date.now();
    onFieldFocus?.(fieldRef);
  };

  const handleFieldBlur = (fieldRef: string) => {
    const start = focusStartRef.current[fieldRef];
    if (start !== undefined) {
      onFieldBlur?.(fieldRef, Date.now() - start);
      delete focusStartRef.current[fieldRef];
    }
  };

  // Record a "view" event the first time each visible field is rendered.
  useEffect(() => {
    visibleFields.forEach((field) => {
      const ref = field.ref ?? "";
      if (!viewedRef.current.has(ref)) {
        viewedRef.current.add(ref);
        onFieldView?.(ref);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const meta = schema.settings?.meta;

  return (
    <div className="flex flex-col gap-5">
      {/* Form header — multi-step shows the step number and name instead */}
      <div className="flex flex-col gap-2">
        {stepLabel && (
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            {stepLabel}
          </p>
        )}
        <h1
          className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl"
          style={customStyles.headingStyle}
        >
          {interpolateRecall(
            stepTitle || getPublicFormTitle(schema),
            schema,
            formData,
            logicVariables ?? {},
            hiddenValues ?? {},
          )}
        </h1>
        {meta?.description && (
          <p
            className="text-base leading-relaxed text-muted-foreground"
            style={customStyles.textStyle}
          >
            {interpolateRecall(
              meta.description,
              schema,
              formData,
              logicVariables ?? {},
              hiddenValues ?? {},
            )}
          </p>
        )}
        <Separator className="mt-2" />
      </div>

      {/* Logic messages */}
      {logicMessages && logicMessages.length > 0 && (
        <div className="rounded-md border-yellow-400 border-l-4 bg-yellow-50 p-3 text-sm text-yellow-800">
          {logicMessages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}

      {/* Form fields */}
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <input
          aria-hidden="true"
          autoComplete="off"
          className="absolute -left-[9999px] h-px w-px opacity-0"
          name="__bot_trap"
          tabIndex={-1}
          type="text"
        />
        {duplicateError && (
          <DuplicateSubmissionError
            attemptsRemaining={duplicateError.attemptsRemaining}
            message={duplicateError.message}
            onRetry={() => window.location.reload()}
            timeRemaining={duplicateError.timeRemaining}
          />
        )}

        {visibleFields.map((field, idx) => {
          const ref = field.ref ?? "";
          // Apply required overrides from logic rules
          const effectiveField =
            requiredOverrides && ref in requiredOverrides
              ? {
                  ...field,
                  validations: {
                    ...field.validations,
                    required: requiredOverrides[ref],
                  },
                }
              : field;
          return (
            <div
              className="transition-opacity duration-200"
              key={ref}
              onBlurCapture={() => handleFieldBlur(ref)}
              onFocusCapture={() => handleFieldFocus(ref)}
              style={fieldVisibility?.[ref]?.disabled ? { opacity: 0.5 } : {}}
            >
              <FormFieldRenderer
                disabled={fieldVisibility?.[ref]?.disabled}
                error={errors[ref]}
                field={effectiveField}
                fieldRef={idx === 0 ? firstFieldRef : undefined}
                formId={formId}
                onChange={(value) => onFieldValueChange(ref, value)}
                recallContext={{
                  answers: formData,
                  variables: logicVariables ?? {},
                  hidden: hiddenValues ?? {},
                  schema,
                }}
                showAttachment={showAttachment}
                value={formData[ref]}
              />
            </div>
          );
        })}

        {/* Pattern validation errors */}
        {(() => {
          for (const field of visibleFields) {
            const ref = field.ref ?? "";
            if (
              ["short_text", "long_text", "email"].includes(field.type) &&
              getLivePatternError(field as any, formData[ref])
            ) {
              return (
                <div className="text-destructive text-xs">
                  Please fix the highlighted errors before submitting.
                </div>
              );
            }
          }
          return null;
        })()}

        {/* Navigation / Submit */}
        {showMultiStepNav ? (
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              className="gap-2 text-muted-foreground"
              disabled={!onBack}
              onClick={onBack}
              type="button"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {isLastPage ? (
              <Button
                className="px-6 py-5 text-sm font-medium shadow-md transition-all hover:shadow-lg sm:w-auto"
                disabled={
                  submitting ||
                  visibleFields.some(
                    (field) =>
                      ["short_text", "long_text", "email"].includes(field.type) &&
                      getLivePatternError(field as any, formData[field.ref ?? ""]),
                  )
                }
                loading={submitting}
                style={getButtonStyles(true)}
                type="submit"
              >
                Submit
              </Button>
            ) : (
              <Button
                className="gap-2 px-6 py-5 text-sm font-medium shadow-md transition-all hover:shadow-lg sm:w-auto"
                onClick={onNext}
                style={getButtonStyles(true)}
                type="button"
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <Button
              className="px-6 py-5 text-sm font-medium shadow-md transition-all hover:shadow-lg sm:w-auto"
              disabled={
                submitting ||
                visibleFields.some(
                  (field) =>
                    ["short_text", "long_text", "email"].includes(field.type) &&
                    getLivePatternError(field as any, formData[field.ref ?? ""]),
                )
              }
              loading={submitting}
              style={getButtonStyles(true)}
              type="submit"
            >
              Submit
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
