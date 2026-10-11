"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  ArrowUp,
  ArrowDown,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  LogicRule,
  LogicAction,
  Condition,
  FormField,
  VariableDefinition,
} from "@repo/shared";
import { ConditionBuilder } from "./condition-builder";
import { ActionBuilder } from "./action-builder";
import {
  describeCondition,
  describeAction,
  generateId,
  TRIGGER_LABELS,
  buildFieldLabels,
} from "./utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RuleListProps {
  rules: LogicRule[];
  fields: FormField[];
  variables?: VariableDefinition[];
  thankyouScreens?: Array<{ ref?: string; title: string }>;
  outcomes?: Array<{ id: string; title: string }>;
  groups?: Array<{ id: string; ref?: string; title: string }>;
  onUpdate: (rules: LogicRule[]) => void;
  lintErrors?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RuleList({
  rules,
  fields,
  variables = [],
  thankyouScreens = [],
  outcomes = [],
  groups = [],
  onUpdate,
  lintErrors = {},
}: RuleListProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const fieldLabels = buildFieldLabels(fields);

  const addRule = () => {
    const newRule: LogicRule = {
      id: generateId("rule"),
      trigger: "field_changed",
      priority: rules.length,
      when: {
        type: "condition",
        source: { type: "field", ref: fields[0]?.ref ?? "" },
        operator: "always",
      },
      then: [],
    };
    onUpdate([...rules, newRule]);
    setExpandedRule(newRule.id);
  };

  const updateRule = (ruleId: string, updates: Partial<LogicRule>) => {
    onUpdate(rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)));
  };

  const deleteRule = (ruleId: string) => {
    onUpdate(rules.filter((r) => r.id !== ruleId));
    if (expandedRule === ruleId) setExpandedRule(null);
  };

  const duplicateRule = (ruleId: string) => {
    const source = rules.find((r) => r.id === ruleId);
    if (!source) return;
    const copy: LogicRule = {
      ...structuredClone(source),
      id: generateId("rule"),
      priority: rules.length,
    };
    const idx = rules.findIndex((r) => r.id === ruleId);
    const next = [...rules];
    next.splice(idx + 1, 0, copy);
    onUpdate(next);
    setExpandedRule(copy.id);
  };

  const moveRule = (ruleId: string, direction: -1 | 1) => {
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= rules.length) return;
    const next = [...rules];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    // Recompute priorities based on new order
    next.forEach((r, i) => {
      r.priority = i;
    });
    onUpdate(next);
  };

  // Add an action to a rule
  const addAction = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newAction: LogicAction = {
      type: "jump",
      target: { type: "field", ref: fields[0]?.ref ?? "" },
    };
    updateRule(ruleId, { then: [...rule.then, newAction] });
  };

  const updateAction = (ruleId: string, actionIdx: number, updated: LogicAction) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newActions = rule.then.map((a, i) => (i === actionIdx ? updated : a));
    updateRule(ruleId, { then: newActions });
  };

  const deleteAction = (ruleId: string, actionIdx: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    updateRule(ruleId, {
      then: rule.then.filter((_, i) => i !== actionIdx),
    });
  };

  // ---- Empty state ----
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <GitBranchIcon className="size-7 text-primary" />
        </div>
        <div className="max-w-sm">
          <h2 className="mb-1 font-semibold text-foreground text-lg">No logic rules yet</h2>
          <p className="text-muted-foreground text-sm">
            Create conditional branches to skip questions, jump to different sections, show/hide
            fields, or set variables based on answers.
          </p>
        </div>
        <Button onClick={addRule}>
          <Plus className="mr-1.5 size-4" />
          Add Logic Rule
        </Button>
      </div>
    );
  }

  // ---- Rule list ----
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Make your form react to answers</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Choose a question, choose an answer, then choose what should happen.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addRule}>
          <Plus className="mr-1 size-3.5" />
          Add rule
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {rules.map((rule, index) => {
            const errors = lintErrors[rule.id] ?? [];
            return (
              <Collapsible
                key={rule.id}
                onOpenChange={(open) => setExpandedRule(open ? rule.id : null)}
                open={expandedRule === rule.id}
              >
                {/* Card header */}
                <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/30">
                  {/* Priority / reorder */}
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <Button
                      className="size-5"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveRule(rule.id, -1);
                      }}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <span className="font-semibold text-foreground text-xs tabular-nums">
                      {rule.priority ?? index}
                    </span>
                    <Button
                      className="size-5"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveRule(rule.id, 1);
                      }}
                      disabled={index === rules.length - 1}
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {rule.trigger && (
                        <Badge className="text-[10px]" variant="secondary">
                          {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate font-medium text-foreground text-sm">
                      When {describeCondition(rule.when, fieldLabels)}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      Then{" "}
                      {rule.then.length > 0
                        ? rule.then.map((a) => describeAction(a, fieldLabels)).join("; ")
                        : "(no actions)"}
                    </div>
                  </div>

                  {/* Badges & actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge className="text-[10px]" variant="secondary">
                      {rule.then.length} action
                      {rule.then.length !== 1 ? "s" : ""}
                    </Badge>
                    {errors.length > 0 && (
                      <Badge className="text-[10px]" variant="destructive">
                        {errors.length} issue{errors.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Button
                      className="size-6"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateRule(rule.id);
                      }}
                      title="Duplicate rule"
                    >
                      <Copy className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      className="size-6"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRule(rule.id);
                      }}
                      title="Delete rule"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                    {expandedRule === rule.id ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>

                {/* Expanded editor */}
                <CollapsibleContent className="mt-2 rounded-xl border border-border/60 p-4">
                  {/* Lint errors for this rule */}
                  {errors.length > 0 && (
                    <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                      {errors.map((msg, i) => (
                        <p key={i} className="text-destructive text-xs">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Trigger & priority settings */}
                  <div className="mb-4 flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Trigger</span>
                      <Select
                        value={rule.trigger ?? "field_changed"}
                        onValueChange={(trigger) =>
                          updateRule(rule.id, {
                            trigger: trigger as LogicRule["trigger"],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-48 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Priority
                      </span>
                      <Input
                        className="h-8 w-20 text-xs"
                        type="number"
                        min={0}
                        value={rule.priority ?? index}
                        onChange={(e) =>
                          updateRule(rule.id, {
                            priority: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="mb-4">
                    <span className="mb-2 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      When this happens
                    </span>
                    <ConditionBuilder
                      condition={rule.when}
                      onChange={(when) => updateRule(rule.id, { when })}
                      fields={fields}
                      variables={variables}
                      fieldLabels={fieldLabels}
                    />
                  </div>

                  {/* Actions */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Then do this
                      </span>
                      <Button
                        className="h-6 text-[10px]"
                        size="sm"
                        variant="ghost"
                        onClick={() => addAction(rule.id)}
                      >
                        <Plus className="mr-1 size-3" />
                        Add action
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {rule.then.map((action, actionIdx) => (
                        <div key={actionIdx} className="flex items-start gap-2">
                          <span className="mt-2.5 shrink-0 text-primary text-xs">→</span>
                          <div className="min-w-0 flex-1">
                            <ActionBuilder
                              action={action}
                              onChange={(updated) => updateAction(rule.id, actionIdx, updated)}
                              fields={fields}
                              variables={variables}
                              thankyouScreens={thankyouScreens}
                              outcomes={outcomes}
                              groups={groups}
                              fieldLabels={fieldLabels}
                              compact
                            />
                          </div>
                          <Button
                            className="mt-2.5 size-7 shrink-0"
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteAction(rule.id, actionIdx)}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      {rule.then.length === 0 && (
                        <p className="py-2 text-muted-foreground text-xs italic">
                          No actions yet. Click &quot;Add action&quot; to add one.
                        </p>
                      )}
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

// Simple inline icon component
function GitBranchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" x2="6" y1="3" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}
