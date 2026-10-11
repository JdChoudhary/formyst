"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { FormFieldRenderer } from "@/components/form-builder/form-field-renderer";
import { AttachmentMedia } from "@/components/form-builder/form-field-renderer/components/attachment-media";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";
import {
  computeFlow,
  evaluateLogic,
  extractSubmissionIdentity,
  getDefaultThankyou,
  getThankyouByRef,
  getWelcomeScreen,
  resolveHiddenValues,
  interpolateRecall,
  type FormField,
} from "@repo/shared";
import type { FormSchema } from "@repo/shared";
import { useFormProgress } from "@/hooks/form-progress";
import { useFormStyling } from "@/hooks/use-form-styling";
import { FormBrandingFooter } from "@/components/form-branding/form-branding-footer";
import { FormBrandingLogo } from "@/components/form-branding/form-branding-logo";
import { QuestionMediaLayout } from "@/components/form-branding/question-media-layout";
import { cn } from "@/lib/utils";
import { calculateQuizScore } from "@/lib/quiz/scoring";
import { getLocalDuplicateState, recordLocalSubmission } from "@/lib/forms/duplicate-prevention";
import { parseFieldErrors } from "@/lib/forms/submission-errors";
import { DuplicateSubmissionError } from "../single-step/components/duplicate-submission-error";
import { AutosaveStatus } from "../autosave-status";

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------
const validateField = (field: FormField, value: any): string | null => {
  if (field.type === "statement") return null;

  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && value !== null && Object.keys(value).length === 0);

  if (field.validations?.required && isEmpty) {
    return "This field is required";
  }

  if (isEmpty) return null;

  switch (field.type) {
    case "email": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return "Please enter a valid email address";
      break;
    }
    case "phone_number": {
      const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
      if (!phoneRegex.test(value)) return "Please enter a valid phone number";
      break;
    }
    case "website": {
      try {
        new URL(value);
      } catch {
        return "Please enter a valid URL";
      }
      break;
    }
    case "number": {
      const num = Number(value);
      if (isNaN(num)) return "Please enter a valid number";
      if (field.validations?.min_value !== undefined && num < field.validations.min_value)
        return `Minimum value is ${field.validations.min_value}`;
      if (field.validations?.max_value !== undefined && num > field.validations.max_value)
        return `Maximum value is ${field.validations.max_value}`;
      break;
    }
    case "short_text":
    case "long_text": {
      if (
        field.validations?.max_length !== undefined &&
        value.length > field.validations.max_length
      )
        return `Maximum ${field.validations.max_length} characters allowed`;
      if (field.properties?.regexp) {
        const regex = new RegExp(field.properties.regexp);
        if (!regex.test(value)) return "Invalid format";
      }
      break;
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ConversationalFormProps {
  formId: string;
  schema: FormSchema;
  dir?: string;
}

type Screen =
  { kind: "welcome" } | { kind: "field"; fieldRef: string } | { kind: "ending"; endingRef: string };

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

// ---------------------------------------------------------------------------
// Animation variants — Typeform-style spring transitions
// ---------------------------------------------------------------------------
const screenVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? -50 : 50,
    opacity: 0,
  }),
};

const welcomeVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

const endingVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ---------------------------------------------------------------------------
// Swipe hook
// ---------------------------------------------------------------------------
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, enabled = true) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;
    const dx = touchEnd.current.x - touchStart.current.x;
    const dy = touchEnd.current.y - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Only register horizontal swipes (not vertical scrolls)
    if (absDx > minSwipeDistance && absDx > absDy * 1.5) {
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    }
    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  if (!enabled) return {};
  return { onTouchStart, onTouchMove, onTouchEnd };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ConversationalForm({ formId, schema, dir }: ConversationalFormProps) {
  const allFields = schema.fields ?? [];
  const fieldByRef = useMemo(
    () => new Map(allFields.map((field) => [field.ref ?? "", field])),
    [allFields],
  );
  const welcomeScreen = getWelcomeScreen(schema);
  const prefersReducedMotion = useReducedMotion();

  const [screenIndex, setScreenIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [hidden, setHidden] = useState<Record<string, unknown>>({});
  const [forcedNext, setForcedNext] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateError, setDuplicateError] = useState<{
    message: string;
    timeRemaining?: number;
    attemptsRemaining?: number;
  } | null>(null);
  const [endingRef, setEndingRef] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState(1);
  const lastFieldIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const botTrapRef = useRef<HTMLInputElement | null>(null);
  /** True while the duplicate banner was set by the local (localStorage) guard. */
  const localDuplicateBlockRef = useRef(false);

  const totalFields = allFields.filter((f) => f.type !== "statement").length;

  const {
    progress,
    saving: progressSaving,
    error: progressError,
    saveNow,
    saveProgress,
    clearProgress,
    flushEvents,
    sessionId,
  } = useFormProgress(formId, totalFields, {
    enabled: true,
    storage: "server",
    autoSaveInterval: 3000,
    retentionDays: 7,
  });

  // Hidden fields from URL params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    setHidden(resolveHiddenValues(schema, params));
  }, [schema]);

  // Local duplicate guard — mirrors the server's duplicate-prevention policy
  // using this browser's recorded submissions. Server-side enforcement stays
  // authoritative.
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

  const flow = useMemo(
    () => computeFlow(schema, formData, hidden, variables),
    [schema, formData, hidden, variables],
  );

  const visibleFieldRefs = useMemo(() => {
    const forcedIndex = flow.visibleFieldRefs.indexOf(forcedNext ?? "");
    if (forcedNext && forcedIndex >= 0) {
      return [
        ...flow.visibleFieldRefs.slice(0, forcedIndex),
        forcedNext,
        ...flow.visibleFieldRefs.slice(forcedIndex + 1),
      ];
    }
    return flow.visibleFieldRefs;
  }, [flow.visibleFieldRefs, forcedNext]);

  const screens = useMemo<Screen[]>(() => {
    const list: Screen[] = [];
    if (welcomeScreen) list.push({ kind: "welcome" });
    for (const fieldRef of visibleFieldRefs) {
      list.push({ kind: "field", fieldRef });
    }
    list.push({
      kind: "ending",
      endingRef: endingRef ?? getDefaultThankyou(schema)?.ref ?? "default",
    });
    return list;
  }, [welcomeScreen, visibleFieldRefs, endingRef, schema]);

  const screen = screens[Math.min(screenIndex, Math.max(0, screens.length - 1))];
  const isLastScreen = screenIndex >= screens.length - 1;

  const currentFieldIndex =
    screen?.kind === "field" ? visibleFieldRefs.indexOf(screen.fieldRef) : -1;
  const questionNumber = currentFieldIndex + 1;
  const totalQuestions = visibleFieldRefs.length;

  const progressPct = useMemo(() => {
    if (screens.length <= 1) return 100;
    // Progress is based on answered fields, not screen position
    const answeredCount = Object.keys(formData).filter((k) => {
      const val = formData[k];
      return (
        val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)
      );
    }).length;
    return Math.min(100, Math.round((answeredCount / Math.max(totalQuestions, 1)) * 100));
  }, [screens.length, formData, totalQuestions]);

  const { customStyles, fontLoaded, getFormClasses, getButtonStyles } = useFormStyling(schema);

  // Effective current field with required overrides from logic rules
  const currentField = screen?.kind === "field" ? fieldByRef.get(screen.fieldRef) : undefined;
  const effectiveCurrentField = useMemo(() => {
    if (!currentField) return undefined;
    const ref = currentField.ref ?? "";
    if (flow.requiredOverrides && ref in flow.requiredOverrides) {
      return {
        ...currentField,
        validations: {
          ...currentField.validations,
          required: flow.requiredOverrides[ref],
        },
      };
    }
    return currentField;
  }, [currentField, flow.requiredOverrides]);

  // Focus input when question changes
  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[data-conversational-input="true"]',
      );
      if (el) {
        el.focus();
        inputRef.current = el;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [screenIndex, prefersReducedMotion]);

  // ---- Answer recording with logic ----
  const recordAnswer = useCallback(
    (fieldRef: string, value: any) => {
      lastFieldIdRef.current = fieldRef;
      setFormData((prev) => ({ ...prev, [fieldRef]: value }));
      const nextCtx = {
        schema,
        answers: { ...formData, [fieldRef]: value },
        hidden,
        variables,
      };
      const outcome = evaluateLogic(nextCtx);
      setVariables(outcome.variables);
      if (outcome.jumpTo !== undefined) {
        if (outcome.jumpTo === "thankyou") {
          setEndingRef(outcome.thankyouRef ?? getDefaultThankyou(schema)?.ref ?? "default");
          setForcedNext(undefined);
        } else if (fieldByRef.has(outcome.jumpTo)) {
          setForcedNext(outcome.jumpTo);
        } else {
          setEndingRef(outcome.jumpTo);
        }
      }
      if (errors[fieldRef]) setErrors((prev) => ({ ...prev, [fieldRef]: "" }));
    },
    [schema, formData, hidden, variables, errors, fieldByRef],
  );

  // Autosave
  useEffect(() => {
    if (Object.keys(formData).length === 0) return;
    saveProgress(formData, screenIndex, screens.length, lastFieldIdRef.current);
  }, [formData, screenIndex]);

  // ---- Navigation ----
  const handleNext = useCallback(() => {
    const rawField = screen?.kind === "field" ? fieldByRef.get(screen.fieldRef) : undefined;
    // Apply required overrides for validation
    const currentField =
      rawField && flow.requiredOverrides && rawField.ref && rawField.ref in flow.requiredOverrides
        ? {
            ...rawField,
            validations: {
              ...rawField.validations,
              required: flow.requiredOverrides[rawField.ref],
            },
          }
        : rawField;

    if (currentField && currentField.type !== "statement") {
      const validationError = validateField(currentField, formData[currentField.ref ?? ""]);
      if (validationError) {
        setErrors((prev) => ({ ...prev, [currentField.ref ?? ""]: validationError }));
        return;
      }
      const result = computeFlow(schema, formData, hidden, variables);
      if (result.thankyouRef) {
        setEndingRef(result.thankyouRef);
        setDirection(1);
        setScreenIndex(screens.length - 1);
        return;
      }
    }

    setErrors({});
    if (screenIndex < screens.length - 1) {
      setDirection(1);
      setScreenIndex((i) => Math.min(i + 1, screens.length - 1));
      if (screen?.kind === "field") {
        const advancedField = fieldByRef.get(screen.fieldRef);
        if (advancedField && advancedField.type !== "statement") {
          recordAnswer(screen.fieldRef, formData[screen.fieldRef]);
        }
      }
    } else {
      void handleSubmit();
    }
  }, [
    screen,
    screenIndex,
    screens.length,
    fieldByRef,
    formData,
    schema,
    hidden,
    variables,
    recordAnswer,
    flow,
  ]);

  const handleBack = useCallback(() => {
    if (screenIndex > 0) {
      setDirection(-1);
      setScreenIndex((i) => i - 1);
      setForcedNext(undefined);
    }
  }, [screenIndex]);

  // Auto-advance on choice-like fields
  useEffect(() => {
    if (screen?.kind !== "field") return;
    const field = fieldByRef.get(screen.fieldRef);
    if (!field || !CHOICE_LIKE.has(field.type)) return;
    const value = formData[field.ref ?? ""];
    const hasValue = Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && value !== "";
    if (!hasValue) return;
    const timer = setTimeout(() => handleNext(), 400);
    return () => clearTimeout(timer);
  }, [screen, formData, fieldByRef, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (submitting || submitted) return;
      // Don't intercept if user is typing in an input
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleNext();
        }
        return;
      }
      if (event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowLeft" || event.key === "Backspace") {
        event.preventDefault();
        handleBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNext, handleBack, submitting, submitted]);

  // Swipe gestures
  const swipeHandlers = useSwipe(handleNext, handleBack, !submitting && !submitted);

  // ---- Submission ----
  const handleSubmit = async () => {
    if (submitting) return;

    const newErrors: Record<string, string> = {};
    for (const fieldRef of visibleFieldRefs) {
      const field = fieldByRef.get(fieldRef);
      if (field && field.type !== "statement") {
        const error = validateField(field, formData[fieldRef]);
        if (error) newErrors[fieldRef] = error;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    setDuplicateError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const botTrap = botTrapRef.current?.value;
      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          submissionData: botTrap
            ? { ...formData, ...hidden, __bot_trap: botTrap }
            : { ...formData, ...hidden },
          sessionId: sessionId ?? undefined,
          lastFieldId: lastFieldIdRef.current,
          lastStepReached: screenIndex,
          events: flushEvents(),
          httpHeaders: { cookie: document.cookie },
        }),
      });
      const result = await response.json();
      if (response.ok) {
        // Remember this browser's submission for the local duplicate guard.
        recordLocalSubmission(formId, schema, { ...formData, ...hidden });
        setSubmitted(true);
        toast.success("Form submitted successfully!");
        void clearProgress();
        const thankyou = getThankyouByRef(schema, endingRef ?? "") ?? getDefaultThankyou(schema);
        const redirectUrl = thankyou?.properties?.redirect_url;
        if (redirectUrl)
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);
      } else {
        const fieldErrors = parseFieldErrors(result);
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
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
      }
    } catch {
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render: Submitted state ----
  if (submitted) {
    const thankyou = getThankyouByRef(schema, endingRef ?? "") ?? getDefaultThankyou(schema);
    const quiz = calculateQuizScore(schema, formData);
    const quizSettings = (schema.settings as any)?.quiz;
    const showScore = quizSettings?.enabled && quiz.totalQuestions > 0;
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto w-full max-w-lg text-center"
        >
          {" "}
          <div className="flex flex-col items-center gap-6">
            <FormBrandingLogo mode="conversational" schema={schema} screen="ending" />
            {thankyou?.attachment?.href && (
              <AttachmentMedia
                attachment={thankyou.attachment}
                className="max-h-52 w-auto rounded-2xl"
              />
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="flex size-20 items-center justify-center rounded-full bg-primary/10"
            >
              <Check className="size-10 text-primary" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold tracking-tight"
            >
              {interpolateRecall(
                thankyou?.title ?? "Thank you!",
                schema,
                formData,
                variables,
                hidden,
              )}
            </motion.h1>
            {showScore && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl bg-primary/5 px-6 py-4"
              >
                <p className="text-4xl font-bold text-primary">{quiz.percentage}%</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quiz.score}/{quiz.totalPossible} points
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>
    );
  }

  // ---- Render: Loading ----
  if (!fontLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Progress className="h-1 w-48" value={30} />
      </div>
    );
  }

  const animTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 };

  const isTextFocused = effectiveCurrentField && TEXT_LIKE.has(effectiveCurrentField.type);

  // Separate background styles (full-screen) from content styles (constrained)
  const { maxWidth, width, margin, textAlign, ...backgroundStyles } = customStyles.containerStyle;

  return (
    <div
      className={cn("flex min-h-dvh w-full flex-col items-center bg-background", getFormClasses())}
      dir={dir}
      style={{ ...backgroundStyles, minHeight: "100dvh" }}
      {...swipeHandlers}
    >
      {/* Progress bar — fixed at very top */}
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="h-[3px] w-full bg-border/30">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="relative flex w-full max-w-xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex min-h-[100dvh] flex-col justify-center py-16">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ---- Welcome Screen ---- */}
            {screen?.kind === "welcome" && welcomeScreen && (
              <motion.div
                key="welcome"
                variants={welcomeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={animTransition}
                className="flex w-full flex-col items-center gap-8 text-center"
              >
                <FormBrandingLogo mode="conversational" schema={schema} screen="welcome" />
                {welcomeScreen.attachment?.href && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                  >
                    <AttachmentMedia
                      attachment={welcomeScreen.attachment}
                      className="max-h-52 w-auto rounded-2xl shadow-sm"
                    />
                  </motion.div>
                )}
                <div className="flex flex-col items-center gap-4">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="text-4xl font-bold tracking-tight sm:text-5xl"
                  >
                    {interpolateRecall(welcomeScreen.title, schema, formData, variables, hidden)}
                  </motion.h1>
                  {welcomeScreen.properties?.description && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25, duration: 0.4 }}
                      className="max-w-md text-lg leading-relaxed text-muted-foreground"
                    >
                      {interpolateRecall(
                        welcomeScreen.properties.description,
                        schema,
                        formData,
                        variables,
                        hidden,
                      )}
                    </motion.p>
                  )}
                </div>
                {welcomeScreen.properties?.show_button !== false && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.35 }}
                  >
                    <Button
                      className="h-14 px-10 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                      onClick={() => {
                        setDirection(1);
                        setScreenIndex(1);
                      }}
                      style={getButtonStyles(true)}
                    >
                      {welcomeScreen.properties?.button_text || "Start"}
                      <ChevronRight className="ml-2 size-5" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ---- Field Screen ---- */}
            {screen?.kind === "field" && effectiveCurrentField && (
              <motion.div
                key={`field-${screen.fieldRef}`}
                custom={direction}
                variants={screenVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={animTransition}
                className="flex w-full flex-col gap-6"
              >
                <FormBrandingLogo
                  className="mb-[-0.5rem]"
                  mode="conversational"
                  schema={schema}
                  screen="question"
                />
                {/* Question header — number, title, description */}
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-3"
                >
                  {schema.settings?.show_question_number !== false && totalQuestions > 0 && (
                    <motion.span
                      variants={fadeUp}
                      className="text-xs font-semibold uppercase tracking-widest text-primary/80"
                    >
                      {questionNumber} / {totalQuestions}
                    </motion.span>
                  )}
                  <motion.h2
                    variants={fadeUp}
                    className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
                  >
                    {interpolateRecall(
                      effectiveCurrentField.title,
                      schema,
                      formData,
                      variables,
                      hidden,
                    )}
                    {effectiveCurrentField.validations?.required && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </motion.h2>
                  {effectiveCurrentField.properties?.description && (
                    <motion.p
                      variants={fadeUp}
                      className="text-base text-muted-foreground leading-relaxed"
                    >
                      {interpolateRecall(
                        effectiveCurrentField.properties.description,
                        schema,
                        formData,
                        variables,
                        hidden,
                      )}
                    </motion.p>
                  )}
                </motion.div>

                {/* Field input — question media (if any) is placed by the
                    shared layout component, derived from this question only */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: prefersReducedMotion ? 0 : 0.25, duration: 0.35 }}
                  className="min-h-[120px]"
                >
                  <QuestionMediaLayout field={effectiveCurrentField}>
                    <div
                      className={cn(
                        "rounded-xl transition-all duration-200",
                        errors[effectiveCurrentField.ref ?? ""] && "ring-2 ring-destructive/50",
                      )}
                    >
                      <FormFieldRenderer
                        data-conversational-input={isTextFocused ? "true" : undefined}
                        disabled={flow.disabledFields?.has(effectiveCurrentField.ref ?? "")}
                        error={errors[effectiveCurrentField.ref ?? ""]}
                        field={effectiveCurrentField}
                        formId={formId}
                        onChange={(value) => recordAnswer(effectiveCurrentField.ref ?? "", value)}
                        recallContext={{ answers: formData, variables, hidden, schema }}
                        showAttachment={false}
                        showLabel={false}
                        value={formData[effectiveCurrentField.ref ?? ""]}
                      />
                    </div>
                    {errors[effectiveCurrentField.ref ?? ""] && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm font-medium text-destructive"
                      >
                        {errors[effectiveCurrentField.ref ?? ""]}
                      </motion.p>
                    )}
                  </QuestionMediaLayout>
                </motion.div>

                {/* Navigation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: prefersReducedMotion ? 0 : 0.35, duration: 0.3 }}
                  className="flex flex-col gap-3"
                >
                  {effectiveCurrentField.type === "statement" ? (
                    <div className="flex justify-center">
                      <Button
                        className="h-12 px-8 text-sm font-medium shadow-md transition-all hover:shadow-lg"
                        disabled={submitting}
                        loading={submitting}
                        onClick={handleNext}
                        style={getButtonStyles(true)}
                        type="button"
                      >
                        {effectiveCurrentField.properties?.button_text || "Continue"}
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        {schema.settings?.hide_navigation !== true ? (
                          <Button
                            disabled={screenIndex === 0}
                            onClick={handleBack}
                            type="button"
                            variant="ghost"
                            className="gap-2 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowLeft className="size-4" />
                            <span className="hidden sm:inline">Back</span>
                          </Button>
                        ) : (
                          <span />
                        )}
                        <Button
                          className="h-12 px-8 text-sm font-medium shadow-md transition-all hover:shadow-lg"
                          disabled={submitting}
                          loading={submitting}
                          onClick={handleNext}
                          style={getButtonStyles(true)}
                          type="button"
                        >
                          {isLastScreen ? "Submit" : "OK"}
                          {!isLastScreen && <ArrowRight className="ml-2 size-4" />}
                        </Button>
                      </div>
                      {/* Keyboard hint — desktop only */}
                      {isTextFocused && (
                        <p className="hidden text-center text-xs text-muted-foreground/60 md:block">
                          Press{" "}
                          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                            Enter
                          </kbd>{" "}
                          to continue
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ---- Ending Screen ---- */}
            {screen?.kind === "ending" && (
              <motion.div
                key="ending"
                variants={endingVariants}
                initial="initial"
                animate="animate"
                transition={animTransition}
                className="flex w-full flex-col items-center gap-6 text-center"
              >
                <FormBrandingLogo mode="conversational" schema={schema} screen="ending" />
                {(() => {
                  const thankyou =
                    getThankyouByRef(schema, screen.endingRef) ?? getDefaultThankyou(schema);
                  return (
                    <>
                      {thankyou?.attachment?.href && (
                        <AttachmentMedia
                          attachment={thankyou.attachment}
                          className="max-h-52 w-auto rounded-2xl"
                        />
                      )}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
                        className="flex size-20 items-center justify-center rounded-full bg-primary/10"
                      >
                        <Check className="size-10 text-primary" />
                      </motion.div>
                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                        className="text-3xl font-bold tracking-tight"
                      >
                        {interpolateRecall(
                          thankyou?.title ?? "Thank you!",
                          schema,
                          formData,
                          variables,
                          hidden,
                        )}
                      </motion.h1>
                      {thankyou?.properties?.show_button !== false &&
                        thankyou?.properties?.button_text && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.35 }}
                          >
                            <Button
                              className="h-12 px-8 text-sm font-medium"
                              onClick={() => {
                                if (thankyou.properties?.button_mode === "reload") {
                                  window.location.reload();
                                } else if (thankyou.properties?.redirect_url) {
                                  window.location.href = thankyou.properties.redirect_url;
                                } else {
                                  setSubmitted(true);
                                }
                              }}
                              type="button"
                            >
                              {thankyou.properties.button_text}
                            </Button>
                          </motion.div>
                        )}
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bot trap — off-screen honeypot; bots that auto-fill forms trip it */}
      <input
        ref={botTrapRef}
        aria-hidden="true"
        autoComplete="off"
        className="absolute -left-[9999px] h-px w-px opacity-0"
        name="__bot_trap"
        tabIndex={-1}
        type="text"
      />

      {/* Persistent branding footer — bottom of every screen */}
      <div className="flex w-full max-w-xl flex-col gap-4 px-4 pb-6 sm:px-6">
        {duplicateError && (
          <DuplicateSubmissionError
            attemptsRemaining={duplicateError.attemptsRemaining}
            message={duplicateError.message}
            onRetry={() => window.location.reload()}
            timeRemaining={duplicateError.timeRemaining}
          />
        )}
        <FormBrandingFooter schema={schema} style={customStyles.textStyle} />
      </div>

      {/* Autosave status — bottom right */}
      <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
        <AutosaveStatus
          error={progressError}
          offline={progress?.offline ?? false}
          onSaveNow={() => saveNow(formData, screenIndex, screens.length, lastFieldIdRef.current)}
          saving={progressSaving}
        />
      </div>
    </div>
  );
}
