"use client";

import { useCallback, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Copy,
  GripVertical,
  LogIn,
  MoreHorizontal,
  PartyPopper,
  Square,
  Trash2,
} from "lucide-react";
import type { FormField, FormSchema } from "@repo/shared";
import { getWelcomeScreen, getDefaultThankyou } from "@repo/shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FIELD_TYPE_CONFIGS } from "@/lib/fields/field-config";
import { getBlocksFromSchema } from "../utils";
import type { SelectedScreen } from "../types";
import { RecallInlineEditor } from "../../recall-mention";

interface QuestionListProps {
  formSchema: FormSchema;
  selectedFieldId: string | null;
  selectedScreen: SelectedScreen;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldAdd: (fieldType: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (fieldId: string) => void;
  onScreenSelect: (screen: SelectedScreen) => void;
  /** Delete the intro / thank-you screen. */
  onScreenDelete: (kind: "welcome" | "ending") => void;
  onFieldsReorder: (fields: FormField[]) => void;
  selectedBlockId?: string | null;
  onBlockSelect?: (blockId: string) => void;
}

/**
 * Content navigator — the structured left sidebar of the conversational
 * builder. INTRO (welcome) / QUESTIONS (numbered) / ENDINGS (thank-you),
 * with drag-to-reorder and hover actions.
 */
export function QuestionList({
  formSchema,
  selectedFieldId,
  selectedScreen,
  onFieldSelect,
  onFieldAdd,
  onFieldDelete,
  onFieldDuplicate,
  onScreenSelect,
  onScreenDelete,
  onFieldsReorder,
  selectedBlockId,
  onBlockSelect,
}: QuestionListProps) {
  const fields = formSchema.fields ?? [];
  const welcomeScreen = getWelcomeScreen(formSchema);
  const thankyouScreen = getDefaultThankyou(formSchema);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Multi-step: map each field to the step it belongs to so the navigator can
  // show which step a question lives in.
  const blocks = getBlocksFromSchema(formSchema);
  const isMultiStep = blocks.length > 1;
  const stepByFieldRef = new Map<string, { index: number; id: string; title: string }>();
  if (isMultiStep) {
    blocks.forEach((block, blockIndex) => {
      for (const field of block.fields ?? []) {
        if (field.ref) {
          stepByFieldRef.set(field.ref, {
            index: blockIndex,
            id: block.id,
            title: block.title || `Step ${blockIndex + 1}`,
          });
        }
      }
    });
  }

  // Stable memoized reference for the drag handler deps.
  const fieldsMemo = useMemo(() => fields, [fields]);

  const handleDragEnd = useCallback(
    (result: { source: { index: number }; destination?: { index: number } | null }) => {
      if (!result.destination) return;
      const src = result.source.index;
      const dst = result.destination.index;
      if (src === dst) return;
      const reordered = [...fieldsMemo];
      const [moved] = reordered.splice(src, 1);
      (reordered as FormField[]).splice(dst, 0, moved);
      onFieldsReorder(reordered);
    },
    [fieldsMemo, onFieldsReorder],
  );

  const sectionLabel = (label: string) => (
    <div className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {label}
    </div>
  );

  const rowBase =
    "group flex items-start gap-1.5 rounded-lg py-1.5 pr-1.5 pl-1 text-left text-sm transition-colors";

  return (
    <div className="flex h-full flex-col bg-card">
      <ScrollArea className="h-0 min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-2 pb-4">
          {/* INTRO */}
          {sectionLabel("Intro")}
          {welcomeScreen ? (
            <div
              className={cn(
                rowBase,
                "items-center pr-0.5",
                selectedScreen === "welcome" ? "bg-primary/[0.07]" : "hover:bg-muted/60",
              )}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                onClick={() => {
                  onScreenSelect("welcome");
                  onFieldSelect(null);
                }}
                type="button"
              >
                <span
                  className={cn(
                    "h-5 w-0.5 shrink-0 rounded-full transition-colors",
                    selectedScreen === "welcome" ? "bg-primary" : "bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md",
                    selectedScreen === "welcome"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <LogIn className="size-3" />
                </span>
                <span className="line-clamp-2 font-medium text-foreground">
                  {welcomeScreen.title || "Welcome"}
                </span>
              </button>
              <button
                aria-label="Delete welcome screen"
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onScreenDelete("welcome")}
                title="Delete welcome screen"
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="mx-2.5 flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              onClick={() => onFieldAdd("content_welcome")}
              type="button"
            >
              <LogIn className="size-3.5" />
              Add welcome screen
            </button>
          )}

          {/* QUESTIONS */}
          {sectionLabel("Content")}
          {fields.length === 0 ? (
            <button
              className="mx-2.5 flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              onClick={() => onFieldAdd("short_text")}
              type="button"
            >
              <Square className="size-3.5" />
              Add your first question
            </button>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="question-list">
                {(droppableProvided, droppableSnapshot) => (
                  <div
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                    className="flex flex-col gap-0.5"
                  >
                    {fields.map((field, index) => {
                      const config = FIELD_TYPE_CONFIGS.find((c) => c.type === field.type);
                      const Icon = config?.icon ?? Square;
                      const isSelected = selectedFieldId === field.ref && selectedScreen === null;
                      const fieldKey = field.ref ?? `field-${index}`;

                      return (
                        <Draggable draggableId={fieldKey} index={index} key={fieldKey}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={cn(
                                rowBase,
                                "pr-0.5",
                                isSelected ? "bg-primary/[0.07]" : "hover:bg-muted/60",
                                snapshot.isDragging && "shadow-lg ring-1 ring-primary/20",
                              )}
                            >
                              {/* Selection accent */}
                              <span
                                className={cn(
                                  "h-6 w-0.5 shrink-0 rounded-full transition-colors",
                                  isSelected ? "bg-primary" : "bg-transparent",
                                )}
                              />
                              <div
                                {...dragProvided.dragHandleProps}
                                className="flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-muted-foreground"
                              >
                                <GripVertical className="size-3.5" />
                              </div>
                              <span
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {index + 1}
                              </span>
                              <button
                                className="flex min-w-0 flex-1 items-start gap-2 py-0.5"
                                onClick={() => {
                                  onScreenSelect(null);
                                  onFieldSelect(field.ref ?? null);
                                  const step = field.ref
                                    ? stepByFieldRef.get(field.ref)
                                    : undefined;
                                  if (step) onBlockSelect?.(step.id);
                                }}
                                type="button"
                              >
                                <Icon
                                  className={cn(
                                    "size-4 shrink-0 mt-0.5",
                                    isSelected ? "text-primary" : "text-muted-foreground",
                                  )}
                                />
                                <span className="flex min-w-0 flex-col">
                                  <span className="line-clamp-2 font-medium text-foreground">
                                    <RecallInlineEditor
                                      className="max-w-full"
                                      disabled
                                      formSchema={formSchema}
                                      onUpdate={() => {}}
                                      value={field.title || "Untitled question"}
                                    />
                                  </span>
                                  {isMultiStep && field.ref && stepByFieldRef.has(field.ref) && (
                                    <span
                                      className={cn(
                                        "mt-0.5 w-fit rounded px-1 text-[10px] font-medium",
                                        selectedBlockId === stepByFieldRef.get(field.ref)?.id
                                          ? "bg-primary/15 text-primary"
                                          : "bg-muted text-muted-foreground",
                                      )}
                                    >
                                      Step {(stepByFieldRef.get(field.ref)?.index ?? 0) + 1}
                                    </span>
                                  )}
                                </span>
                              </button>

                              {/* Hover actions */}
                              <DropdownMenu
                                onOpenChange={(open) => setActiveMenu(open ? fieldKey : null)}
                                open={activeMenu === fieldKey}
                              >
                                <DropdownMenuTrigger
                                  render={
                                    <button
                                      aria-label={`Actions for question ${index + 1}`}
                                      className={cn(
                                        "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted",
                                        activeMenu === fieldKey
                                          ? "opacity-100"
                                          : "opacity-0 group-hover:opacity-100",
                                      )}
                                      type="button"
                                    >
                                      <MoreHorizontal className="size-3.5" />
                                    </button>
                                  }
                                />
                                <DropdownMenuContent align="end" className="w-40" sideOffset={4}>
                                  <DropdownMenuItem
                                    onClick={() => onFieldDuplicate(field.ref ?? "")}
                                  >
                                    <Copy className="size-4" />
                                    <span>Duplicate</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => onFieldDelete(field.ref ?? "")}
                                  >
                                    <Trash2 className="size-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {/* Insertion placeholder while dragging */}
                    {droppableSnapshot.isDraggingOver && (
                      <div className="my-0.5 h-1 rounded-full bg-primary/40" />
                    )}
                    {droppableProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {/* ENDINGS */}
          {sectionLabel("Endings")}
          {thankyouScreen ? (
            <div
              className={cn(
                rowBase,
                "items-center pr-0.5",
                selectedScreen === "ending" ? "bg-primary/[0.07]" : "hover:bg-muted/60",
              )}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                onClick={() => {
                  onScreenSelect("ending");
                  onFieldSelect(null);
                }}
                type="button"
              >
                <span
                  className={cn(
                    "h-5 w-0.5 shrink-0 rounded-full transition-colors",
                    selectedScreen === "ending" ? "bg-primary" : "bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    selectedScreen === "ending"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  ✓
                </span>
                <span className="line-clamp-2 font-medium text-foreground">
                  {thankyouScreen.title || "Thank you"}
                </span>
              </button>
              <button
                aria-label="Delete thank-you screen"
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onScreenDelete("ending")}
                title="Delete thank-you screen"
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="mx-2.5 flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              onClick={() => onScreenSelect("ending")}
              type="button"
            >
              <PartyPopper className="size-3.5" />
              Add ending
            </button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
