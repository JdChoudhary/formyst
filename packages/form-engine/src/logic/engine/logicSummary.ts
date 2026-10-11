/**
 * Logic Summary Generator
 *
 * Generates human-readable summaries of logic rules.
 * This helps users understand complex branching logic in the builder.
 *
 * Example output:
 *   "If Age is less than 18 AND Country is India
 *    → Show "Parent consent"
 *    → Make "Parent consent" required"
 */

import type {
  LogicRule,
  Condition,
  LogicAction,
  ValueReference,
  ComparisonOperator,
} from "../../types";

// ---------------------------------------------------------------------------
// Summary generator
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable summary of a logic rule.
 */
export function generateRuleSummary(
  rule: LogicRule,
  fieldLabels?: Record<string, string>,
): string {
  const parts: string[] = [];

  // WHEN clause
  parts.push(`If ${generateConditionSummary(rule.when, fieldLabels)}`);

  // THEN clause
  if (rule.then.length > 0) {
    const actionSummaries = rule.then.map((action) =>
      generateActionSummary(action, fieldLabels),
    );
    parts.push(actionSummaries.map((s) => `→ ${s}`).join("\n"));
  }

  return parts.join("\n");
}

/**
 * Generate a summary of a condition tree.
 */
export function generateConditionSummary(
  condition: Condition,
  fieldLabels?: Record<string, string>,
): string {
  switch (condition.type) {
    case "condition":
      return generateLeafSummary(condition, fieldLabels);

    case "group": {
      const operator = condition.operator === "and" ? "AND" : "OR";
      const summaries = condition.conditions.map((c) =>
        generateConditionSummary(c, fieldLabels),
      );

      if (summaries.length === 1) return summaries[0] ?? "";
      if (summaries.length === 2) {
        return `${summaries[0] ?? ""} ${operator} ${summaries[1] ?? ""}`;
      }

      return `(${summaries.join(` ${operator} `)})`;
    }

    case "not": {
      const inner = generateConditionSummary(condition.condition, fieldLabels);
      return `NOT (${inner})`;
    }

    default:
      return "Unknown condition";
  }
}

/**
 * Generate a summary of a leaf condition.
 */
function generateLeafSummary(
  condition: { source: ValueReference; operator: ComparisonOperator; value?: ValueReference },
  fieldLabels?: Record<string, string>,
): string {
  const source = describeValueReference(condition.source, fieldLabels);
  const operator = describeOperator(condition.operator);

  if (condition.operator === "always") return "always true";
  if (condition.operator === "never") return "always false";
  if (condition.operator === "is_empty") return `${source} is empty`;
  if (condition.operator === "is_not_empty") return `${source} is not empty`;

  if (!condition.value) return `${source} ${operator}`;

  const value = describeValueReference(condition.value, fieldLabels);
  return `${source} ${operator} ${value}`;
}

/**
 * Generate a summary of an action.
 */
export function generateActionSummary(
  action: LogicAction,
  fieldLabels?: Record<string, string>,
): string {
  switch (action.type) {
    case "jump":
      return `Jump to ${describeTarget(action.target, fieldLabels)}`;

    case "skip_field":
      return `Skip ${describeTarget(action.target, fieldLabels)}`;

    case "skip_group":
      return `Skip group ${describeTarget(action.target, fieldLabels)}`;

    case "show_field":
      return `Show "${describeTarget(action.target, fieldLabels)}"`;

    case "hide_field":
      return `Hide "${describeTarget(action.target, fieldLabels)}"`;

    case "show_group":
      return `Show group "${describeTarget(action.target, fieldLabels)}"`;

    case "hide_group":
      return `Hide group "${describeTarget(action.target, fieldLabels)}"`;

    case "make_required":
      return `Make "${describeTarget(action.target, fieldLabels)}" required`;

    case "make_optional":
      return `Make "${describeTarget(action.target, fieldLabels)}" optional`;

    case "enable_field":
      return `Enable "${describeTarget(action.target, fieldLabels)}"`;

    case "disable_field":
      return `Disable "${describeTarget(action.target, fieldLabels)}"`;

    case "set_value":
      return `Set "${describeTarget(action.target, fieldLabels)}" to ${describeValueReference(action.value, fieldLabels)}`;

    case "clear_value":
      return `Clear "${describeTarget(action.target, fieldLabels)}"`;

    case "copy_value":
      return `Copy ${describeValueReference(action.source, fieldLabels)} to "${describeTarget(action.target, fieldLabels)}"`;

    case "set_variable":
      return `Set variable "${action.target}" to ${describeValueReference(action.value, fieldLabels)}`;

    case "add_variable":
      return `Add ${describeValueReference(action.value, fieldLabels)} to "${action.target}"`;

    case "subtract_variable":
      return `Subtract ${describeValueReference(action.value, fieldLabels)} from "${action.target}"`;

    case "multiply_variable":
      return `Multiply "${action.target}" by ${describeValueReference(action.value, fieldLabels)}`;

    case "divide_variable":
      return `Divide "${action.target}" by ${describeValueReference(action.value, fieldLabels)}`;

    case "increment_variable":
      return `Increment "${action.target}"`;

    case "decrement_variable":
      return `Decrement "${action.target}"`;

    case "end_form":
      return action.target
        ? `End form with "${describeTarget(action.target, fieldLabels)}"`
        : "End form";

    case "redirect":
      return `Redirect to ${action.url}`;

    default:
      return "Unknown action";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeValueReference(
  ref: ValueReference,
  fieldLabels?: Record<string, string>,
): string {
  switch (ref.type) {
    case "field":
      return fieldLabels?.[ref.ref] ?? `"${ref.ref}"`;
    case "variable":
      return `variable "${ref.ref}"`;
    case "constant":
      if (typeof ref.value === "string") return `"${ref.value}"`;
      if (ref.value === null) return "null";
      return String(ref.value);
    case "choice":
      return `choice "${ref.choiceRef}" in ${fieldLabels?.[ref.fieldRef] ?? `"${ref.fieldRef}"`}`;
    case "score":
      return "score";
    case "system":
      return `system.${ref.key}`;
    default:
      return "unknown";
  }
}

function describeTarget(
  target: { type: string; ref: string },
  fieldLabels?: Record<string, string>,
): string {
  switch (target.type) {
    case "field":
      return fieldLabels?.[target.ref] ?? `"${target.ref}"`;
    case "group":
      return `group "${target.ref}"`;
    case "thankyou":
      return `thank you screen "${target.ref}"`;
    case "outcome":
      return `outcome "${target.ref}"`;
    default:
      return `"${target.ref}"`;
  }
}

function describeOperator(operator: ComparisonOperator): string {
  const descriptions: Record<string, string> = {
    equals: "is",
    not_equals: "is not",
    contains: "contains",
    not_contains: "does not contain",
    starts_with: "starts with",
    ends_with: "ends with",
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
    contains_choice: "contains",
    does_not_contain_choice: "does not contain",
    contains_any: "contains any of",
    contains_all: "contains all of",
    is_empty: "is empty",
    is_not_empty: "is not empty",
    always: "always",
    never: "never",
  };

  return descriptions[operator] ?? operator;
}
