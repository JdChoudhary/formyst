"use client";

import {
  ArrowRight,
  GitBranch,
  Info,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import type { FormSchema, LogicRule, Condition, LogicAction } from "@repo/shared";
import { getFieldByRef } from "@repo/shared";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkflowViewProps {
  schema: FormSchema;
}

const OP_LABELS: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
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

function fieldTitle(schema: FormSchema, ref: string): string {
  const field = getFieldByRef(schema, ref);
  return field?.title || ref;
}

function describeValueRef(
  ref: { type: string; ref?: string; value?: unknown; choiceRef?: string; fieldRef?: string; key?: string },
  schema: FormSchema,
): string {
  switch (ref.type) {
    case "field":
      return fieldTitle(schema, ref.ref ?? "");
    case "variable":
      return `variable "${ref.ref}"`;
    case "constant":
      return typeof ref.value === "string" ? `"${ref.value}"` : String(ref.value);
    case "score":
      return "score";
    case "system":
      return `system.${ref.key}`;
    default:
      return String(ref);
  }
}

function describeConditionTree(condition: Condition, schema: FormSchema): string {
  switch (condition.type) {
    case "condition": {
      const left = describeValueRef(condition.source, schema);
      const op = OP_LABELS[condition.operator] ?? condition.operator;
      const right = condition.value ? describeValueRef(condition.value, schema) : "";
      return right ? `${left} ${op} ${right}` : `${left} ${op}`;
    }
    case "group": {
      const connector = condition.operator === "and" ? "AND" : "OR";
      const parts = condition.conditions.map((c: Condition) => describeConditionTree(c, schema));
      if (parts.length === 1) return parts[0];
      return parts.join(` ${connector} `);
    }
    case "not":
      return `NOT (${describeConditionTree(condition.condition, schema)})`;
    default:
      return "unknown condition";
  }
}

function describeCondition(rule: LogicRule, schema: FormSchema): string {
  return `If ${describeConditionTree(rule.when, schema)}`;
}

function describeAction(action: LogicAction, schema: FormSchema): string {
  switch (action.type) {
    case "jump": {
      const t = action.target;
      if (t.type === "thankyou") return "Jump to thank-you screen";
      if (t.type === "outcome") return "Jump to outcome";
      if (t.type === "field") return `Jump to "${fieldTitle(schema, t.ref)}"`;
      if (t.type === "group") return `Jump to group "${t.ref}"`;
      return "Jump";
    }
    case "skip_field":
      return `Skip "${fieldTitle(schema, action.target.ref)}"`;
    case "skip_group":
      return `Skip group "${action.target.ref}"`;
    case "show_field":
      return `Show "${fieldTitle(schema, action.target.ref)}"`;
    case "hide_field":
      return `Hide "${fieldTitle(schema, action.target.ref)}"`;
    case "show_group":
      return `Show group "${action.target.ref}"`;
    case "hide_group":
      return `Hide group "${action.target.ref}"`;
    case "make_required":
      return `Make "${fieldTitle(schema, action.target.ref)}" required`;
    case "make_optional":
      return `Make "${fieldTitle(schema, action.target.ref)}" optional`;
    case "enable_field":
      return `Enable "${fieldTitle(schema, action.target.ref)}"`;
    case "disable_field":
      return `Disable "${fieldTitle(schema, action.target.ref)}"`;
    case "set_value":
      return `Set "${fieldTitle(schema, action.target.type === "field" ? action.target.ref : "")}"`;
    case "set_variable":
      return `Set variable "${action.target}"`;
    case "end_form":
      return "End form";
    case "redirect":
      return `Redirect to ${action.url}`;
    default:
      return action.type;
  }
}

export const WorkflowView: React.FC<WorkflowViewProps> = ({ schema }) => {
  const rules = schema.logic ?? [];

  if (rules.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <GitBranch aria-hidden="true" className="size-7 text-primary" />
        </div>
        <div className="max-w-sm">
          <h2 className="mb-1 font-semibold text-foreground text-lg">
            No workflow rules yet
          </h2>
          <p className="text-muted-foreground text-sm">
            Branch your form based on answers — skip questions, jump to a
            thank-you screen, or route respondents to different outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-muted-foreground text-sm">
          <Info aria-hidden="true" className="size-4" />
          Logic rules are coming soon to this view.
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 p-6">
        <div className="mb-2 flex items-center gap-2">
          <GitBranch aria-hidden="true" className="size-4 text-primary" />
          <h2 className="font-semibold text-foreground">Workflow</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {rules.length} rule{rules.length !== 1 ? "s" : ""}
          </span>
        </div>

        {rules.map((rule, index) => (
          <div
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
            key={`${rule.id}-${index}`}
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                {index + 1}
              </span>
              {describeCondition(rule, schema)}
            </div>

            <div className="ml-7 flex flex-col gap-2 border-l-2 border-muted pl-4">
              {rule.then.map((action, actionIndex) => (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  key={`${rule.id}-${index}-${actionIndex}`}
                >
                  <MessageSquareText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60" />
                  <span className="font-medium text-foreground">
                    {describeAction(action, schema)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-muted-foreground text-sm">
          <Sparkles aria-hidden="true" className="size-4" />
          <span>
            Add more rules with conditional logic — jump, skip, and branch like
            Typeform.
          </span>
          <ArrowRight aria-hidden="true" className="ml-auto size-4" />
        </div>
      </div>
    </ScrollArea>
  );
};
