/**
 * Form Engine — Core Types
 *
 * Declarative logic and branching engine for Typeform-like form builders.
 * This file defines the complete type system for conditions, actions,
 * value references, triggers, and runtime state.
 */

// ---------------------------------------------------------------------------
// Value References — how the engine refers to data sources
// ---------------------------------------------------------------------------

export type ValueReference =
  | { type: "field"; ref: string }
  | { type: "variable"; ref: string }
  | { type: "constant"; value: string | number | boolean | null }
  | { type: "choice"; fieldRef: string; choiceRef: string }
  | { type: "score" }
  | {
      type: "system";
      key:
        | "currentStep"
        | "currentPage"
        | "progress"
        | "submissionCount";
    };

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

export type StringComparisonOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

export type NumberComparisonOperator =
  | "equals"
  | "not_equals"
  | "less_than"
  | "less_than_or_equal"
  | "greater_than"
  | "greater_than_or_equal";

export type DateComparisonOperator =
  | "equals"
  | "not_equals"
  | "before"
  | "before_or_on"
  | "after"
  | "after_or_on";

export type BooleanComparisonOperator = "is_true" | "is_false";

export type ChoiceComparisonOperator =
  | "is_selected"
  | "is_not_selected";

export type MultiSelectComparisonOperator =
  | "contains_choice"
  | "does_not_contain_choice"
  | "contains_any"
  | "contains_all";

export type GeneralOperator = "always" | "never";

export type ComparisonOperator =
  | StringComparisonOperator
  | NumberComparisonOperator
  | DateComparisonOperator
  | BooleanComparisonOperator
  | ChoiceComparisonOperator
  | MultiSelectComparisonOperator
  | GeneralOperator;

// ---------------------------------------------------------------------------
// Operators grouped by what they operate on
// ---------------------------------------------------------------------------

export const OPERATOR_GROUPS = {
  string: [
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ] as const,
  number: [
    "equals",
    "not_equals",
    "less_than",
    "less_than_or_equal",
    "greater_than",
    "greater_than_or_equal",
  ] as const,
  date: [
    "equals",
    "not_equals",
    "before",
    "before_or_on",
    "after",
    "after_or_on",
  ] as const,
  boolean: ["is_true", "is_false"] as const,
  choice: ["is_selected", "is_not_selected"] as const,
  multiSelect: [
    "contains_choice",
    "does_not_contain_choice",
    "contains_any",
    "contains_all",
  ] as const,
  general: ["always", "never"] as const,
} as const;

// ---------------------------------------------------------------------------
// Condition — recursive condition tree
// ---------------------------------------------------------------------------

export type Condition =
  | {
      type: "condition";
      source: ValueReference;
      operator: ComparisonOperator;
      value?: ValueReference;
    }
  | {
      type: "group";
      operator: "and" | "or";
      conditions: Condition[];
    }
  | {
      type: "not";
      condition: Condition;
    };

// ---------------------------------------------------------------------------
// Action Target — where an action points to
// ---------------------------------------------------------------------------

export type ActionTarget =
  | { type: "field"; ref: string }
  | { type: "group"; ref: string }
  | { type: "thankyou"; ref: string }
  | { type: "outcome"; ref: string };

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type LogicAction =
  // Navigation
  | { type: "jump"; target: ActionTarget }
  | { type: "skip_field"; target: { type: "field"; ref: string } }
  | { type: "skip_group"; target: { type: "group"; ref: string } }

  // Visibility
  | { type: "show_field"; target: { type: "field"; ref: string } }
  | { type: "hide_field"; target: { type: "field"; ref: string } }
  | { type: "show_group"; target: { type: "group"; ref: string } }
  | { type: "hide_group"; target: { type: "group"; ref: string } }

  // Field behavior
  | { type: "make_required"; target: { type: "field"; ref: string } }
  | { type: "make_optional"; target: { type: "field"; ref: string } }
  | { type: "enable_field"; target: { type: "field"; ref: string } }
  | { type: "disable_field"; target: { type: "field"; ref: string } }

  // Value operations
  | {
      type: "set_value";
      target: ActionTarget;
      value: ValueReference;
    }
  | { type: "clear_value"; target: ActionTarget }
  | {
      type: "copy_value";
      source: ValueReference;
      target: ActionTarget;
    }

  // Variable operations
  | {
      type: "set_variable";
      target: string;
      value: ValueReference;
    }
  | {
      type: "add_variable";
      target: string;
      value: ValueReference;
    }
  | {
      type: "subtract_variable";
      target: string;
      value: ValueReference;
    }
  | {
      type: "multiply_variable";
      target: string;
      value: ValueReference;
    }
  | {
      type: "divide_variable";
      target: string;
      value: ValueReference;
    }
  | { type: "increment_variable"; target: string }
  | { type: "decrement_variable"; target: string }

  // Ending
  | {
      type: "end_form";
      target?: { type: "thankyou"; ref: string };
    }
  | {
      type: "redirect";
      url: string;
    };

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export type LogicTrigger =
  | "field_changed"
  | "field_answered"
  | "field_cleared"
  | "group_entered"
  | "group_completed"
  | "form_started"
  | "form_submitted"
  | "before_submit"
  | "after_submit";

// ---------------------------------------------------------------------------
// Logic Rule — the core declarative rule
// ---------------------------------------------------------------------------

export interface LogicRule {
  id: string;
  /** When to evaluate this rule */
  trigger?: LogicTrigger;
  /** Which field refs trigger evaluation of this rule */
  sourceRefs?: string[];
  /** Priority — higher values execute first */
  priority?: number;
  /** The condition tree to evaluate */
  when: Condition;
  /** Actions to execute when condition is true */
  then: LogicAction[];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoringRule {
  id: string;
  fieldRef: string;
  correctAnswers: (string | number)[];
  points: number;
  /** Points deducted for wrong answer (default 0) */
  negativePoints?: number;
  /** Allow partial points for partial matches */
  partialPoints?: boolean;
}

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

export interface Outcome {
  id: string;
  title: string;
  description?: string;
  /** Condition tree to determine if this outcome matches */
  conditions?: Condition;
  /** Priority — lower number = higher priority (evaluated first) */
  priority?: number;
  /** Reference to a thankyou screen */
  thankyouRef?: string;
  /** Redirect URL */
  redirectUrl?: string;
}

// ---------------------------------------------------------------------------
// Variable definitions
// ---------------------------------------------------------------------------

export interface VariableDefinition {
  key: string;
  type: "number" | "string" | "boolean" | "date";
  defaultValue?: string | number | boolean | null;
}

// ---------------------------------------------------------------------------
// Calculation expressions (safe, no eval)
// ---------------------------------------------------------------------------

export type CalculationOperand =
  | { type: "variable"; ref: string }
  | { type: "field"; ref: string }
  | { type: "constant"; value: number }
  | { type: "score" };

export type CalculationOperator = "add" | "subtract" | "multiply" | "divide";

export interface CalculationExpression {
  target: string; // variable key to store result in
  left: CalculationOperand;
  operator: CalculationOperator;
  right: CalculationOperand;
}

// ---------------------------------------------------------------------------
// Runtime State — consumed by renderers
// ---------------------------------------------------------------------------

export interface FormRuntimeState {
  answers: Record<string, unknown>;
  variables: Record<string, unknown>;
  visibility: Record<string, boolean>;
  enabled: Record<string, boolean>;
  required: Record<string, boolean>;
  currentFieldRef?: string;
  currentGroupRef?: string;
  visitedFields: string[];
  completedFields: string[];
  score: number;
  progress: number;
  outcome?: string;
  /** Navigation override from jump actions */
  navigationOverride?: string | "thankyou" | null;
  /** Fields/groups that should be skipped */
  skipRefs?: string[];
}

// ---------------------------------------------------------------------------
// Evaluation Result — returned by engine methods
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  variables: Record<string, unknown>;
  visibility: Record<string, boolean>;
  enabled: Record<string, boolean>;
  required: Record<string, boolean>;
  navigation: string | "thankyou" | null;
  score: number;
  outcome?: string;
  /** Fields/groups that should be skipped */
  skipRefs: string[];
  /** Values that should be set on fields */
  fieldValues: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Engine Configuration
// ---------------------------------------------------------------------------

export interface LogicEngineConfig {
  /** The form schema (fields, groups, logic, variables, outcomes, etc.) */
  form: {
    fields: Array<{
      ref?: string;
      title: string;
      type: string;
      properties?: Record<string, unknown>;
      validations?: Record<string, unknown>;
    }>;
    groups?: Array<{
      id: string;
      ref?: string;
      title: string;
      fieldIds: string[];
    }>;
    logic?: LogicRule[];
    variables?: Record<string, unknown>;
    thankyou_screens?: Array<{
      ref?: string;
      title: string;
      type?: string;
      properties?: Record<string, unknown>;
    }>;
    outcomes?: Outcome[];
    scoring?: ScoringRule[];
    settings?: Record<string, unknown>;
  };
}


