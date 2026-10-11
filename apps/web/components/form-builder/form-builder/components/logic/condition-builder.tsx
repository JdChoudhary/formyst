"use client";

import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Condition, FormField, VariableDefinition } from "@repo/shared";
import { ValueReferencePicker } from "./value-reference-picker";
import { OPERATORS_BY_FIELD_TYPE, OPERATOR_LABELS, NO_VALUE_OPERATORS, generateId } from "./utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConditionBuilderProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  fields: FormField[];
  variables?: VariableDefinition[];
  fieldLabels?: Record<string, string>;
  /** Nesting depth (0 = top level). Controls visual indentation. */
  depth?: number;
  /** Disable editing (for read-only / preview mode). */
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConditionBuilder({
  condition,
  onChange,
  fields,
  variables = [],
  fieldLabels,
  depth = 0,
  readOnly = false,
}: ConditionBuilderProps) {
  if (condition.type === "not") {
    return (
      <NotConditionBuilder
        condition={condition}
        onChange={onChange}
        fields={fields}
        variables={variables}
        fieldLabels={fieldLabels}
        depth={depth}
        readOnly={readOnly}
      />
    );
  }

  if (condition.type === "group") {
    return (
      <GroupConditionBuilder
        condition={condition}
        onChange={onChange}
        fields={fields}
        variables={variables}
        fieldLabels={fieldLabels}
        depth={depth}
        readOnly={readOnly}
      />
    );
  }

  return (
    <LeafConditionBuilder
      condition={condition}
      onChange={onChange}
      fields={fields}
      variables={variables}
      fieldLabels={fieldLabels}
      readOnly={readOnly}
    />
  );
}

// ---------------------------------------------------------------------------
// Leaf condition (single comparison)
// ---------------------------------------------------------------------------

function LeafConditionBuilder({
  condition,
  onChange,
  fields,
  variables,
  fieldLabels,
  readOnly,
}: Omit<ConditionBuilderProps, "depth">) {
  const sourceField = fields.find((f) => f.ref === condition.source?.ref);
  const sourceFieldType = sourceField?.type ?? "short_text";
  const validOperators =
    OPERATORS_BY_FIELD_TYPE[sourceFieldType] ?? OPERATORS_BY_FIELD_TYPE.short_text;
  const needsValue = !NO_VALUE_OPERATORS.has(condition.operator);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background p-3">
      {/* Plain-language condition */}
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">When</span>
        <div className="min-w-0 flex-1">
          <ValueReferencePicker
            value={condition.source}
            onChange={(source) => onChange({ ...condition, source })}
            fields={fields}
            variables={variables}
            fieldLabels={fieldLabels}
            allowedTypes={["field", "variable"]}
            placeholder="Choose a question"
            compact
          />
        </div>
      </div>

      {/* Operator + value */}
      <div className="flex items-start gap-2">
        <span className="w-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <Select
            value={condition.operator}
            onValueChange={(op) => {
              const needsVal = !NO_VALUE_OPERATORS.has(op);
              onChange({
                ...condition,
                operator: op as Condition extends { operator: infer T } ? T : never,
                value: needsVal ? condition.value : undefined,
              });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose what to check" />
            </SelectTrigger>
            <SelectContent>
              {validOperators.map((op) => (
                <SelectItem key={op} value={op}>
                  {OPERATOR_LABELS[op] ?? op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Value (only if operator requires it) */}
      {needsValue && (
        <div className="flex items-start gap-2">
          <span className="w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <ValueReferencePicker
              value={condition.value}
              onChange={(val) => onChange({ ...condition, value: val })}
              fields={fields}
              variables={variables}
              fieldLabels={fieldLabels}
              allowedTypes={["field", "variable", "constant"]}
              placeholder="Choose an answer"
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group condition (AND / OR)
// ---------------------------------------------------------------------------

function GroupConditionBuilder({
  condition,
  onChange,
  fields,
  variables,
  fieldLabels,
  depth = 0,
  readOnly,
}: ConditionBuilderProps) {
  const addCondition = () => {
    const newCondition: Condition = {
      type: "condition",
      source: { type: "field", ref: "" },
      operator: "equals",
    };
    onChange({
      ...condition,
      conditions: [...condition.conditions, newCondition],
    });
  };

  const addGroup = () => {
    const newGroup: Condition = {
      type: "group",
      operator: "and",
      conditions: [
        {
          type: "condition",
          source: { type: "field", ref: "" },
          operator: "always",
        },
      ],
    };
    onChange({
      ...condition,
      conditions: [...condition.conditions, newGroup],
    });
  };

  const updateCondition = (index: number, updated: Condition) => {
    const next = [...condition.conditions];
    next[index] = updated;
    onChange({ ...condition, conditions: next });
  };

  const removeCondition = (index: number) => {
    const next = condition.conditions.filter((_c: Condition, i: number) => i !== index);
    if (next.length === 0) {
      // Replace with a default leaf so the group is never empty
      onChange({
        ...condition,
        conditions: [
          {
            type: "condition",
            source: { type: "field", ref: "" },
            operator: "always",
          },
        ],
      });
    } else {
      onChange({ ...condition, conditions: next });
    }
  };

  const wrapInNot = (index: number) => {
    const target = condition.conditions[index];
    if (target.type === "not") {
      // Unwrap NOT
      updateCondition(index, target.condition);
    } else {
      updateCondition(index, { type: "not", condition: target });
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        depth === 0 ? "border-border/60 bg-muted/20" : "border-border/40 bg-background",
      )}
    >
      {/* AND / OR selector */}
      <div className="mb-2 flex items-center gap-2">
        <Select
          value={condition.operator}
          onValueChange={(op) => onChange({ ...condition, operator: op as "and" | "or" })}
          disabled={readOnly}
        >
          <SelectTrigger className="h-7 w-20 text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">AND</SelectItem>
            <SelectItem value="or">OR</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[11px] text-muted-foreground">
          {condition.operator === "and" ? "all conditions must match" : "any condition can match"}
        </span>
      </div>

      {/* Sub-conditions */}
      <div className="flex flex-col gap-2">
        {condition.conditions.map((sub: Condition, i: number) => (
          <div key={i} className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <ConditionBuilder
                condition={sub}
                onChange={(updated) => updateCondition(i, updated)}
                fields={fields}
                variables={variables}
                fieldLabels={fieldLabels}
                depth={depth + 1}
                readOnly={readOnly}
              />
            </div>
            {!readOnly && (
              <div className="flex shrink-0 flex-col gap-0.5 pt-1">
                <Button
                  className="size-6"
                  size="icon"
                  variant="ghost"
                  title={sub.type === "not" ? "Remove NOT" : "Add NOT"}
                  onClick={() => wrapInNot(i)}
                >
                  {sub.type === "not" ? (
                    <ToggleRight className="size-3.5 text-primary" />
                  ) : (
                    <ToggleLeft className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  className="size-6"
                  size="icon"
                  variant="ghost"
                  title="Remove condition"
                  onClick={() => removeCondition(i)}
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add buttons */}
      {!readOnly && (
        <div className="mt-2 flex items-center gap-1.5">
          <Button className="h-6 text-[10px]" size="sm" variant="outline" onClick={addCondition}>
            <Plus className="mr-1 size-2.5" />
            Add condition
          </Button>
          <Button className="h-6 text-[10px]" size="sm" variant="outline" onClick={addGroup}>
            <Plus className="mr-1 size-2.5" />
            Add group
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NOT wrapper
// ---------------------------------------------------------------------------

function NotConditionBuilder({
  condition,
  onChange,
  fields,
  variables,
  fieldLabels,
  depth = 0,
  readOnly,
}: ConditionBuilderProps) {
  return (
    <div className="rounded-lg border border-dashed border-orange-300/60 bg-orange-50/30 p-3 dark:border-orange-700/40 dark:bg-orange-950/20">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-[10px] text-orange-700 dark:bg-orange-900 dark:text-orange-300">
          NOT
        </span>
        <span className="text-[11px] text-muted-foreground">this must be false</span>
      </div>
      <ConditionBuilder
        condition={condition.condition}
        onChange={(inner) => onChange({ type: "not", condition: inner })}
        fields={fields}
        variables={variables}
        fieldLabels={fieldLabels}
        depth={depth + 1}
        readOnly={readOnly}
      />
    </div>
  );
}
