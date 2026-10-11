"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  ArrowRight,
  Eye,
  EyeOff,
  Calculator,
  Variable,
  Target,
  Zap,
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
  FormField,
  FormSchema,
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

interface LogicRulesPanelProps {
  field: FormField;
  formSchema: FormSchema;
  onFieldUpdate: (field: FormField) => void;
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

export function LogicRulesPanel({
  field,
  formSchema,
  onFieldUpdate,
  onSchemaUpdate,
}: LogicRulesPanelProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<"logic" | "recall" | "scoring">("logic");

  const fieldRef = field.ref ?? "";
  const logicRules = formSchema.logic ?? [];
  const fieldRules = logicRules.filter((r) => r.sourceRefs?.includes(fieldRef));
  const scoringRules = formSchema.scoring ?? [];
  const fieldScoring = scoringRules.filter((s) => s.fieldRef === fieldRef);

  // Get available fields for value references (excluding current field)
  const availableFields = (formSchema.fields ?? []).filter((f) => f.ref !== fieldRef);

  // Add a new logic rule for this field
  const addLogicRule = () => {
    const newRule: LogicRule = {
      id: `rule-${Date.now()}`,
      trigger: "field_changed",
      sourceRefs: [fieldRef],
      priority: fieldRules.length,
      when: {
        type: "condition",
        source: { type: "field", ref: fieldRef },
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
      i === actionIndex ? { ...a, ...updates } as LogicAction : a
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
      fieldRef,
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
              {availableFields.map((f) => (
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
                source: { type: "field", ref: fieldRef },
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
    const sourceFieldType = availableFields.find((f) => f.ref === condition.source?.ref)?.type ?? "short_text";
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
              {availableFields.map((f) => (
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
        {"value" in action && typeof action.value === "object" && (
          <div className="mt-1">
            <span className="mb-1 text-xs text-muted-foreground">Value:</span>
            {renderValueReference(action.value as ValueReference, (val) => {
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
              {(formSchema.thankyou_screens ?? []).map((screen) => (
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

  return (
    <div className="flex flex-col gap-3">
      {/* Section tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
        {[
          { key: "logic" as const, label: "Logic", icon: GitBranch },
          { key: "recall" as const, label: "Recall", icon: Variable },
          { key: "scoring" as const, label: "Scoring", icon: Calculator },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              expandedSection === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setExpandedSection(key)}
            type="button"
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Logic Rules Section */}
      {expandedSection === "logic" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {fieldRules.length} rule{fieldRules.length !== 1 ? "s" : ""}
            </span>
            <Button
              className="h-7 text-xs"
              size="sm"
              variant="outline"
              onClick={addLogicRule}
            >
              <Plus className="mr-1 size-3" />
              Add rule
            </Button>
          </div>

          {fieldRules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
              <GitBranch className="mx-auto mb-2 size-6 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                No logic rules for this field. Add a rule to create conditional branching.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fieldRules.map((rule) => (
                <Collapsible
                  key={rule.id}
                  onOpenChange={(open) => setExpandedRule(open ? rule.id : null)}
                  open={expandedRule === rule.id}
                >
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted/60">
                    <GitBranch className="size-3.5 shrink-0 text-primary" />
                    <span className="flex-1 truncate">
                      {rule.when.type === "condition" && rule.when.operator === "always"
                        ? "Always execute"
                        : `If condition is true`}
                    </span>
                    <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
                      {rule.then.length} action{rule.then.length !== 1 ? "s" : ""}
                    </Badge>
                    {expandedRule === rule.id ? (
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 rounded-lg border border-border/60 p-3">
                    {/* Condition */}
                    <div className="mb-3">
                      <span className="mb-2 block text-xs font-medium text-muted-foreground">
                        Condition
                      </span>
                      {renderConditionEditor(rule.when, (condition) =>
                        updateCondition(rule.id, condition)
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mb-3">
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
      )}

      {/* Recall Information Section */}
      {expandedSection === "recall" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-3 text-xs text-muted-foreground">
              Use recall information to personalize your form by referencing answers from previous questions.
              Use the syntax <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{"{{field:field_ref}}"}</code> to reference field answers.
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Available fields for recall:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableFields.map((f) => (
                  <Badge
                    key={f.ref}
                    className="cursor-pointer text-[10px]"
                    variant="outline"
                    onClick={() => {
                      // Copy to clipboard
                      navigator.clipboard.writeText(`{{field:${f.ref}}}`);
                    }}
                  >
                    {`{{field:${f.ref}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <span className="mb-2 block text-xs font-medium text-muted-foreground">
              Recall in field title
            </span>
            <p className="mb-2 text-xs text-muted-foreground">
              You can use recall syntax in your field title to personalize the question.
            </p>
            <Input
              className="h-8 text-xs"
              placeholder={`e.g., "What's your name, {{field:previous_field}}?"`}
              value={field.title}
              onChange={(e) => onFieldUpdate({ ...field, title: e.target.value })}
            />
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <span className="mb-2 block text-xs font-medium text-muted-foreground">
              Recall in field description
            </span>
            <p className="mb-2 text-xs text-muted-foreground">
              Use recall syntax in descriptions to provide context based on previous answers.
            </p>
            <Input
              className="h-8 text-xs"
              placeholder={`e.g., "You rated {{field:rating_field}} earlier. Tell us why."`}
              value={field.properties?.description ?? ""}
              onChange={(e) =>
                onFieldUpdate({
                  ...field,
                  properties: { ...field.properties, description: e.target.value },
                })
              }
            />
          </div>
        </div>
      )}

      {/* Scoring & Price Section */}
      {expandedSection === "scoring" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Scoring rules for this field
            </span>
            <Button
              className="h-7 text-xs"
              size="sm"
              variant="outline"
              onClick={addScoringRule}
            >
              <Plus className="mr-1 size-3" />
              Add scoring
            </Button>
          </div>

          {fieldScoring.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
              <Calculator className="mx-auto mb-2 size-6 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                No scoring rules for this field. Add scoring to award points for correct answers.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fieldScoring.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Badge className="text-[10px]" variant="secondary">
                      {rule.points} point{rule.points !== 1 ? "s" : ""}
                    </Badge>
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
                      <span className="text-xs text-muted-foreground">Points:</span>
                      <Input
                        className="h-7 w-20 text-xs"
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
                      <span className="text-xs text-muted-foreground">Correct answers:</span>
                      <Input
                        className="h-7 flex-1 text-xs"
                        placeholder="Comma-separated values"
                        value={rule.correctAnswers.join(", ")}
                        onChange={(e) =>
                          updateScoringRule(rule.id, {
                            correctAnswers: e.target.value.split(",").map((v) => v.trim()),
                          })
                        }
                      />
                    </div>
                    {rule.negativePoints !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Negative points:</span>
                        <Input
                          className="h-7 w-20 text-xs"
                          min="0"
                          type="number"
                          value={rule.negativePoints}
                          onChange={(e) =>
                            updateScoringRule(rule.id, {
                              negativePoints: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Price configuration for choice fields */}
          {["multiple_choice", "checkbox", "dropdown", "picture_choice"].includes(field.type) && (
            <div className="mt-2 rounded-lg border border-border/60 p-3">
              <span className="mb-2 block text-xs font-medium text-muted-foreground">
                Price configuration
              </span>
              <p className="mb-2 text-xs text-muted-foreground">
                Set prices for this field. Use recall to display total price.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Price:</span>
                  <Input
                    className="h-7 w-24 text-xs"
                    placeholder="0.00"
                    type="number"
                    onChange={(e) => {
                      // Update price in field properties
                      onFieldUpdate({
                        ...field,
                        properties: {
                          ...field.properties,
                          price: {
                            type: "fixed",
                            value: {
                              type: "constant",
                              amount: e.target.value,
                            },
                          },
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
