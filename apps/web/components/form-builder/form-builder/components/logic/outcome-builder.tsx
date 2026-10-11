"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type {
  Outcome,
  Condition,
  FormField,
  VariableDefinition,
} from "@repo/shared";
import { ConditionBuilder } from "./condition-builder";
import {
  describeCondition,
  generateId,
  buildFieldLabels,
} from "./utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OutcomeBuilderProps {
  outcomes: Outcome[];
  fields: FormField[];
  variables?: VariableDefinition[];
  thankyouScreens?: Array<{ ref?: string; title: string }>;
  onUpdate: (outcomes: Outcome[]) => void;
  lintErrors?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutcomeBuilder({
  outcomes,
  fields,
  variables = [],
  thankyouScreens = [],
  onUpdate,
  lintErrors = {},
}: OutcomeBuilderProps) {
  const [expandedOutcome, setExpandedOutcome] = useState<string | null>(null);
  const fieldLabels = buildFieldLabels(fields);

  const addOutcome = () => {
    const newOutcome: Outcome = {
      id: generateId("outcome"),
      title: `Outcome ${outcomes.length + 1}`,
      description: "",
      conditions: {
        type: "condition",
        source: { type: "field", ref: "" },
        operator: "always",
      },
      priority: outcomes.length,
      thankyouRef: thankyouScreens[0]?.ref,
    };
    onUpdate([...outcomes, newOutcome]);
    setExpandedOutcome(newOutcome.id);
  };

  const updateOutcome = (id: string, updates: Partial<Outcome>) => {
    onUpdate(outcomes.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const deleteOutcome = (id: string) => {
    onUpdate(outcomes.filter((o) => o.id !== id));
    if (expandedOutcome === id) setExpandedOutcome(null);
  };

  const duplicateOutcome = (id: string) => {
    const source = outcomes.find((o) => o.id === id);
    if (!source) return;
    const copy: Outcome = {
      ...structuredClone(source),
      id: generateId("outcome"),
      title: `${source.title} (copy)`,
      priority: outcomes.length,
    };
    const idx = outcomes.findIndex((o) => o.id === id);
    const next = [...outcomes];
    next.splice(idx + 1, 0, copy);
    onUpdate(next);
    setExpandedOutcome(copy.id);
  };

  const moveOutcome = (id: string, direction: -1 | 1) => {
    const idx = outcomes.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= outcomes.length) return;
    const next = [...outcomes];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    next.forEach((o, i) => {
      o.priority = i;
    });
    onUpdate(next);
  };

  // Empty state
  if (outcomes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <svg
            className="size-7 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 3h5v5" />
            <path d="M8 3H3v5" />
            <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
            <path d="m15 9 6-6" />
          </svg>
        </div>
        <div className="max-w-sm">
          <h2 className="mb-1 font-semibold text-foreground text-lg">
            No outcomes yet
          </h2>
          <p className="text-muted-foreground text-sm">
            Define possible outcomes for branching and classification forms.
            Each outcome has its own conditions and can redirect to a
            thank-you screen.
          </p>
        </div>
        <Button onClick={addOutcome}>
          <Plus className="mr-1.5 size-4" />
          Add Outcome
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground text-sm">
            Outcomes ({outcomes.length})
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
            <AlertCircle className="size-3" />
            First matching outcome wins (evaluated in priority order)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addOutcome}>
          <Plus className="mr-1 size-3.5" />
          Add Outcome
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {outcomes.map((outcome, index) => {
            const errors = lintErrors[outcome.id] ?? [];
            return (
              <Collapsible
                key={outcome.id}
                onOpenChange={(open) =>
                  setExpandedOutcome(open ? outcome.id : null)
                }
                open={expandedOutcome === outcome.id}
              >
                {/* Header */}
                <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/30">
                  {/* Priority controls */}
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <Button
                      className="size-5"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveOutcome(outcome.id, -1);
                      }}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <span className="font-semibold text-foreground text-xs tabular-nums">
                      {outcome.priority ?? index}
                    </span>
                    <Button
                      className="size-5"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveOutcome(outcome.id, 1);
                      }}
                      disabled={index === outcomes.length - 1}
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground text-sm">
                      {outcome.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {outcome.conditions
                        ? `When: ${describeCondition(outcome.conditions, fieldLabels)}`
                        : "No conditions (always matches)"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {outcome.thankyouRef && (
                        <Badge className="text-[10px]" variant="secondary">
                          → Thank-you: {outcome.thankyouRef}
                        </Badge>
                      )}
                      {outcome.redirectUrl && (
                        <Badge className="text-[10px]" variant="secondary">
                          → Redirect: {outcome.redirectUrl}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {errors.length > 0 && (
                      <Badge
                        className="text-[10px]"
                        variant="destructive"
                      >
                        {errors.length}
                      </Badge>
                    )}
                    <Button
                      className="size-6"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateOutcome(outcome.id);
                      }}
                    >
                      <Copy className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      className="size-6"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOutcome(outcome.id);
                      }}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                    {expandedOutcome === outcome.id ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>

                {/* Expanded editor */}
                <CollapsibleContent className="mt-2 rounded-xl border border-border/60 p-4">
                  {errors.length > 0 && (
                    <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                      {errors.map((msg, i) => (
                        <p key={i} className="text-destructive text-xs">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Title + description */}
                  <div className="mb-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        Title:
                      </span>
                      <Input
                        className="h-8 flex-1 text-xs"
                        value={outcome.title}
                        onChange={(e) =>
                          updateOutcome(outcome.id, { title: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        Description:
                      </span>
                      <Input
                        className="h-8 flex-1 text-xs"
                        placeholder="Optional description"
                        value={outcome.description ?? ""}
                        onChange={(e) =>
                          updateOutcome(outcome.id, {
                            description: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        Priority:
                      </span>
                      <Input
                        className="h-8 w-20 text-xs"
                        type="number"
                        min={0}
                        value={outcome.priority ?? index}
                        onChange={(e) =>
                          updateOutcome(outcome.id, {
                            priority: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="mb-4">
                    <span className="mb-2 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Condition
                    </span>
                    {outcome.conditions ? (
                      <ConditionBuilder
                        condition={outcome.conditions}
                        onChange={(conditions) =>
                          updateOutcome(outcome.id, { conditions })
                        }
                        fields={fields}
                        variables={variables}
                        fieldLabels={fieldLabels}
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateOutcome(outcome.id, {
                            conditions: {
                              type: "condition",
                              source: { type: "field", ref: "" },
                              operator: "always",
                            },
                          })
                        }
                      >
                        <Plus className="mr-1 size-3" />
                        Add condition
                      </Button>
                    )}
                  </div>

                  {/* Thank-you screen */}
                  <div className="mb-3">
                    <span className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      End screen
                    </span>
                    <div className="flex flex-col gap-2">
                      <Select
                        value={outcome.thankyouRef ?? "__none"}
                        onValueChange={(ref) =>
                          updateOutcome(outcome.id, {
                            thankyouRef: ref === "__none" ? undefined : ref,
                            redirectUrl: undefined,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select thank-you screen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">None</SelectItem>
                          {thankyouScreens.map((s) => (
                            <SelectItem key={s.ref} value={s.ref ?? ""}>
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-muted-foreground">
                        — or redirect to a URL —
                      </span>
                      <Input
                        className="h-8 text-xs"
                        placeholder="https://example.com/thank-you"
                        value={outcome.redirectUrl ?? ""}
                        onChange={(e) =>
                          updateOutcome(outcome.id, {
                            redirectUrl: e.target.value || undefined,
                            thankyouRef: undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
