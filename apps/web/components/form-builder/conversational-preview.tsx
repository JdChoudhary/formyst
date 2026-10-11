"use client";

import { useMemo, useRef, useState } from "react";
import { InlineRecallEdit } from "./shared/inline-recall-edit";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  Copy,
  Image as ImageIcon,
  LogIn,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { getWelcomeScreen, getDefaultThankyou, createOption } from "@repo/shared";
import type { FormField, FormSchema, WelcomeScreen, ThankyouScreen } from "@repo/shared";
import { AttachmentMedia } from "./form-field-renderer/components/attachment-media";
import { Button } from "@/components/ui/button";
import { useFormStyling } from "@/hooks/use-form-styling";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FormFieldRenderer } from "./form-field-renderer";
import type { SelectedScreen } from "./form-builder/types";
import { FormBrandingLogo } from "@/components/form-branding/form-branding-logo";


interface ConversationalPreviewProps {
  schema: FormSchema;
  selectedFieldId: string | null;
  selectedScreen?: SelectedScreen;
  onFieldSelect: (fieldId: string | null) => void;
  onScreenSelect?: (screen: SelectedScreen) => void;
  onFieldUpdate?: (field: FormField) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldDuplicate?: (fieldId: string) => void;
  onWelcomeUpdate?: (updates: Partial<WelcomeScreen>) => void;
  onThankyouUpdate?: (updates: Partial<ThankyouScreen>) => void;
  onAddContent?: (contentType: string) => void;
}

type Screen =
  { kind: "welcome" } | { kind: "field"; fieldRef: string } | { kind: "ending"; endingRef: string };

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const CHOICE_FIELD_TYPES = new Set([
  "multiple_choice",
  "checkbox",
  "dropdown",
  "picture_choice",
  "ranking",
  "yes_no",
]);

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";



/* ------------------------------------------------------------------ *
 * InlineEdit — click-to-edit text with recall token resolution
 * Tokens like {{field:ref}} show as labeled pills with field titles.
 * ------------------------------------------------------------------ */
function InlineEdit({
  value,
  onUpdate,
  tag: Tag = "span",
  className,
  placeholder,
  multiline = false,
  hint = false,
  formSchema,
  currentFieldRef,
}: {
  value: string;
  onUpdate: (value: string) => void;
  tag?: "h1" | "h2" | "h3" | "span" | "p";
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  hint?: boolean;
  formSchema?: FormSchema;
  currentFieldRef?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const displayParts = useMemo(() => {
    const parts: Array<{ type: "text" | "token"; content: string; label?: string }> = [];
    const regex = /\{\{(field|variable|var|url_param|url|score|price):?([^}]*)\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: value.slice(lastIndex, match.index) });
      }
      const [, type, ref] = match;
      let label = ref;
      if (type === "field" && formSchema?.fields) {
        const field = formSchema.fields.find((f) => f.ref === ref);
        label = field?.title || ref;
      } else if (type === "variable" || type === "var") {
        label = `var: ${ref}`;
      } else if (type === "url_param" || type === "url") {
        label = `url: ${ref}`;
      } else if (match[0] === "{{score}}") {
        label = "Score";
      } else if (match[0] === "{{price}}") {
        label = "Price";
      }
      parts.push({ type: "token", content: match[0], label });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < value.length) {
      parts.push({ type: "text", content: value.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: "text" as const, content: value }];
  }, [value, formSchema]);

  const hasTokens = displayParts.some((p) => p.type === "token");

  const handleBlur = () => {
    setIsEditing(false);
    if (ref.current) {
      const text = ref.current.innerText.trim();
      if (text !== value) onUpdate(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === "Escape") {
      if (ref.current) ref.current.innerText = value;
      ref.current?.blur();
    }
  };

  if (!isEditing && hasTokens) {
    return (
      <span className="group/inline relative inline-flex max-w-full flex-wrap items-center">
        <span
          className={cn(
            "inline-flex max-w-full flex-wrap items-center cursor-text",
            className,
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {displayParts.map((part, i) =>
            part.type === "token" ? (
              <span
                key={`pill-${i}`}
                className={cn(
                  "inline-flex items-center rounded-[0.25rem] px-1 py-px mx-px",
                  "bg-primary/10 text-primary font-medium",
                  "border border-primary/20",
                  "align-baseline text-[0.92em] leading-snug",
                  "select-all",
                  "dark:bg-primary/15 dark:text-primary dark:border-primary/25",
                )}
              >
                {part.label}
              </span>
            ) : (
              <span key={`text-${i}`} className="whitespace-pre-wrap">
                {part.content}
              </span>
            ),
          )}
        </span>
      </span>
    );
  }

  return (
    <span className="group/inline relative inline-flex max-w-full">
      <Tag
        ref={ref as never}
        className={cn(
          "outline-none cursor-text",
          className,
          isEditing && "",
          !value && !isEditing && "",
        )}
        contentEditable={!multiline || isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        onKeyDown={handleKeyDown}
      >
        {value || ""}
      </Tag>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * InlineChoiceList — edit answer choices directly on the canvas
 * ------------------------------------------------------------------ */
function InlineChoiceList({
  field,
  onUpdate,
  showHints,
}: {
  field: FormField;
  onUpdate: (field: FormField) => void;
  showHints?: boolean;
}) {
  const choices = field.properties?.choices ?? [];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const commitChoices = (next: typeof choices) => {
    onUpdate({
      ...field,
      properties: { ...field.properties, choices: next },
    });
  };

  const startEdit = (index: number, label: string) => {
    setEditingIndex(index);
    setDraft(label);
  };

  const commitEdit = (index: number) => {
    setEditingIndex(null);
    const label = draft.trim() || `Option ${index + 1}`;
    const next = choices.map((c, i) =>
      i === index ? { ...c, ref: c.ref ?? createOption(label).ref, label } : c,
    );
    commitChoices(next);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 1) return;
    commitChoices(choices.filter((_, i) => i !== index));
  };

  const addChoice = () => {
    const next = [...choices, createOption(`Option ${choices.length + 1}`)];
    commitChoices(next);
    setEditingIndex(next.length - 1);
    setDraft(`Option ${next.length}`);
  };

  const moveChoice = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= choices.length) return;
    const next = [...choices];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    commitChoices(next);
  };

  return (
    <div className="flex w-full flex-col gap-2.5">
      {choices.map((choice, index) => {
        const isEditing = editingIndex === index;
        return (
          <div
            className="group/choice flex items-center gap-2"
            key={choice.ref ?? `choice-${index}`}
          >
            {/* Drag handle */}
            <button
              aria-label="Drag to reorder"
              className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground/40 cursor-grab active:cursor-grabbing hover:text-muted-foreground"
              onMouseDown={(e) => {
                // Simple drag: Alt+Arrow for reorder
              }}
              tabIndex={-1}
              type="button"
            >
              <span className="text-xs leading-none">⠿</span>
            </button>
            {/* Option indicator */}
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {LETTERS[index] ?? index + 1}
            </span>
            {isEditing ? (
              <Input
                autoFocus
                className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitEdit(index)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit(index);
                  }
                  if (e.key === "Escape") {
                    setEditingIndex(null);
                  }
                  if (e.key === "ArrowUp" && e.altKey) {
                    e.preventDefault();
                    moveChoice(index, index - 1);
                  }
                  if (e.key === "ArrowDown" && e.altKey) {
                    e.preventDefault();
                    moveChoice(index, index + 1);
                  }
                }}
                value={draft}
              />
            ) : (
              <button
                className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-transparent px-3.5 text-left text-[15px] font-medium text-foreground transition-all hover:border-foreground/10 hover:bg-muted/30 group-hover/choice:border-foreground/10"
                onClick={() => startEdit(index, choice.label)}
                type="button"
              >
                <span className="truncate">{choice.label}</span>
              </button>
            )}
            <button
              aria-label={`Delete choice ${index + 1}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/choice:opacity-100"
              onClick={() => removeChoice(index)}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}

      <button
        className="flex h-9 items-center gap-2 rounded-lg border border-dashed border-border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        onClick={addChoice}
        type="button"
      >
        <Plus className="size-3.5" />
        Add option
      </button>

      {showHints && <span className="mt-1 text-xs text-muted-foreground/70">Press Enter ↵ · Alt+↑↓ to reorder</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * MediaPicker — add image/video media to a question (URL based only)
 * ------------------------------------------------------------------ */
function MediaPicker({
  onAdd,
  children,
}: {
  onAdd: (type: "image" | "video", href: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"image" | "video">("image");
  const [href, setHref] = useState("");

  const submit = () => {
    const url = href.trim();
    if (!url) return;
    onAdd(type, url);
    setHref("");
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={<span className="inline-flex" />}>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3" sideOffset={6}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Add media</p>
        <div className="mb-2 flex gap-1 rounded-lg bg-muted/60 p-0.5">
          {(["image", "video"] as const).map((t) => (
            <button
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                type === t
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
              key={t}
              onClick={() => setType(t)}
              type="button"
            >
              {t === "image" ? (
                <ImageIcon className="size-3.5" />
              ) : (
                <Clapperboard className="size-3.5" />
              )}
              {t === "image" ? "Image" : "Video"}
            </button>
          ))}
        </div>
        <Input
          autoFocus
          className="mb-2"
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={type === "image" ? "Paste image URL..." : "Paste video / YouTube URL..."}
          type="url"
          value={href}
        />
        <Button className="w-full" disabled={!href.trim()} onClick={submit} size="sm">
          Add {type}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ *
 * ProgressIndicator — dynamic progress per settings
 * ------------------------------------------------------------------ */
function ProgressIndicator({
  schema,
  screenIndex,
  screenCount,
  questionNumber,
  totalQuestions,
}: {
  schema: FormSchema;
  screenIndex: number;
  screenCount: number;
  questionNumber: number;
  totalQuestions: number;
}) {
  const settings = schema.settings ?? {};
  const showNumber = settings.show_question_number ?? true;
  const showBar = settings.show_progress_bar ?? true;
  const barKind = settings.progress_bar ?? "proportion";

  const pct =
    screenCount > 1 ? Math.min(100, Math.round(((screenIndex + 1) / screenCount) * 100)) : 100;

  if (showNumber && totalQuestions > 0 && questionNumber === 0 && !showBar) {
    return null;
  }

  if (showBar && barKind === "percentage") {
    return (
      <div className="flex w-full items-center justify-end px-6 pt-4">
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
      </div>
    );
  }

  if (showBar) {
    return (
      <div className="w-full px-6 pt-4">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-border/40">
          <motion.div
            animate={{ width: `${pct}%` }}
            className="h-full rounded-full bg-primary"
            initial={false}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </div>
      </div>
    );
  }

  if (showNumber && totalQuestions > 0) {
    return (
      <div className="flex w-full items-center justify-end px-6 pt-4">
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {questionNumber} / {totalQuestions}
        </span>
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Main canvas
 * ------------------------------------------------------------------ */
export function ConversationalPreview({
  schema,
  selectedFieldId,
  selectedScreen = null,
  onFieldSelect,
  onScreenSelect,
  onFieldUpdate,
  onFieldDelete,
  onFieldDuplicate,
  onWelcomeUpdate,
  onThankyouUpdate,
  onAddContent,
}: ConversationalPreviewProps) {
  const allFields = useMemo(() => schema.fields ?? [], [schema.fields]);
  const fieldByRef = useMemo(() => new Map(allFields.map((f) => [f.ref ?? "", f])), [allFields]);
  const welcomeScreen = getWelcomeScreen(schema);
  const thankyouScreen = getDefaultThankyou(schema);
  const [editingWelcomeDescription, setEditingWelcomeDescription] = useState(false);

  // Theme integration — inherit colors, typography, alignment, and background
  // from the form theme so the builder canvas matches the respondent experience.
  const { customStyles, getButtonStyles } = useFormStyling(schema);

  const screens = useMemo<Screen[]>(() => {
    const list: Screen[] = [];
    if (welcomeScreen) list.push({ kind: "welcome" });
    for (const field of allFields) {
      if (field.ref) list.push({ kind: "field", fieldRef: field.ref });
    }
    if (thankyouScreen) {
      list.push({ kind: "ending", endingRef: thankyouScreen.ref ?? "default" });
    }
    return list;
  }, [welcomeScreen, thankyouScreen, allFields]);

  const currentScreen: Screen | null = useMemo(() => {
    if (selectedScreen === "welcome") return welcomeScreen ? { kind: "welcome" } : null;
    if (selectedScreen === "ending")
      return thankyouScreen ? { kind: "ending", endingRef: thankyouScreen.ref ?? "default" } : null;
    if (selectedFieldId) {
      return fieldByRef.has(selectedFieldId) ? { kind: "field", fieldRef: selectedFieldId } : null;
    }
    // Fall back to the first screen
    return screens[0] ?? null;
  }, [selectedScreen, selectedFieldId, welcomeScreen, thankyouScreen, fieldByRef, screens]);

  const screenIndex = currentScreen ? screens.findIndex(matchesScreen(currentScreen)) : -1;
  const currentField =
    currentScreen?.kind === "field" ? fieldByRef.get(currentScreen.fieldRef) : undefined;
  const questionNumber =
    currentScreen?.kind === "field" && currentField?.ref
      ? allFields.findIndex((f) => f.ref === currentField.ref) + 1
      : 0;
  const totalQuestions = allFields.length;

  const selectScreen = (screen: Screen | null) => {
    if (!screen) {
      onFieldSelect(null);
      onScreenSelect?.(null);
      return;
    }
    if (screen.kind === "welcome") {
      onFieldSelect(null);
      onScreenSelect?.("welcome");
    } else if (screen.kind === "ending") {
      onFieldSelect(null);
      onScreenSelect?.("ending");
    } else {
      onScreenSelect?.(null);
      onFieldSelect(screen.fieldRef);
    }
  };

  const goNext = () => {
    if (screenIndex >= 0 && screenIndex < screens.length - 1) {
      selectScreen(screens[screenIndex + 1]);
    }
  };

  const goBack = () => {
    if (screenIndex > 0) {
      selectScreen(screens[screenIndex - 1]);
    }
  };

  const updateField = (updates: Partial<FormField>) => {
    if (!onFieldUpdate || !currentField) return;
    onFieldUpdate({ ...currentField, ...updates } as FormField);
  };

  const updateLayout = (updates: Partial<NonNullable<FormField["layout"]>>) => {
    if (!currentField) return;
    updateField({
      layout: {
        ...(currentField.layout ?? { type: "stack" }),
        ...updates,
      },
    });
  };

  const handleAddMedia = (type: "image" | "video", href: string) => {
    updateLayout({
      attachment: { type, href },
    });
  };

  const handleRemoveMedia = () => {
    updateLayout({ attachment: undefined });
  };

  const handleWelcomeUpdate = (updates: Partial<WelcomeScreen>) => {
    if (!welcomeScreen || !onWelcomeUpdate) return;
    onWelcomeUpdate(updates);
  };

  const handleThankyouUpdate = (updates: Partial<ThankyouScreen>) => {
    if (!thankyouScreen || !onThankyouUpdate) return;
    onThankyouUpdate(updates);
  };

  // Enter = respondent "next" behavior, unless the user is editing text.
  const handleCanvasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    const isEditable =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;
    if (isEditable) return;
    e.preventDefault();
    goNext();
  };

  const isLastQuestion =
    currentScreen?.kind === "field" && currentField?.ref === allFields[allFields.length - 1]?.ref;

  const attachment = currentField?.attachment ?? currentField?.layout?.attachment;
  const hasAttachment = !!attachment?.href;
  const layoutType = currentField?.layout?.type ?? (hasAttachment ? "float" : undefined);
  const placement = currentField?.layout?.placement ?? "left";
  const isWallpaper = hasAttachment && layoutType === "wallpaper";
  const isSplit = hasAttachment && layoutType === "split";
  const isFloat = hasAttachment && layoutType === "float";
  const isStack = hasAttachment && layoutType === "stack";

  const attachmentNode = hasAttachment ? (
    <div className="group/media relative">
      <AttachmentMedia
        attachment={attachment!}
        className={cn(
          "rounded-xl",
          isSplit ? "max-h-48 w-full object-cover" : isWallpaper ? "hidden" : "max-h-40 w-full object-contain",
        )}
      />
      {(selectedScreen === null || currentScreen?.kind === "field") && onFieldUpdate && (
        <button
          aria-label="Remove media"
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow transition-opacity group-hover/media:opacity-100 hover:bg-black/80"
          onClick={handleRemoveMedia}
          type="button"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  ) : null;

  const questionContent = (
    <div className="flex flex-col gap-4">
      {questionNumber > 0 && (
        <motion.span
          animate="visible"
          className="text-xs font-semibold uppercase tracking-widest text-primary/80"
          initial="hidden"
          variants={fadeUp}
        >
          {questionNumber} →
        </motion.span>
      )}
      <motion.h2
        animate="visible"
        className="text-2xl font-semibold leading-snug tracking-tight md:text-3xl"
        initial="hidden"
        style={customStyles.headingStyle}
        variants={fadeUp}
      >
        {onFieldUpdate ? (
          <InlineRecallEdit
            className="text-2xl font-semibold leading-snug tracking-tight md:text-3xl"
            currentFieldRef={currentField?.ref}
            formSchema={schema}
            onUpdate={(title) => updateField({ title })}
            placeholder="Click to write your question"
            value={currentField?.title ?? ""}
          />
        ) : (
          currentField?.title
        )}
        {currentField?.validations?.required && <span className="ml-1 text-destructive">*</span>}
      </motion.h2>
      {currentField && (currentField.properties?.description || onFieldUpdate) && (
        <motion.p
          animate="visible"
          className="text-muted-foreground"
          initial="hidden"
          variants={fadeUp}
        >
          {onFieldUpdate ? (
            <InlineRecallEdit
              className="text-muted-foreground"
              currentFieldRef={currentField?.ref}
              formSchema={schema}
              multiline
              onUpdate={(description) =>
                updateField({
                  properties: { ...currentField.properties, description },
                })
              }
              placeholder="Description (optional)"
              value={currentField.properties?.description ?? ""}
            />
          ) : (
            currentField.properties?.description
          )}
        </motion.p>
      )}
    </div>
  );

  const answerNode = currentField ? (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex w-full flex-col gap-3 rounded-xl border-2 border-transparent p-2 transition-all duration-200",
        "hover:border-foreground/10 hover:bg-foreground/[0.015]",
        selectedScreen === null &&
          selectedFieldId === currentField.ref &&
          "border-primary/40 bg-primary/[0.03] shadow-sm shadow-primary/5",
      )}
      initial={{ opacity: 0, y: 12 }}
      onClick={() => onFieldSelect(currentField.ref ?? null)}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      {onFieldUpdate && CHOICE_FIELD_TYPES.has(currentField.type) ? (
        <InlineChoiceList
          field={currentField}
          onUpdate={onFieldUpdate}
          showHints={schema.settings?.show_key_hint_on_choices ?? true}
        />
      ) : (
        <>
          <div className="pointer-events-none">
            <FormFieldRenderer
              builderMode
              field={currentField}
              formId=""
              onChange={() => {}}
              showAttachment={false}
              showLabel={false}
              value={undefined}
            />
          </div>
          <span className="text-xs text-muted-foreground/70">Press Enter ↵</span>
        </>
      )}
    </motion.div>
  ) : null;

  let layoutNode: React.ReactNode;

  if (isWallpaper && attachment) {
    layoutNode = (
      <div className="relative w-full overflow-hidden rounded-2xl">
        <div className="absolute inset-0 z-0">
          <AttachmentMedia attachment={attachment} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 flex flex-col gap-4 p-6 text-white">
          {questionContent}
          {answerNode}
        </div>
      </div>
    );
  } else if (isSplit && attachment) {
    layoutNode = (
      <div
        className={cn(
          "grid items-center gap-6",
          placement === "right"
            ? "sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            : "sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
        )}
      >
        {placement === "right" ? (
          <>
            <div className="flex flex-col gap-6">
              {questionContent}
              {answerNode}
            </div>
            <div className="min-w-0">{attachmentNode}</div>
          </>
        ) : (
          <>
            <div className="min-w-0">{attachmentNode}</div>
            <div className="flex flex-col gap-6">
              {questionContent}
              {answerNode}
            </div>
          </>
        )}
      </div>
    );
  } else if (isFloat && attachment) {
    layoutNode = (
      <div className="flex flex-col gap-6">
        {questionContent}
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <div className="w-full shrink-0 sm:w-48">{attachmentNode}</div>
          <div className="flex-1">{answerNode}</div>
        </div>
      </div>
    );
  } else if (isStack && attachment) {
    layoutNode = (
      <div className="flex flex-col gap-6">
        {placement === "right" ? (
          <>
            {questionContent}
            {answerNode}
            <div className="w-full">{attachmentNode}</div>
          </>
        ) : (
          <>
            <div className="w-full">{attachmentNode}</div>
            {questionContent}
            {answerNode}
          </>
        )}
      </div>
    );
  } else {
    layoutNode = (
      <div className="flex w-full max-w-xl flex-col gap-6">
        {questionContent}
        {hasAttachment && <div className="flex justify-center">{attachmentNode}</div>}
        {answerNode}
        {!hasAttachment && onFieldUpdate && (
          <MediaPicker onAdd={handleAddMedia}>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-opacity hover:border-primary/40 hover:text-primary group-hover:opacity-100">
              <Plus className="size-3.5" />
              Add media
            </span>
          </MediaPicker>
        )}
      </div>
    );
  }

  const showBack = screenIndex > 0;
  const showNext = screenIndex >= 0 && screenIndex < screens.length - 1;

  return (
    <div
      className="flex h-full flex-col"
      onKeyDown={handleCanvasKeyDown}
      style={customStyles.containerStyle}
      tabIndex={-1}
    >
      <ProgressIndicator
        questionNumber={Math.max(questionNumber, 1)}
        schema={schema}
        screenCount={Math.max(screens.length, 1)}
        screenIndex={Math.max(screenIndex, 0)}
        totalQuestions={totalQuestions}
      />

      {/* Branding logo — rendered per the global branding configuration for
          the current screen type. Global title/description are NOT part of
          the conversational screen preview; they live in Design / settings. */}
      <div className="flex shrink-0 flex-col items-center gap-2 px-6 pt-2">
        <FormBrandingLogo
          mode="conversational"
          schema={schema}
          screen={currentScreen?.kind === "field" ? "question" : (currentScreen?.kind ?? "welcome")}
        />
        {/* Compact "add welcome screen" affordance once questions exist */}
        {!welcomeScreen && currentScreen?.kind === "field" && onWelcomeUpdate && (
          <button
            className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            onClick={() => onAddContent?.("content_welcome")}
            type="button"
          >
            <LogIn className="size-3" />
            Add welcome screen
          </button>
        )}
      </div>

      {/* Contextual question toolbar — visible on hover or when selected */}
      {currentScreen?.kind === "field" && currentField && onFieldUpdate && (
        <div
          className={cn(
            "flex items-center justify-between px-4 pt-1 transition-opacity",
            selectedFieldId === currentField.ref && selectedScreen === null
              ? "opacity-100"
              : "opacity-0 hover:opacity-100",
          )}
        >
          <span className="text-xs font-medium text-muted-foreground">
            Question {questionNumber}
          </span>
          <div className="flex items-center gap-1">
            {onFieldDuplicate && (
              <Button
                aria-label="Duplicate question"
                onClick={() => onFieldDuplicate(currentField.ref ?? "")}
                size="icon-xs"
                variant="ghost"
              >
                <Copy className="size-3.5" />
              </Button>
            )}
            {onFieldDelete && (
              <Button
                aria-label="Delete question"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onFieldDelete(currentField.ref ?? "")}
                size="icon-xs"
                variant="ghost"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Screen content — fills the Safari viewport. */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-4 sm:px-6">
        <AnimatePresence mode="wait">
          {/* Welcome empty state — invite the user to add a welcome screen */}
          {!welcomeScreen && onWelcomeUpdate && currentScreen === null && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-10 text-center"
              initial={{ opacity: 0, y: 12 }}
              key="welcome-empty"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LogIn className="size-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">Add a welcome screen</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Start your form with a friendly intro before the first question.
              </p>
              <Button onClick={() => onAddContent?.("content_welcome")} size="sm">
                <Plus className="mr-1.5 size-4" />
                Add welcome screen
              </Button>
            </motion.div>
          )}

          {/* Welcome screen */}
          {currentScreen?.kind === "welcome" && welcomeScreen && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
              exit={{ opacity: 0, scale: 1.02 }}
              initial={{ opacity: 0, scale: 0.96 }}
              key="welcome"
              transition={{ duration: 0.3 }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                Welcome
              </span>
              {welcomeScreen.attachment?.href && onWelcomeUpdate && (
                <AttachmentMedia
                  attachment={welcomeScreen.attachment}
                  className="max-h-40 w-auto rounded-xl"
                />
              )}
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={customStyles.headingStyle}>
                {onWelcomeUpdate ? (
                  <InlineEdit
                    className="text-2xl font-bold tracking-tight md:text-3xl"
                    onUpdate={(title) => handleWelcomeUpdate({ title })}
                    placeholder="Welcome!"
                    tag="span"
                    value={welcomeScreen.title}
                  />
                ) : (
                  welcomeScreen.title
                )}
              </h1>
              {welcomeScreen.properties?.description ? (
                onWelcomeUpdate ? (
                  <InlineEdit
                    className="max-w-md text-muted-foreground"
                    multiline
                    onUpdate={(description) =>
                      handleWelcomeUpdate({
                        properties: { ...welcomeScreen.properties, description },
                      })
                    }
                    placeholder=""
                    tag="p"
                    value={welcomeScreen.properties.description}
                  />
                ) : (
                  <p className="max-w-md text-muted-foreground">
                    {welcomeScreen.properties.description}
                  </p>
                )
              ) : onWelcomeUpdate && editingWelcomeDescription ? (
                <InlineEdit
                  className="max-w-md text-muted-foreground"
                  multiline
                  onUpdate={(description) => {
                    handleWelcomeUpdate({
                      properties: { ...welcomeScreen.properties, description },
                    });
                    setEditingWelcomeDescription(false);
                  }}
                  placeholder="Write a short welcome message..."
                  tag="p"
                  value=""
                />
              ) : onWelcomeUpdate ? (
                <button
                  className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
                  onClick={() => setEditingWelcomeDescription(true)}
                  type="button"
                >
                  <Plus className="mr-1 inline size-3" />
                  Add description
                </button>
              ) : null}
              {welcomeScreen.properties?.show_button !== false && (
                <div className="flex flex-col items-center gap-2">
                  {onWelcomeUpdate ? (
                    <InlineEdit
                      className="text-sm font-medium"
                      onUpdate={(button_text) =>
                        handleWelcomeUpdate({
                          properties: { ...welcomeScreen.properties, button_text },
                        })
                      }
                      placeholder="Start"
                      tag="span"
                      value={welcomeScreen.properties?.button_text || "Start"}
                    />
                  ) : (
                    <span>{welcomeScreen.properties?.button_text || "Start"}</span>
                  )}
                  <Button
                    className="px-8"
                    onClick={() => {
                      const next = screens.find((s) => s.kind === "field");
                      if (next) selectScreen(next);
                    }}
                    style={getButtonStyles(true)}
                  >
                    {welcomeScreen.properties?.button_text || "Start"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Field screen */}
          {currentScreen?.kind === "field" && currentField && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full max-w-xl flex-col items-center gap-6"
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: 24 }}
              key={`field-${currentField.ref}`}
              transition={{ duration: 0.25 }}
            >
              {layoutNode}
            </motion.div>
          )}

          {/* Ending screen */}
          {currentScreen?.kind === "ending" && thankyouScreen && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-full max-w-lg flex-col items-center gap-4 text-center"
              exit={{ opacity: 0, scale: 0.92 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="ending"
              transition={{ duration: 0.35 }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-500/90">
                End
              </span>
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-xl">
                🎉
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={customStyles.headingStyle}>
                {onThankyouUpdate ? (
                  <InlineEdit
                    className="text-3xl font-bold tracking-tight"
                    onUpdate={(title) => handleThankyouUpdate({ title })}
                    placeholder="Thank you!"
                    tag="span"
                    value={thankyouScreen.title}
                  />
                ) : (
                  thankyouScreen.title
                )}
              </h1>
              {onThankyouUpdate && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">Button text</span>
                  <InlineEdit
                    className="text-sm font-medium"
                    onUpdate={(button_text) =>
                      handleThankyouUpdate({
                        properties: { ...thankyouScreen.properties, button_text },
                      })
                    }
                    placeholder="Submit another response"
                    tag="span"
                    value={thankyouScreen.properties?.button_text ?? "Submit another response"}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Empty state */}
          {!currentScreen && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 text-center"
              initial={{ opacity: 0, y: 12 }}
            >
              <h2 className="text-2xl font-semibold tracking-tight">Start building your form</h2>
              <p className="max-w-sm text-muted-foreground">
                Ask your first question and create a beautiful one-question-at-a-time experience.
              </p>
              <Button onClick={() => onAddContent?.("short_text")}>
                <Plus className="mr-2 size-4" />
                Add your first question
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation preview */}
      {currentScreen && (
        <div className="flex shrink-0 items-center justify-between border-t px-4 py-2 backdrop-blur" style={{ backgroundColor: customStyles.containerStyle.backgroundColor ? `${customStyles.containerStyle.backgroundColor}ee` : undefined }}>
          <Button
            disabled={!showBack}
            onClick={goBack}
            type="button"
            variant="ghost"
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground/60">
            {currentScreen.kind === "field" && CHOICE_FIELD_TYPES.has(currentField?.type ?? "")
              ? "Press Enter ↵"
              : currentScreen.kind === "field"
                ? "Type your answer"
                : ""}
          </span>
          <Button
            disabled={!showNext}
            onClick={goNext}
            type="button"
            className="px-6"
            variant={showNext ? "default" : "secondary"}
          >
            {currentScreen.kind === "welcome" ? "Start" : isLastQuestion ? "Submit" : "OK"}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function matchesScreen(target: Screen) {
  return (screen: Screen) => {
    if (screen.kind !== target.kind) return false;
    if (screen.kind === "field" && target.kind === "field")
      return screen.fieldRef === target.fieldRef;
    if (screen.kind === "ending" && target.kind === "ending")
      return screen.endingRef === target.endingRef;
    return true;
  };
}
