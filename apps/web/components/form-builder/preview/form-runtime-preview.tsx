"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  computeFieldVisibility,
  computeFlow,
  getDefaultThankyou,
  getWelcomeScreen,
  interpolateRecall,
  resolveHiddenValues,
} from "@repo/shared";
import type { FormField, FormSchema } from "@repo/shared";
import { FormFieldRenderer } from "@/components/form-builder/form-field-renderer";
import { AttachmentMedia } from "@/components/form-builder/form-field-renderer/components/attachment-media";
import { SingleStepFormContent } from "@/components/forms/form-renderer/single-step/components/single-step-form-content";
import { validateSingleStepForm } from "@/components/forms/form-renderer/single-step/utils/form-utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormBrandingFooter } from "@/components/form-branding/form-branding-footer";
import { FormBrandingLogo } from "@/components/form-branding/form-branding-logo";
import { useFormStyling } from "@/hooks/use-form-styling";
import { getFormLayoutClasses } from "@/lib/utils/form-layout";
import { getAllFields } from "@/components/forms/form-renderer/single-step/utils/form-utils";
import { cn } from "@/lib/utils";

/**
 * Interactive respondent preview with fully isolated local state.
 *
 * Never calls the production submission endpoint — submitting only flips a
 * local `submitted` flag. Reuses the actual field renderer, the classic
 * single-step form content component, the shared validator and the shared
 * flow/logic helpers so the preview matches the real experience.
 */
interface FormRuntimePreviewProps {
  schema: FormSchema;
  formId?: string;
  /** Called when the preview should restart (e.g. "Submit another response"). */
  onPreviewRestart?: () => void;
  /** Skip the welcome screen and start directly with fields. */
  skipWelcome?: boolean;
  /** Highlight the field with this ref as the currently selected field. */
  selectedFieldRef?: string | null;
  /** Use the normalized public-form field behavior in the preview modal. */
  publicExperience?: boolean;
}

const CHOICE_LIKE = new Set([
  "multiple_choice",
  "checkbox",
  "dropdown",
  "picture_choice",
  "ranking",
  "yes_no",
  "rating",
  "nps",
  "opinion_scale",
  "date",
]);

const TEXT_LIKE = new Set([
  "short_text",
  "long_text",
  "email",
  "phone_number",
  "website",
  "number",
]);

type Screen = { kind: "welcome" } | { kind: "field"; fieldRef: string } | { kind: "ending" };

export function FormRuntimePreview({
  schema,
  formId = "",
  onPreviewRestart,
  skipWelcome = false,
  selectedFieldRef = null,
  publicExperience = false,
}: FormRuntimePreviewProps) {
  const allFields = useMemo(
    () => (publicExperience ? getAllFields(schema) : (schema.fields ?? [])),
    [schema, publicExperience],
  );
  const fieldByRef = useMemo(() => new Map(allFields.map((f) => [f.ref ?? "", f])), [allFields]);
  const welcomeScreen = getWelcomeScreen(schema);
  const thankyou = getDefaultThankyou(schema);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Record<string, unknown>>({});
  const [started, setStarted] = useState(!welcomeScreen || skipWelcome);
  const [screenIndex, setScreenIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState(1);
  const lastRef = useRef<string | null>(null);

  const { customStyles, fontLoaded, getFormClasses, getButtonStyles } = useFormStyling(schema);

  /* ---- value change ---- */
  const handleChange = useCallback((fieldRef: string, value: unknown) => {
    lastRef.current = fieldRef;
    setAnswers((prev) => ({ ...prev, [fieldRef]: value }));
    setErrors((prev) => (prev[fieldRef] ? { ...prev, [fieldRef]: "" } : prev));
  }, []);

  /* ---- hidden fields from URL params (matches the public renderers) ---- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    setHidden(resolveHiddenValues(schema, params));
  }, [schema]);

  useEffect(() => {
    if (Object.keys(hidden).length === 0) return;
    setAnswers((previous) => {
      const next = { ...previous };
      let changed = false;
      for (const field of allFields) {
        const ref = field.ref ?? "";
        const prepopulation = (
          field as FormField & {
            prepopulation?: {
              enabled?: boolean;
              source?: string;
              config?: { overwriteExisting?: boolean };
            };
          }
        ).prepopulation;
        if (
          !prepopulation?.enabled ||
          prepopulation.source !== "url" ||
          hidden[ref] === undefined
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
          next[ref] = hidden[ref];
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [allFields, hidden]);

  /* ---- conversational flow ---- */
  const flow = useMemo(() => computeFlow(schema, answers, hidden, {}), [schema, answers, hidden]);
  const classicLogic = useMemo(
    () =>
      publicExperience
        ? computeFieldVisibility(schema, answers, hidden, {})
        : { visibility: undefined, requiredOverrides: {}, logicMessages: [] },
    [schema, answers, hidden, publicExperience],
  );

  const screens = useMemo<Screen[]>(() => {
    const list: Screen[] = [];
    if (welcomeScreen) list.push({ kind: "welcome" });
    for (const ref of flow.visibleFieldRefs) list.push({ kind: "field", fieldRef: ref });
    list.push({ kind: "ending" });
    return list;
  }, [welcomeScreen, flow.visibleFieldRefs]);

  /* ---- classic pagination ---- */
  const groups = useMemo(() => schema.groups ?? [], [schema.groups]);
  const classicMultiStep = groups.length > 1;
  const pages = useMemo(() => {
    if (!classicMultiStep) return null;
    return groups.map((group) => ({
      id: group.id,
      title: group.title ?? "",
      fields: allFields.filter((f) => group.fieldIds?.includes(f.ref ?? "")),
    }));
  }, [classicMultiStep, groups, allFields]);

  const currentPageFields = pages ? (pages[screenIndex]?.fields ?? []) : allFields;
  const visibleFields = classicMultiStep ? currentPageFields : allFields;

  const progressPct = useMemo(() => {
    if (classicMultiStep && pages) {
      return Math.min(100, Math.round(((screenIndex + 1) / pages.length) * 100));
    }
    const questions = allFields.filter((f) => f.type !== "statement");
    if (questions.length === 0) return 100;
    const answered = questions.filter((f) => {
      const v = answers[f.ref ?? ""];
      return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
    }).length;
    return Math.min(100, Math.round((answered / questions.length) * 100));
  }, [classicMultiStep, pages, screenIndex, allFields, answers]);

  /* ---- submission (local only) ---- */
  const submitLocally = useCallback(
    (fields: FormField[]) => {
      const { errors: validationErrors, isValid } = validateSingleStepForm(fields, answers);
      if (!isValid) {
        setErrors(validationErrors);
        return false;
      }
      setErrors({});
      setSubmitted(true);
      return true;
    },
    [answers],
  );

  /* ---- conversational navigation ---- */
  const goNext = useCallback(() => {
    const screen = screens[Math.min(screenIndex, screens.length - 1)];
    if (screen?.kind === "field") {
      const field = fieldByRef.get(screen.fieldRef);
      if (field && field.type !== "statement") {
        const { errors: fieldErrors } = validateSingleStepForm([field], answers);
        if (fieldErrors[field.ref ?? ""]) {
          setErrors(fieldErrors);
          return;
        }
      }
    }
    setErrors({});
    if (screen?.kind === "field" && screenIndex >= screens.length - 2) {
      // Last question → submit
      submitLocally(
        flow.visibleFieldRefs
          .map((ref) => fieldByRef.get(ref))
          .filter((f): f is FormField => !!f && f.type !== "statement"),
      );
      return;
    }
    if (screenIndex < screens.length - 1) {
      setDirection(1);
      setScreenIndex((i) => Math.min(i + 1, screens.length - 1));
    }
  }, [screens, screenIndex, fieldByRef, answers, flow.visibleFieldRefs, submitLocally]);

  const goBack = useCallback(() => {
    if (screenIndex > 0) {
      setDirection(-1);
      setScreenIndex((i) => i - 1);
    }
  }, [screenIndex]);

  /* ---- Enter key navigation ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (submitted) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          goNext();
        }
        return;
      }
      if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submitted, goNext, goBack]);

  if (!fontLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Progress className="h-1 w-40" value={40} />
      </div>
    );
  }

  const containerStyle = {
    ...customStyles.containerStyle,
    backgroundImage: undefined,
    backgroundSize: undefined,
    backgroundPosition: undefined,
    backgroundRepeat: undefined,
    backgroundAttachment: undefined,
  };
  const { maxWidth, width, margin, textAlign, ...viewportStyle } = containerStyle;
  const contentStyle = { maxWidth, width, margin, textAlign };

  /* ================= ENDING / SUBMITTED ================= */
  if (submitted) {
    return (
      <ScrollArea className="h-full w-full">
        <div
          className={cn(
            "flex min-h-full w-full items-center justify-center bg-white px-4 py-8",
            getFormClasses(),
          )}
          style={viewportStyle}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full flex-col items-center gap-5 text-center"
            initial={{ opacity: 0, scale: 0.92 }}
            style={contentStyle}
            transition={{ duration: 0.35 }}
          >
            <FormBrandingLogo mode="conversational" schema={schema} screen="ending" />
            <motion.div
              animate={{ scale: 1 }}
              className="flex size-16 items-center justify-center rounded-full bg-primary/10"
              initial={{ scale: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
            >
              <Check className="size-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight" style={customStyles.headingStyle}>
              {interpolateRecall(thankyou?.title ?? "Thank you!", schema, answers, {}, hidden)}
            </h1>
            {thankyou?.properties?.show_button !== false && thankyou?.properties?.button_text && (
              <Button
                className="h-11 px-8"
                onClick={onPreviewRestart}
                style={getButtonStyles(true)}
                type="button"
              >
                {thankyou.properties.button_text}
              </Button>
            )}
          </motion.div>
        </div>
      </ScrollArea>
    );
  }

  /* ================= WELCOME (both modes) ================= */
  if (!started && welcomeScreen) {
    const welcomeProps = welcomeScreen.properties ?? {};
    return (
      <ScrollArea className="h-full w-full">
        <div
          className={cn(
            "flex min-h-full w-full items-center justify-center px-4 py-8",
            getFormClasses(),
          )}
          style={viewportStyle}
        >
          <div className="flex w-full flex-col items-center gap-6 text-center" style={contentStyle}>
            <FormBrandingLogo mode="conversational" schema={schema} screen="welcome" />
            {welcomeScreen.attachment?.href && (
              <AttachmentMedia
                attachment={welcomeScreen.attachment}
                className="max-h-40 w-auto rounded-xl"
              />
            )}
            <div className="flex flex-col items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight" style={customStyles.headingStyle}>
                {interpolateRecall(welcomeScreen.title, schema, answers, {}, hidden)}
              </h1>
              {welcomeProps.description && (
                <p className="max-w-md text-muted-foreground" style={customStyles.textStyle}>
                  {interpolateRecall(welcomeProps.description, schema, answers, {}, hidden)}
                </p>
              )}
            </div>
            {welcomeProps.show_button !== false && (
              <Button
                className="h-12 px-10 text-base"
                onClick={() => {
                  setStarted(true);
                  setScreenIndex(0);
                }}
                style={getButtonStyles(true)}
                type="button"
              >
                {welcomeProps.button_text || "Start"}
                <ChevronRight className="ml-2 size-5" />
              </Button>
            )}
            <FormBrandingFooter className="pt-4" schema={schema} style={customStyles.textStyle} />
          </div>
        </div>
      </ScrollArea>
    );
  }

  /* ================= CLASSIC ================= */
  {
    const { containerClass, marginClass } = getFormLayoutClasses(schema);
    return (
      <ScrollArea className="h-full w-full">
        <div
          className={cn("min-h-full w-full", marginClass, getFormClasses())}
          style={viewportStyle}
        >
          <div
            className={cn("flex flex-col gap-6 px-4 py-6 sm:px-6", containerClass)}
            style={contentStyle}
          >
            {classicMultiStep && schema.settings?.show_progress_bar !== false && pages && (
              <div className="flex items-center gap-3">
                <Progress className="h-2 flex-1" value={progressPct} />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {screenIndex + 1} / {pages.length}
                </span>
              </div>
            )}
            <div
              className="flex w-full grow flex-col gap-6 rounded-xl p-8 shadow-none sm:p-10"
              style={customStyles.cardStyle}
            >
              <div style={customStyles.formStyle}>
                <FormBrandingLogo
                  className="mb-1"
                  mode="classical"
                  pageIndex={screenIndex}
                  schema={schema}
                  screen="question"
                />
                <SingleStepFormContent
                  errors={errors}
                  fields={visibleFields}
                  formData={answers}
                  formId={formId}
                  hidden={hidden}
                  fieldVisibility={publicExperience ? classicLogic.visibility : undefined}
                  logicMessages={publicExperience ? classicLogic.logicMessages : undefined}
                  isLastPage={!classicMultiStep || screenIndex >= (pages?.length ?? 1) - 1}
                  onBack={
                    classicMultiStep && screenIndex > 0
                      ? () => setScreenIndex((i) => Math.max(0, i - 1))
                      : undefined
                  }
                  onFieldValueChange={handleChange}
                  onNext={
                    classicMultiStep
                      ? () => {
                          const { errors: pageErrors, isValid } = validateSingleStepForm(
                            currentPageFields,
                            answers,
                          );
                          if (!isValid) {
                            setErrors(pageErrors);
                            return;
                          }
                          setErrors({});
                          setScreenIndex((i) => Math.min(i + 1, (pages?.length ?? 1) - 1));
                        }
                      : undefined
                  }
                  onSubmit={async (e) => {
                    e.preventDefault();
                    submitLocally(visibleFields);
                  }}
                  schema={schema}
                  showAttachment={schema.mode !== "classic"}
                  showMultiStepNav={classicMultiStep}
                  submitting={false}
                  requiredOverrides={publicExperience ? classicLogic.requiredOverrides : undefined}
                />
              </div>
            </div>
            <FormBrandingFooter className="pb-2" schema={schema} style={customStyles.textStyle} />
          </div>
        </div>
      </ScrollArea>
    );
  }
}
