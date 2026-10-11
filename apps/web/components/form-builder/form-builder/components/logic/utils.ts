import type { Condition, LogicAction, ValueReference, FormField } from "@repo/shared";

// ---------------------------------------------------------------------------
// Operator labels
// ---------------------------------------------------------------------------

export const OPERATOR_LABELS: Record<string, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  less_than: "is less than",
  less_than_or_equal: "is ≤",
  greater_than: "is greater than",
  greater_than_or_equal: "is ≥",
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
  always: "always",
  never: "never",
};

// ---------------------------------------------------------------------------
// Operators grouped by form field type
// ---------------------------------------------------------------------------

export const OPERATORS_BY_FIELD_TYPE: Record<string, string[]> = {
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

/** Operators that don't require a comparison value. */
export const NO_VALUE_OPERATORS = new Set([
  "always",
  "never",
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
  "is_selected",
  "is_not_selected",
]);

// ---------------------------------------------------------------------------
// Action type definitions (grouped by category)
// ---------------------------------------------------------------------------

export interface ActionTypeDef {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: string;
}

export const ACTION_CATEGORIES = [
  "Navigation",
  "Visibility",
  "Field behavior",
  "Value operations",
  "Variable operations",
  "Ending",
] as const;

export const ACTION_TYPES: ActionTypeDef[] = [
  // Navigation
  { type: "jump", label: "Jump to", icon: "ArrowRight", description: "Navigate to another question or screen", category: "Navigation" },
  { type: "skip_field", label: "Skip question", icon: "ArrowRight", description: "Skip a specific question", category: "Navigation" },
  { type: "skip_group", label: "Skip group", icon: "ArrowRight", description: "Skip an entire group of questions", category: "Navigation" },
  // Visibility
  { type: "show_field", label: "Show question", icon: "Eye", description: "Show a hidden question", category: "Visibility" },
  { type: "hide_field", label: "Hide question", icon: "EyeOff", description: "Hide a question", category: "Visibility" },
  { type: "show_group", label: "Show group", icon: "Eye", description: "Show a hidden group", category: "Visibility" },
  { type: "hide_group", label: "Hide group", icon: "EyeOff", description: "Hide a group of questions", category: "Visibility" },
  // Field behavior
  { type: "make_required", label: "Make required", icon: "Target", description: "Make a question required", category: "Field behavior" },
  { type: "make_optional", label: "Make optional", icon: "Target", description: "Make a question optional", category: "Field behavior" },
  { type: "enable_field", label: "Enable field", icon: "ToggleRight", description: "Enable a disabled field", category: "Field behavior" },
  { type: "disable_field", label: "Disable field", icon: "ToggleLeft", description: "Disable a field", category: "Field behavior" },
  // Value operations
  { type: "set_value", label: "Set value", icon: "Pencil", description: "Set a field's value", category: "Value operations" },
  { type: "clear_value", label: "Clear value", icon: "X", description: "Clear a field's value", category: "Value operations" },
  { type: "copy_value", label: "Copy value", icon: "Copy", description: "Copy a value from one field to another", category: "Value operations" },
  // Variable operations
  { type: "set_variable", label: "Set variable", icon: "Variable", description: "Set a variable to a value", category: "Variable operations" },
  { type: "add_variable", label: "Add to variable", icon: "Calculator", description: "Add a value to a variable", category: "Variable operations" },
  { type: "subtract_variable", label: "Subtract from variable", icon: "Calculator", description: "Subtract a value from a variable", category: "Variable operations" },
  { type: "multiply_variable", label: "Multiply variable", icon: "Calculator", description: "Multiply a variable by a value", category: "Variable operations" },
  { type: "divide_variable", label: "Divide variable", icon: "Calculator", description: "Divide a variable by a value", category: "Variable operations" },
  { type: "increment_variable", label: "Increment variable", icon: "Plus", description: "Add 1 to a variable", category: "Variable operations" },
  { type: "decrement_variable", label: "Decrement variable", icon: "Minus", description: "Subtract 1 from a variable", category: "Variable operations" },
  // Ending
  { type: "end_form", label: "End form", icon: "Zap", description: "End the form and show a screen", category: "Ending" },
  { type: "redirect", label: "Redirect", icon: "ExternalLink", description: "Redirect to an external URL", category: "Ending" },
];

/** Actions that require a variable target (string key, not ActionTarget). */
export const VARIABLE_ACTION_TYPES = new Set([
  "set_variable",
  "add_variable",
  "subtract_variable",
  "multiply_variable",
  "divide_variable",
  "increment_variable",
  "decrement_variable",
]);

/** Actions that require a field target only. */
export const FIELD_ONLY_TARGET_TYPES = new Set([
  "skip_field",
  "show_field",
  "hide_field",
  "make_required",
  "make_optional",
  "enable_field",
  "disable_field",
]);

/** Actions that require a value reference. */
export const VALUE_REF_ACTION_TYPES = new Set([
  "set_value",
  "set_variable",
  "add_variable",
  "subtract_variable",
  "multiply_variable",
  "divide_variable",
]);

/** Actions that require a source + target (both value references). */
export const COPY_ACTION_TYPES = new Set(["copy_value"]);

// ---------------------------------------------------------------------------
// Trigger labels
// ---------------------------------------------------------------------------

export const TRIGGER_LABELS: Record<string, string> = {
  field_changed: "When field changes",
  field_answered: "When field is answered",
  field_cleared: "When field is cleared",
  group_entered: "When group is entered",
  group_completed: "When group is completed",
  form_started: "When form starts",
  form_submitted: "When form is submitted",
  before_submit: "Before submit",
  after_submit: "After submit",
};

// ---------------------------------------------------------------------------
// Natural language describe helpers
// ---------------------------------------------------------------------------

export function describeValueReference(
  ref: ValueReference | undefined,
  fieldLabels?: Record<string, string>,
): string {
  if (!ref) return "(empty)";
  switch (ref.type) {
    case "field":
      return fieldLabels?.[ref.ref] ?? `"${ref.ref}"`;
    case "variable":
      return `variable "${ref.ref}"`;
    case "constant":
      if (ref.value === null) return "null";
      if (typeof ref.value === "string") return `"${ref.value}"`;
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

export function describeTarget(
  target: { type: string; ref: string } | undefined,
  fieldLabels?: Record<string, string>,
  groupLabels?: Record<string, string>,
): string {
  if (!target) return "(empty)";
  switch (target.type) {
    case "field":
      return fieldLabels?.[target.ref] ?? `"${target.ref}"`;
    case "group":
      return groupLabels?.[target.ref] ?? `group "${target.ref}"`;
    case "thankyou":
      return `thank-you screen "${target.ref}"`;
    case "outcome":
      return `outcome "${target.ref}"`;
    default:
      return `"${target.ref}"`;
  }
}

export function describeCondition(
  condition: Condition,
  fieldLabels?: Record<string, string>,
): string {
  switch (condition.type) {
    case "condition": {
      const source = describeValueReference(condition.source, fieldLabels);
      const op = OPERATOR_LABELS[condition.operator] ?? condition.operator;
      const val = describeValueReference(condition.value, fieldLabels);
      const needsVal = !NO_VALUE_OPERATORS.has(condition.operator);
      return needsVal ? `${source} ${op} ${val}` : `${source} ${op}`;
    }
    case "group": {
      const parts = condition.conditions.map((c: Condition) => describeCondition(c, fieldLabels));
      const joiner = condition.operator === "and" ? " AND " : " OR ";
      if (parts.length === 0) return "(empty group)";
      if (parts.length === 1) return parts[0];
      return parts.length <= 3 ? parts.join(joiner) : `(${parts.join(joiner)})`;
    }
    case "not":
      return `NOT (${describeCondition(condition.condition, fieldLabels)})`;
    default:
      return "unknown";
  }
}

export function describeAction(
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
      return (action as { type: string }).type;
  }
}

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

/** Build a label map from fields array. */
export function buildFieldLabels(fields: FormField[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const f of fields) {
    if (f.ref) labels[f.ref] = f.title || f.ref;
  }
  return labels;
}

/** Check if a field type has choices. */
export function fieldHasChoices(fieldType: string): boolean {
  return ["multiple_choice", "checkbox", "dropdown", "picture_choice", "ranking"].includes(fieldType);
}

/** Get choices from a field. */
export function getFieldChoices(
  field: FormField,
): Array<{ id?: string; label?: string; ref?: string; text?: string }> {
  return (field.properties?.choices as any[]) ?? [];
}
