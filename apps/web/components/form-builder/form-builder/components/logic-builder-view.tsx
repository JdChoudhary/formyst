"use client";

import { useState } from "react";
import {
  ArrowRight,
  GitBranch,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Calculator,
  Variable,
  Target,
  Zap,
  Info,
  Sparkles,
  Copy,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  FormSchema,
  FormField,
  LogicRule,
  LogicAction,
  Condition,
  ValueReference,
  ScoringRule,
} from "@repo/shared";

type ComparisonOperator =
  | "equals" | "not_equals" | "contains" | "not_contains"
  | "starts_with" | "ends_with" | "is_empty" | "is_not_empty"
  | "less_than" | "less_than_or_equal" | "greater_than" | "greater_than_or_equal"
  | "before" | "before_or_on" | "after" | "after_or_on"
  | "is_true" | "is_false"
  | "is_selected" | "is_not_selected"
  | "contains_choice" | "does_not_contain_choice" | "contains_any" | "contains_all"
  | "always" | "never";
import { getFieldByRef } from "@repo/shared";

interface LogicBuilderViewProps {
  schema: FormSchema;
  onSchemaUpdate: (updates: Partial<FormSchema>) => void;
}

// Operator labels for display
const OPERATOR_LABELS: Record<string, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  less_than: "is less than",
  less_than_or_equal: "is less than or equal to",
  greater_than: "is greater than",
  greater_than_or_equal: "is greater than or equal to",
  before: "is before",
  before_or_on: "is before or on",
  after: "is after",
  after_or_on: "is after or on",
  is_true: "is true",
  is_false: "is false",
  is_selected: "is selected",
  is_not_selected: "is not selected",
  always: "always",
  never: "never",
};

// Operators grouped by field type
const OPERATORS_BY_FIELD_TYPE: Record<string, string[]> = {
  short_text: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
  long_text: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
  email: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
  number: ["equals", "not_equals", "less_than", "less_than_or_equal", "greater_than", "greater_than_or_equal"],
  rating: ["equals", "not_equals", "less_than", "less_than_or_equal", "greater_than", "greater_than_or_equal"],
  opinion_scale: ["equals", "not_equals", "less_than", "less_than_or_equal", "greater_than", "greater_than_or_equal"],
  nps: ["equals", "not_equals", "less_than", "less_than_or_equal", "greater_than", "greater_than_or_equal"],
  multiple_choice: ["is_selected", "is_not_selected"],
  checkbox: ["contains_choice", "does_not_contain_choice", "contains_any", "contains_all"],
  dropdown: ["equals", "not_equals"],
  yes_no: ["is_true", "is_false"],
  legal: ["is_true", "is_false"],
  date: ["equals", "not_equals", "before", "before_or_on", "after", "after_or_on"],
  statement: ["always"],
};

// Action types
const ACTION_TYPES = [
  { type: "jump", label: "Jump to", icon: ArrowRight, description: "Navigate to another question" },
  { type: "skip_field", label: "Skip question", icon: ArrowRight, description: "Skip a specific question" },
  { type: "show_field", label: "Show question", icon: Eye, description: "Show a hidden question" },
  { type: "hide_field", label: "Hide question", icon: EyeOff, description: "Hide a question" },
  { type: "make_required", label: "Make required", icon: Target, description: "Make a question required" },
  { type: "make_optional", label: "Make optional", icon: Target, description: "Make a question optional" },
  { type: "set_variable", label: "Set variable", icon: Variable, description: "Set a variable value" },
  { type: "add_variable", label: "Add to variable", icon: Calculator, description: "Add to a variable" },
  { type: "end_form", label: "End form", icon: Zap, description: "End the form" },
];

export function LogicBuilderView({ schema, onSchemaUpdate }: LogicBuilderViewProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rules" | "recall" | "scoring">("rules");

  const fields = schema.fields ?? [];
  const logicRules = schema.logic ?? [];
  const scoringRules = schema.scoring ?? [];
  const variableDefinitions = schema.variableDefinitions ?? [];

  // Add a new logic rule
  const addLogicRule = () => {
    const newRule: LogicRule = {
      id: `rule-${Date.now()}`,
      trigger: "field_changed",
      priority: logicRules.length,
      when: {
        type: "condition",
        source: { type: "field", ref: "" },
        operator: "always",
      },
      then: [],
    };
    onSchemaUpdate({ logic: [...logicRules, newRule] });
    setExpandedRule(newRule.id);
  };

  // Update a logic rule
  const updateLogicRule = (ruleId: string, updates: Partial<LogicRule>) => {
    const updatedRules = logicRules.map((r) =>
      r.id === ruleId ? { ...r, ...updates } : r
    );
    onSchemaUpdate({ logic: updatedRules });
  };

  // Delete a logic rule
  const deleteLogicRule = (ruleId: string) => {
    const updatedRules = logicRules.filter((r) => r.id !== ruleId);
    onSchemaUpdate({ logic: updatedRules });
    if (expandedRule === ruleId) setExpandedRule(null);
  };

  // Add an action to a rule
  const addActionToRule = (ruleId: string) => {
    const rule = logicRules.find((r) => r.id === ruleId);
    if (!rule) return;

    const newAction: LogicAction = { type: "jump", target: { type: "field", ref: "" } };
    updateLogicRule(ruleId, { then: [...rule.then, newAction] });
  };

  // Update an action in a rule
  const updateAction = (ruleId: string, actionIndex: number, updates: Partial<LogicAction>) => {
    const rule = logicRules.find((r) => r.id === ruleId);
    if (!rule) return;

    const updatedActions = rule.then.map((a, i) =>
      i === actionIndex ? ({ ...a, ...updates } as LogicAction) : a
    );
    updateLogicRule(ruleId, { then: updatedActions });
  };

  // Delete an action from a rule
  const deleteAction = (ruleId: string, actionIndex: number) => {
    const rule = logicRules.find((r) => r.id === ruleId);
    if (!rule) return;

    const updatedActions = rule.then.filter((_, i) => i !== actionIndex);
    updateLogicRule(ruleId, { then: updatedActions });
  };

  // Update condition
  const updateCondition = (ruleId: string, condition: Condition) => {
    updateLogicRule(ruleId, { when: condition });
  };

  // Add scoring rule
  const addScoringRule = () => {
    const newRule: ScoringRule = {
      id: `score-${Date.now()}`,
      fieldRef: "",
      correctAnswers: [],
      points: 1,
    };
    onSchemaUpdate({ scoring: [...scoringRules, newRule] });
  };

  // Update scoring rule
  const updateScoringRule = (ruleId: string, updates: Partial<ScoringRule>) => {
    const updatedRules = scoringRules.map((r) =>
      r.id === ruleId ? { ...r, ...updates } : r
    );
    onSchemaUpdate({ scoring: updatedRules });
  };

  // Delete scoring rule
  const deleteScoringRule = (ruleId: string) => {
    const updatedRules = scoringRules.filter((r) => r.id !== ruleId);
    onSchemaUpdate({ scoring: updatedRules });
  };

  // Add variable definition
  const addVariableDefinition = () => {
    const newVar = {
      key: `variable_${Date.now()}`,
      type: "number" as const,
      defaultValue: 0,
    };
    onSchemaUpdate({ variableDefinitions: [...variableDefinitions, newVar] });
  };

  // Update variable definition
  const updateVariableDefinition = (key: string, updates: Partial<{ key: string; type: "number" | "string" | "boolean" | "date"; defaultValue: string | number | boolean | null }>) => {
    const updatedVars = variableDefinitions.map((v) =>
      v.key === key ? { ...v, ...updates } : v
    );
    onSchemaUpdate({ variableDefinitions: updatedVars });
  };

  // Delete variable definition
  const deleteVariableDefinition = (key: string) => {
    const updatedVars = variableDefinitions.filter((v) => v.key !== key);
    onSchemaUpdate({ variableDefinitions: updatedVars });
  };

  // Render value reference selector
  const renderValueReference = (
    value: ValueReference | undefined,
    onChange: (val: ValueReference) => void,
    showScore?: boolean
  ) => {
    const refType = value?.type ?? "constant";

    return (
      <div className="flex flex-col gap-2">
        <Select
          value={refType}
          onValueChange={(type) => {
            switch (type) {
              case "field":
                onChange({ type: "field", ref: "" });
                break;
              case "variable":
                onChange({ type: "variable", ref: "" });
                break;
              case "constant":
                onChange({ type: "constant", value: "" });
                break;
              case "score":
                onChange({ type: "score" });
                break;
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="field">Field answer</SelectItem>
            <SelectItem value="variable">Variable</SelectItem>
            <SelectItem value="constant">Constant value</SelectItem>
            {showScore && <SelectItem value="score">Score</SelectItem>}
          </SelectContent>
        </Select>

        {refType === "field" && (
          <Select
            value={value?.type === "field" ? value.ref : ""}
            onValueChange={(ref) => onChange({ type: "field", ref })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {fields.map((f) => (
                <SelectItem key={f.ref} value={f.ref ?? ""}>
                  {f.title || f.ref}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {refType === "variable" && (
          <Input
            className="h-8 text-xs"
            placeholder="Variable name"
            value={value?.type === "variable" ? value.ref : ""}
            onChange={(e) => onChange({ type: "variable", ref: e.target.value })}
          />
        )}

        {refType === "constant" && (
          <Input
            className="h-8 text-xs"
            placeholder="Value"
            value={value?.type === "constant" ? String(value.value) : ""}
            onChange={(e) => onChange({ type: "constant", value: e.target.value })}
          />
        )}
      </div>
    );
  };

  // Render condition editor
  const renderConditionEditor = (
    condition: Condition,
    onChange: (cond: Condition) => void
  ) => {
    if (condition.type === "group") {
      return (
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-2">
            <Select
              value={condition.operator}
              onValueChange={(op) =>
                onChange({ ...condition, operator: op as "and" | "or" })
              }
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND</SelectItem>
                <SelectItem value="or">OR</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">all conditions must be true</span>
          </div>
          {condition.conditions.map((c: Condition, i: number) => (
            <div key={i} className="flex flex-col gap-2">
              {renderConditionEditor(c, (updated) => {
                const newConditions = [...condition.conditions];
                newConditions[i] = updated;
                onChange({ ...condition, conditions: newConditions });
              })}
            </div>
          ))}
          <Button
            className="h-7 text-xs"
            size="sm"
            variant="outline"
            onClick={() => {
              const newCondition: Condition = {
                type: "condition",
                source: { type: "field", ref: "" },
                operator: "equals",
              };
              onChange({
                ...condition,
                conditions: [...condition.conditions, newCondition],
              });
            }}
          >
            <Plus className="mr-1 size-3" />
            Add condition
          </Button>
        </div>
      );
    }

    // Simple condition
    const sourceField = fields.find((f) => f.ref === condition.source?.ref);
    const sourceFieldType = sourceField?.type ?? "short_text";
    const validOperators = OPERATORS_BY_FIELD_TYPE[sourceFieldType] ?? OPERATORS_BY_FIELD_TYPE.short_text;

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">If</span>
          {renderValueReference(condition.source, (source) =>
            onChange({ ...condition, source })
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={condition.operator}
            onValueChange={(op) =>
              onChange({ ...condition, operator: op as ComparisonOperator })
            }
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validOperators.map((op) => (
                <SelectItem key={op} value={op}>
                  {OPERATOR_LABELS[op] ?? op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!["always", "never", "is_empty", "is_not_empty", "is_true", "is_false"].includes(
            condition.operator
          ) &&
            renderValueReference(condition.value, (val) =>
              onChange({ ...condition, value: val })
            )}
        </div>
      </div>
    );
  };

  // Render action editor
  const renderActionEditor = (
    ruleId: string,
    action: LogicAction,
    index: number
  ) => {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
        <div className="flex items-center gap-2">
          <Select
            value={action.type}
            onValueChange={(type) => {
              // Reset action based on type
              switch (type) {
                case "jump":
                  updateAction(ruleId, index, { type: "jump", target: { type: "field", ref: "" } });
                  break;
                case "skip_field":
                  updateAction(ruleId, index, { type: "skip_field", target: { type: "field", ref: "" } });
                  break;
                case "show_field":
                  updateAction(ruleId, index, { type: "show_field", target: { type: "field", ref: "" } });
                  break;
                case "hide_field":
                  updateAction(ruleId, index, { type: "hide_field", target: { type: "field", ref: "" } });
                  break;
                case "make_required":
                  updateAction(ruleId, index, { type: "make_required", target: { type: "field", ref: "" } });
                  break;
                case "make_optional":
                  updateAction(ruleId, index, { type: "make_optional", target: { type: "field", ref: "" } });
                  break;
                case "set_variable":
                  updateAction(ruleId, index, { type: "set_variable", target: "", value: { type: "constant", value: "" } });
                  break;
                case "add_variable":
                  updateAction(ruleId, index, { type: "add_variable", target: "", value: { type: "constant", value: 0 } });
                  break;
                case "end_form":
                  updateAction(ruleId, index, { type: "end_form" });
                  break;
              }
            }}
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((at) => (
                <SelectItem key={at.type} value={at.type}>
                  {at.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="h-8 w-8"
            size="icon"
            variant="ghost"
            onClick={() => deleteAction(ruleId, index)}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Target field selector for jump/skip/show/hide/require/optional */}
        {"target" in action && action.target && typeof action.target === "object" && "ref" in action.target && (
          <Select
            value={(action.target as { ref: string }).ref}
            onValueChange={(ref) => {
              updateAction(ruleId, index, {
                ...action,
                target: { ...(action.target as object), ref } as any,
              } as any);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              {fields.map((f) => (
                <SelectItem key={f.ref} value={f.ref ?? ""}>
                  {f.title || f.ref}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Variable name for set_variable/add_variable */}
        {"target" in action && typeof (action as any).target === "string" && (
          <Input
            className="h-8 text-xs"
            placeholder="Variable name"
            value={(action as any).target}
            onChange={(e) => {
              if ("value" in action) {
                updateAction(ruleId, index, {
                  ...action,
                  target: e.target.value,
                } as any);
              }
            }}
          />
        )}

        {/* Value for set_variable/add_variable */}
        {"value" in action && typeof (action as any).value === "object" && (
          <div className="mt-1">
            <span className="mb-1 block text-xs text-muted-foreground">Value:</span>
            {renderValueReference((action as any).value as ValueReference, (val) => {
              updateAction(ruleId, index, {
                ...action,
                value: val,
              } as any);
            })}
          </div>
        )}

        {/* Thankyou screen for end_form */}
        {action.type === "end_form" && (
          <Select
            value={action.target?.ref ?? ""}
            onValueChange={(ref) =>
              updateAction(ruleId, index, {
                type: "end_form",
                target: { type: "thankyou", ref },
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select thank you screen" />
            </SelectTrigger>
            <SelectContent>
              {(schema.thankyou_screens ?? []).map((screen) => (
                <SelectItem key={screen.ref} value={screen.ref ?? ""}>
                  {screen.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  // Describe condition in natural language
  const describeCondition = (condition: Condition): string => {
    if (condition.type === "group") {
      const parts = condition.conditions.map(describeCondition);
      const connector = condition.operator === "and" ? " AND " : " OR ";
      return parts.join(connector);
    }
    if (condition.type === "not") {
      return `NOT (${describeCondition(condition.condition)})`;
    }
    if (condition.type === "condition") {
      const sourceField = fields.find((f) => f.ref === condition.source?.ref);
      const sourceName = sourceField?.title || condition.source?.ref || "unknown";
      const op = OPERATOR_LABELS[condition.operator] ?? condition.operator;
      const valueRef = condition.value;
      let valueName = "";
      if (valueRef) {
        if (valueRef.type === "field") {
          const targetField = fields.find((f) => f.ref === valueRef.ref);
          valueName = targetField?.title || valueRef.ref;
        } else if (valueRef.type === "constant") {
          valueName = String(valueRef.value);
        } else if (valueRef.type === "variable") {
          valueName = `variable "${valueRef.ref}"`;
        } else if (valueRef.type === "score") {
          valueName = "score";
        }
      }
      return valueName ? `"${sourceName}" ${op} ${valueName}` : `"${sourceName}" ${op}`;
    }
    return "unknown condition";
  };

  // Describe action in natural language
  const describeAction = (action: LogicAction): string => {
    switch (action.type) {
      case "jump": {
        const t = action.target;
        if (t.type === "thankyou") return "Jump to thank-you screen";
        if (t.type === "outcome") return "Jump to outcome";
        const targetField = fields.find((f) => f.ref === t.ref);
        return `Jump to "${targetField?.title || t.ref}"`;
      }
      case "skip_field": {
        const targetField = fields.find((f) => f.ref === action.target.ref);
        return `Skip "${targetField?.title || action.target.ref}"`;
      }
      case "show_field": {
        const targetField = fields.find((f) => f.ref === action.target.ref);
        return `Show "${targetField?.title || action.target.ref}"`;
      }
      case "hide_field": {
        const targetField = fields.find((f) => f.ref === action.target.ref);
        return `Hide "${targetField?.title || action.target.ref}"`;
      }
      case "make_required": {
        const targetField = fields.find((f) => f.ref === action.target.ref);
        return `Make "${targetField?.title || action.target.ref}" required`;
      }
      case "make_optional": {
        const targetField = fields.find((f) => f.ref === action.target.ref);
        return `Make "${targetField?.title || action.target.ref}" optional`;
      }
      case "set_variable":
        return `Set variable "${action.target}"`;
      case "add_variable":
        return `Add to variable "${action.target}"`;
      case "end_form":
        return "End form";
      default:
        return action.type;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs className="flex h-full flex-col" value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="border-border border-b px-4">
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger className="gap-1.5 text-xs" value="rules">
              <GitBranch className="size-3.5" />
              Logic Rules
              {logicRules.length > 0 && (
                <Badge className="ml-1 h-4 px-1 text-[10px]" variant="secondary">
                  {logicRules.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger className="gap-1.5 text-xs" value="recall">
              <Variable className="size-3.5" />
              Recall Info
            </TabsTrigger>
            <TabsTrigger className="gap-1.5 text-xs" value="scoring">
              <Calculator className="size-3.5" />
              Scoring
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Logic Rules Tab */}
          <TabsContent className="h-full" value="rules">
            <div className="p-4">
              {logicRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <GitBranch aria-hidden="true" className="size-7 text-primary" />
                  </div>
                  <div className="max-w-sm">
                    <h2 className="mb-1 font-semibold text-foreground text-lg">
                      No logic rules yet
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Create conditional branches to skip questions, jump to different sections,
                      or show/hide fields based on answers.
                    </p>
                  </div>
                  <Button onClick={addLogicRule}>
                    <Plus className="mr-1.5 size-4" />
                    Add Logic Rule
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm">
                      Logic Rules ({logicRules.length})
                    </h3>
                    <Button size="sm" variant="outline" onClick={addLogicRule}>
                      <Plus className="mr-1 size-3.5" />
                      Add Rule
                    </Button>
                  </div>

                  {logicRules.map((rule, index) => (
                    <Collapsible
                      key={rule.id}
                      onOpenChange={(open) => setExpandedRule(open ? rule.id : null)}
                      open={expandedRule === rule.id}
                    >
                      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/30">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-foreground text-sm">
                            {describeCondition(rule.when)}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {rule.then.length} action{rule.then.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <Badge className="shrink-0 text-[10px]" variant="secondary">
                          {rule.then.length} action{rule.then.length !== 1 ? "s" : ""}
                        </Badge>
                        {expandedRule === rule.id ? (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 rounded-xl border border-border/60 p-4">
                        {/* Condition */}
                        <div className="mb-4">
                          <span className="mb-2 block text-xs font-medium text-muted-foreground">
                            Condition
                          </span>
                          {renderConditionEditor(rule.when, (condition) =>
                            updateCondition(rule.id, condition)
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Actions
                            </span>
                            <Button
                              className="h-6 text-[10px]"
                              size="sm"
                              variant="ghost"
                              onClick={() => addActionToRule(rule.id)}
                            >
                              <Plus className="mr-1 size-3" />
                              Add action
                            </Button>
                          </div>
                          <div className="flex flex-col gap-2">
                            {rule.then.map((action, actionIndex) => (
                              <div key={actionIndex} className="flex items-start gap-2">
                                <ArrowRight className="mt-2 size-3.5 shrink-0 text-primary" />
                                <div className="flex-1">
                                  {renderActionEditor(rule.id, action, actionIndex)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delete rule */}
                        <Button
                          className="h-7 w-full text-xs"
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLogicRule(rule.id)}
                        >
                          <Trash2 className="mr-1 size-3" />
                          Delete rule
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Recall Information Tab */}
          <TabsContent className="h-full" value="recall">
            <div className="p-4">
              <div className="mb-4">
                <h3 className="mb-2 font-medium text-foreground text-sm">
                  Recall Information
                </h3>
                <p className="mb-4 text-muted-foreground text-xs">
                  Use recall information to personalize your form by referencing answers from previous questions.
                  Use the syntax <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{"{{field:field_ref}}"}</code> to reference field answers.
                </p>
              </div>

              <div className="mb-4 rounded-lg border border-border/60 p-3">
                <span className="mb-2 block text-xs font-medium text-muted-foreground">
                  Available fields for recall:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {fields.map((f) => (
                    <Badge
                      key={f.ref}
                      className="cursor-pointer text-[10px]"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{field:${f.ref}}}`);
                      }}
                    >
                      <Copy className="mr-1 size-2.5" />
                      {f.title || f.ref}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mb-4 rounded-lg border border-border/60 p-3">
                <span className="mb-2 block text-xs font-medium text-muted-foreground">
                  Variable recall:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="text-[10px]" variant="outline">
                    {"{{var:score}}"}
                  </Badge>
                  <Badge className="text-[10px]" variant="outline">
                    {"{{var:price}}"}
                  </Badge>
                  {variableDefinitions.map((v) => (
                    <Badge
                      key={v.key}
                      className="cursor-pointer text-[10px]"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{var:${v.key}}}`);
                      }}
                    >
                      <Copy className="mr-1 size-2.5" />
                      {`{{var:${v.key}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <span className="mb-2 block text-xs font-medium text-muted-foreground">
                  Variable Definitions
                </span>
                <p className="mb-2 text-xs text-muted-foreground">
                  Define custom variables to use in logic rules and recall information.
                </p>
                <div className="flex flex-col gap-2">
                  {variableDefinitions.map((v) => (
                    <div key={v.key} className="flex items-center gap-2">
                      <Input
                        className="h-7 flex-1 text-xs"
                        placeholder="Variable name"
                        value={v.key}
                        onChange={(e) => updateVariableDefinition(v.key, { key: e.target.value })}
                      />
                      <Select
                        value={v.type}
                        onValueChange={(type) =>
                          updateVariableDefinition(v.key, {
                            type: type as "number" | "string" | "boolean" | "date",
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        className="h-7 w-7"
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteVariableDefinition(v.key)}
                      >
                        <Trash2 className="size-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <Button className="h-7 text-xs" size="sm" variant="outline" onClick={addVariableDefinition}>
                    <Plus className="mr-1 size-3" />
                    Add Variable
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent className="h-full" value="scoring">
            <div className="p-4">
              <div className="mb-4">
                <h3 className="mb-2 font-medium text-foreground text-sm">
                  Scoring & Price
                </h3>
                <p className="mb-4 text-muted-foreground text-xs">
                  Configure scoring rules to award points for correct answers.
                  Use recall to display scores to respondents.
                </p>
              </div>

              {scoringRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Calculator aria-hidden="true" className="size-7 text-primary" />
                  </div>
                  <div className="max-w-sm">
                    <h2 className="mb-1 font-semibold text-foreground text-lg">
                      No scoring rules yet
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Add scoring rules to award points for correct answers in quizzes and assessments.
                    </p>
                  </div>
                  <Button onClick={addScoringRule}>
                    <Plus className="mr-1.5 size-4" />
                    Add Scoring Rule
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm">
                      Scoring Rules ({scoringRules.length})
                    </h3>
                    <Button size="sm" variant="outline" onClick={addScoringRule}>
                      <Plus className="mr-1 size-3.5" />
                      Add Rule
                    </Button>
                  </div>

                  {scoringRules.map((rule) => {
                    const targetField = fields.find((f) => f.ref === rule.fieldRef);
                    return (
                      <div
                        key={rule.id}
                        className="rounded-xl border border-border/60 bg-card p-4 shadow-xs"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="text-[10px]" variant="secondary">
                              {rule.points} point{rule.points !== 1 ? "s" : ""}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {targetField?.title || "Select field"}
                            </span>
                          </div>
                          <Button
                            className="h-6 w-6"
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteScoringRule(rule.id)}
                          >
                            <Trash2 className="size-3 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-16 text-xs text-muted-foreground">Field:</span>
                            <Select
                              value={rule.fieldRef}
                              onValueChange={(ref) => updateScoringRule(rule.id, { fieldRef: ref })}
                            >
                              <SelectTrigger className="h-8 flex-1 text-xs">
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {fields.map((f) => (
                                  <SelectItem key={f.ref} value={f.ref ?? ""}>
                                    {f.title || f.ref}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-16 text-xs text-muted-foreground">Points:</span>
                            <Input
                              className="h-8 w-20 text-xs"
                              min="1"
                              type="number"
                              value={rule.points}
                              onChange={(e) =>
                                updateScoringRule(rule.id, {
                                  points: parseInt(e.target.value) || 1,
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-16 text-xs text-muted-foreground">Correct:</span>
                            <Input
                              className="h-8 flex-1 text-xs"
                              placeholder="Comma-separated values"
                              value={rule.correctAnswers.join(", ")}
                              onChange={(e) =>
                                updateScoringRule(rule.id, {
                                  correctAnswers: e.target.value.split(",").map((v) => v.trim()),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
