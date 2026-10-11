"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  GripVertical,
  LogIn,
  PartyPopper,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { createOption, getWelcomeScreen, getDefaultThankyou } from "@repo/shared";
import type { FormField, FormSchema, ThankyouScreen, WelcomeScreen } from "@repo/shared";
import { InlineRecallEdit } from "./shared/inline-recall-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FormFieldRenderer } from "./form-field-renderer";
import { FormBrandingLogo } from "@/components/form-branding/form-branding-logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormStyling } from "@/hooks/use-form-styling";
import { getFormLayoutClasses } from "@/lib/utils/form-layout";
import type { FormBlock } from "@repo/shared";
import { getBlocksFromSchema } from "./form-builder/utils";
import type { SelectedScreen } from "./form-builder/types";

interface ClassicBuilderCanvasProps {
  schema: FormSchema;
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldUpdate?: (field: FormField) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldDuplicate?: (fieldId: string) => void;
  onAddContent?: (contentType: string) => void;
  /** Currently selected step (block) id — drives which step the canvas shows. */
  selectedBlockId?: string | null;
  onStepSelect?: (blockId: string) => void;
  onStepAdd?: () => void;
  onStepUpdate?: (blockId: string, updates: Partial<FormBlock>) => void;
  onStepDelete?: (blockId: string) => void;
  /** Selected intro / thank-you screen — renders that screen on the canvas. */
  selectedScreen?: SelectedScreen;
  onScreenSelect?: (screen: SelectedScreen) => void;
  onWelcomeUpdate?: (updates: Partial<WelcomeScreen>) => void;
  onThankyouUpdate?: (updates: Partial<ThankyouScreen>) => void;
}

/** The subset of theme-derived styles the canvas paint functions consume. */
type CanvasStyles = {
  headingStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  cardStyle?: React.CSSProperties;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* ------------------------------------------------------------------ *
 * InlineChoiceList — edit choices inline with drag-and-drop reordering
 * ------------------------------------------------------------------ */
function InlineChoiceList({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (field: FormField) => void;
}) {
  const choices = field.properties?.choices ?? [];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const dragIndexRef = useRef<number | null>(null);
  const isPictureChoice = field.type === "picture_choice";

  const commitChoices = (next: typeof choices) => {
    onUpdate({
      ...field,
      properties: { ...field.properties, choices: next },
    });
  };

  /** Attach / clear the image for a picture-choice option. */
  const setChoiceImage = (index: number, href: string) => {
    const trimmed = href.trim();
    const next = choices.map((c, i) => {
      if (i !== index) return c;
      if (!trimmed) return { ...c, attachment: undefined };
      return {
        ...c,
        attachment: { ...(c.attachment ?? {}), type: "image" as const, href: trimmed },
      };
    });
    commitChoices(next);
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
    if (toIndex < 0 || toIndex >= choices.length || fromIndex === toIndex) return;
    const next = [...choices];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    commitChoices(next);
  };

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    // Visual feedback
    const target = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      target.style.opacity = "0.4";
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = dragIndexRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        moveChoice(fromIndex, toIndex);
      }
      dragIndexRef.current = null;
    },
    [choices],
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "";
    dragIndexRef.current = null;
  }, []);

  return (
    <div className="flex w-full flex-col gap-2.5">
      {choices.map((choice, index) => {
        const isEditing = editingIndex === index;
        return (
          <div
            className={cn("group/choice flex items-center gap-2", isPictureChoice && "flex-wrap")}
            draggable
            key={choice.ref ?? `choice-${index}`}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragStart={(e) => handleDragStart(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            {/* Drag handle */}
            <button
              aria-label="Drag to reorder"
              className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground/40 cursor-grab active:cursor-grabbing hover:text-muted-foreground"
              tabIndex={-1}
              type="button"
            >
              <GripVertical className="size-3.5" />
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

            {/* Picture choice: inline image selection */}
            {isPictureChoice && (
              <div className="flex w-full items-center gap-2 pl-8">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {choice.attachment?.href ? (
                    <img
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      src={choice.attachment.href}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-sm">🖼️</span>
                  )}
                </div>
                <Input
                  className="h-8 flex-1 text-xs"
                  defaultValue={choice.attachment?.href ?? ""}
                  key={`${choice.ref ?? index}-${choice.attachment?.href ?? ""}`}
                  onBlur={(e) => setChoiceImage(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="Paste an image URL"
                />
              </div>
            )}
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
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * FieldCard — a single field rendered inline-editable
 * ------------------------------------------------------------------ */
const CHOICE_FIELD_TYPES = new Set([
  "multiple_choice",
  "checkbox",
  "dropdown",
  "picture_choice",
  "ranking",
]);

/**
 * Content blocks own their own heading (and dividers/banners have no heading),
 * so the canvas must not wrap them in the question scaffold.
 */
const CONTENT_BLOCK_FIELD_TYPES = new Set(["statement", "divider", "banner"]);

/** Fields whose placeholder can be edited inline on the canvas. */
const PLACEHOLDER_FIELD_TYPES = new Set(["short_text", "long_text"]);

function InlineAnswerPlaceholder({
  field,
  formSchema,
  onUpdate,
}: {
  field: FormField;
  formSchema: FormSchema;
  onUpdate: (field: FormField) => void;
}) {
  const isLongText = field.type === "long_text";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 text-base text-muted-foreground/70 transition-colors",
        "hover:border-primary/30 hover:bg-muted/20",
        isLongText ? "min-h-32 py-3" : "flex h-12 items-center",
      )}
      onClick={(e) => e.stopPropagation()}
      title="Click to edit placeholder"
    >
      <InlineRecallEdit
        className="block w-full text-base text-muted-foreground/70"
        currentFieldRef={field.ref}
        formSchema={formSchema}
        multiline={isLongText}
        onUpdate={(placeholder) =>
          onUpdate({
            ...field,
            properties: { ...field.properties, placeholder },
          })
        }
        placeholder={isLongText ? "Write your answer..." : "Type your answer..."}
        value={field.properties?.placeholder ?? ""}
      />
    </div>
  );
}

function FieldCard({
  field,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  formSchema,
  customStyles,
}: {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (field: FormField) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  formSchema: FormSchema;
  customStyles: CanvasStyles;
}) {
  const isChoiceField = CHOICE_FIELD_TYPES.has(field.type);
  const isContentBlock = CONTENT_BLOCK_FIELD_TYPES.has(field.type);

  return (
    <div
      className={cn(
        "group flex w-full flex-col gap-4 rounded-xl border-2 border-transparent p-3 transition-all",
        "hover:border-primary/20 hover:bg-primary/[0.02]",
        isSelected && "border-primary/50 bg-primary/[0.04] ring-2 ring-primary/20",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Field toolbar */}
      <div
        className={cn(
          "flex items-center justify-between transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
        <div className="flex items-center gap-1">
          {onDuplicate && (
            <Button
              aria-label="Duplicate question"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              size="icon-xs"
              variant="ghost"
            >
              <Copy className="size-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              aria-label="Delete question"
              className="text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              size="icon-xs"
              variant="ghost"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {isContentBlock && (
        <div className="pointer-events-none w-full">
          <FormFieldRenderer
            builderMode
            field={field}
            formId=""
            onChange={() => {}}
            showAttachment={false}
            showLabel={false}
            value={undefined}
          />
        </div>
      )}

      {!isContentBlock && (
        <>
      {/* Question title */}
      <h2
        className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
        style={customStyles?.headingStyle}
      >
        <InlineRecallEdit
          className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
          currentFieldRef={field.ref}
          formSchema={formSchema}
          onUpdate={(title) => onUpdate({ ...field, title })}
          placeholder="Click to write your question"
          value={field.title}
        />
        {field.validations?.required && <span className="ml-1 text-destructive">*</span>}
      </h2>

      {/* Description */}
      {(field.properties?.description || true) && (
        <p className="text-muted-foreground" style={customStyles?.textStyle}>
          <InlineRecallEdit
            className="text-muted-foreground"
            currentFieldRef={field.ref}
            formSchema={formSchema}
            multiline
            onUpdate={(description) =>
              onUpdate({
                ...field,
                properties: { ...field.properties, description },
              })
            }
            placeholder="Description (optional)"
            value={field.properties?.description ?? ""}
          />
        </p>
      )}

      {/* Answer area */}
      {isChoiceField ? (
        <InlineChoiceList field={field} onUpdate={onUpdate} />
      ) : PLACEHOLDER_FIELD_TYPES.has(field.type) ? (
        <InlineAnswerPlaceholder field={field} formSchema={formSchema} onUpdate={onUpdate} />
      ) : (
        <div className="pointer-events-none">
          <FormFieldRenderer
            builderMode
            field={field}
            formId=""
            onChange={() => {}}
            showAttachment={false}
            showLabel={false}
            value={undefined}
          />
        </div>
      )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ScreenStage — a COMPLETELY SEPARATE canvas screen for the intro
 * (welcome) or thank-you page. These never render between the form
 * fields: selecting "Intro" / "Thank you" in the left list swaps the
 * whole canvas to this screen, exactly like a respondent would see it.
 * Recall (@ picker, incl. URL params) works on the editable text.
 * ------------------------------------------------------------------ */
function ScreenStage({
  kind,
  screen,
  formSchema,
  customStyles,
  onTitleUpdate,
  onDescriptionUpdate,
  onAddDescription,
  children,
}: {
  kind: "welcome" | "ending";
  screen: WelcomeScreen | ThankyouScreen;
  formSchema: FormSchema;
  customStyles: CanvasStyles;
  onTitleUpdate: (title: string) => void;
  onDescriptionUpdate?: (description: string) => void;
  onAddDescription?: () => void;
  children?: React.ReactNode;
}) {
  const isWelcome = kind === "welcome";
  const properties = (screen.properties ?? {}) as {
    description?: string;
    show_button?: boolean;
    button_text?: string;
    heading_alignment?: "left" | "center" | "right";
    show_divider?: boolean;
    divider_text?: string;
  };
  const description = properties.description;
  const showButton = properties.show_button !== false;
  const buttonLabel = isWelcome
    ? properties.button_text || "Start"
    : properties.button_text || "Submit another response";

  const alignment = properties.heading_alignment ?? "center";
  const alignmentClass =
    alignment === "left"
      ? "items-start text-left"
      : alignment === "right"
        ? "items-end text-right"
        : "items-center text-center";
  const showDivider = properties.show_divider === true;
  const dividerText = properties.divider_text?.trim();

  return (
    <div
      className={cn(
        "flex w-full grow flex-col justify-center rounded-xl p-8 sm:p-12",
        alignmentClass,
      )}
      style={customStyles.cardStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="mb-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary/80">
        {isWelcome ? <LogIn className="size-3.5" /> : <PartyPopper className="size-3.5" />}
        {isWelcome ? "Intro screen" : "Thank-you screen"}
      </span>

      <h2
        className="max-w-xl text-2xl font-bold leading-snug tracking-tight sm:text-3xl"
        style={customStyles.headingStyle}
      >
        <InlineRecallEdit
          className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl"
          formSchema={formSchema}
          onUpdate={onTitleUpdate}
          placeholder={isWelcome ? "Welcome!" : "Thank you!"}
          value={screen.title}
        />
      </h2>

      {showDivider && (
        <div
          className={cn(
            "mt-4 flex w-full max-w-xl items-center gap-3",
            alignment === "left" && "justify-start",
            alignment === "right" && "justify-end",
          )}
        >
          {alignment !== "right" && <span aria-hidden className="flex-1 border-t border-border" />}
          {dividerText && (
            <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {dividerText}
            </span>
          )}
          {alignment !== "left" && <span aria-hidden className="flex-1 border-t border-border" />}
        </div>
      )}

      {description !== undefined ? (
        <p className="mt-4 max-w-md text-muted-foreground" style={customStyles.textStyle}>
          <InlineRecallEdit
            className="text-muted-foreground"
            formSchema={formSchema}
            multiline
            onUpdate={(value) => onDescriptionUpdate?.(value)}
            placeholder="Description (optional)"
            value={description}
          />
        </p>
      ) : (
        onAddDescription && (
          <button
            className="mt-4 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
            onClick={onAddDescription}
            type="button"
          >
            <Plus className="mr-1 inline size-3" />
            Add description
          </button>
        )
      )}

      {showButton && (
        <span className="mt-8 rounded-lg border border-border bg-muted/40 px-6 py-2.5 text-sm font-medium text-foreground/80">
          {buttonLabel}
        </span>
      )}

      <p className="mt-10 text-[11px] text-muted-foreground/60">
        Type <kbd className="rounded bg-muted px-1 font-mono">@</kbd> to recall a value · This
        screen is separate from your questions
      </p>

      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Main canvas
 * ------------------------------------------------------------------ */
export function ClassicBuilderCanvas({
  schema,
  selectedFieldId,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  onFieldDuplicate,
  onAddContent,
  selectedBlockId,
  onStepSelect,
  onStepAdd,
  onStepUpdate,
  onStepDelete,
  selectedScreen = null,
  onScreenSelect,
  onWelcomeUpdate,
  onThankyouUpdate,
}: ClassicBuilderCanvasProps) {
  const allFields = useMemo(() => schema.fields ?? [], [schema.fields]);
  const welcomeScreen = getWelcomeScreen(schema);
  const thankyouScreen = getDefaultThankyou(schema);
  const { customStyles, getFormClasses } = useFormStyling(schema);
  const { containerClass } = getFormLayoutClasses(schema);

  // Block (step) view. A single block means a single-page form and the canvas
  // shows every field; multiple blocks paginate the canvas by step.
  const blocks = useMemo(() => getBlocksFromSchema(schema), [schema]);
  const isMultiStep = blocks.length > 1;
  const activeIndex = Math.max(
    0,
    blocks.findIndex((b) => b.id === selectedBlockId),
  );
  const activeBlock = blocks[activeIndex];
  const visibleFields = isMultiStep ? (activeBlock?.fields ?? []) : allFields;

  return (
    <div
      className={cn("h-full w-full", getFormClasses())}
      style={{
        backgroundColor: customStyles.containerStyle.backgroundColor,
        color: customStyles.containerStyle.color,
        fontFamily: customStyles.containerStyle.fontFamily,
        fontSize: customStyles.containerStyle.fontSize,
        fontWeight: customStyles.containerStyle.fontWeight,
      }}
      onClick={() => {
        onFieldSelect(null);
        onScreenSelect?.(null);
      }}
    >
      <ScrollArea className="h-full w-full">
        <div className={cn("flex flex-col gap-6 px-4 py-6 sm:px-6", containerClass)}>
          {/* Branding */}
          <FormBrandingLogo mode="classical" schema={schema} screen="question" />

          {/* Step navigator — only shown for multi-step forms */}
          {isMultiStep && (
            <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {blocks.map((block, i) => (
                  <button
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      i === activeIndex
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    key={block.id}
                    onClick={() => onStepSelect?.(block.id)}
                    type="button"
                  >
                    <span className="tabular-nums">{i + 1}.</span>{" "}
                    <span className="max-w-[8rem] truncate align-bottom">
                      {block.title || `Step ${i + 1}`}
                    </span>
                  </button>
                ))}
                {onStepAdd && (
                  <button
                    className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    onClick={() => onStepAdd()}
                    type="button"
                  >
                    <Plus className="size-3" />
                    Add step
                  </button>
                )}
              </div>

              {activeBlock && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Step {activeIndex + 1}
                  </span>
                  <Input
                    className="h-7 flex-1 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
                    onChange={(e) => onStepUpdate?.(activeBlock.id, { title: e.target.value })}
                    placeholder="Untitled step"
                    value={activeBlock.title ?? ""}
                  />
                  {blocks.length > 1 && onStepDelete && (
                    <Button
                      aria-label="Delete step"
                      className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => onStepDelete(activeBlock.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="hidden sm:inline">Delete step</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Intro / Thank-you render as COMPLETELY SEPARATE screens — never
              mixed into the question list. Selecting them in the left panel
              swaps this canvas to that screen only. */}
          {selectedScreen === "welcome" && welcomeScreen ? (
            <div className="flex w-full grow flex-col">
              <ScreenStage
                customStyles={customStyles}
                formSchema={schema}
                kind="welcome"
                onAddDescription={
                  onWelcomeUpdate
                    ? () =>
                        onWelcomeUpdate({
                          properties: { ...welcomeScreen.properties, description: "" },
                        })
                    : undefined
                }
                onDescriptionUpdate={(description) =>
                  onWelcomeUpdate?.({
                    properties: { ...welcomeScreen.properties, description },
                  })
                }
                onTitleUpdate={(title) => onWelcomeUpdate?.({ title })}
                screen={welcomeScreen}
              >
                <Button
                  className="mt-6 gap-1.5"
                  onClick={() => {
                    onScreenSelect?.(null);
                    const first = visibleFields[0];
                    onFieldSelect(first?.ref ?? null);
                  }}
                  size="sm"
                  variant="outline"
                >
                  Go to questions
                  <ArrowRight className="size-3.5" />
                </Button>
              </ScreenStage>
            </div>
          ) : selectedScreen === "ending" && thankyouScreen ? (
            <div className="flex w-full grow flex-col">
              <ScreenStage
                customStyles={customStyles}
                formSchema={schema}
                kind="ending"
                onAddDescription={
                  onThankyouUpdate
                    ? () =>
                        onThankyouUpdate({
                          properties: { ...thankyouScreen.properties, description: "" },
                        })
                    : undefined
                }
                onDescriptionUpdate={(description) =>
                  onThankyouUpdate?.({
                    properties: { ...thankyouScreen.properties, description },
                  })
                }
                onTitleUpdate={(title) => onThankyouUpdate?.({ title })}
                screen={thankyouScreen}
              >
                <Button
                  className="mt-6 gap-1.5"
                  onClick={() => {
                    onScreenSelect?.(null);
                    const last = visibleFields[visibleFields.length - 1];
                    onFieldSelect(last?.ref ?? null);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to questions
                </Button>
              </ScreenStage>
            </div>
          ) : (
          <>
          {/* Form card */}
          <div
            className="flex w-full grow flex-col gap-6 rounded-xl p-6 shadow-none sm:p-8"
            style={customStyles.cardStyle}
          >
            {visibleFields.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Start building your form</h2>
                <p className="max-w-sm text-muted-foreground">
                  Add your first question to get started.
                </p>
                <Button onClick={() => onAddContent?.("short_text")}>
                  <Plus className="mr-2 size-4" />
                  Add your first question
                </Button>
              </div>
            ) : (
              visibleFields.map((field, index) => (
                <FieldCard
                  key={field.ref ?? `field-${index}`}
                  field={field}
                  formSchema={schema}
                  index={index}
                  isSelected={selectedFieldId === field.ref}
                  onDelete={field.ref ? () => onFieldDelete?.(field.ref!) : undefined}
                  onDuplicate={field.ref ? () => onFieldDuplicate?.(field.ref!) : undefined}
                  onSelect={() => {
                    onScreenSelect?.(null);
                    onFieldSelect(field.ref ?? null);
                  }}
                  onUpdate={onFieldUpdate ? (updated) => onFieldUpdate(updated) : () => {}}
                  customStyles={customStyles}
                />
              ))
            )}
          </div>
          </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
