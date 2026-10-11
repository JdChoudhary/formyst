/**
 * Operator Registry
 *
 * Validates and executes comparison operators for the condition system.
 * Ensures type-safe operator/value combinations.
 */

import type {
  ComparisonOperator,
  ValueReference,
} from "../../types";
import {
  resolveValue,
  asNumber,
  asString,
  asDate,
  asBoolean,
  isEmpty,
} from "./valueResolver";
import type { FormRuntimeState } from "../../types";

// ---------------------------------------------------------------------------
// Operator categories
// ---------------------------------------------------------------------------

export type OperatorCategory =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "choice"
  | "multiSelect"
  | "general";

export const OPERATORS_BY_CATEGORY: Record<OperatorCategory, readonly ComparisonOperator[]> = {
  string: [
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ],
  number: [
    "equals",
    "not_equals",
    "less_than",
    "less_than_or_equal",
    "greater_than",
    "greater_than_or_equal",
  ],
  date: [
    "equals",
    "not_equals",
    "before",
    "before_or_on",
    "after",
    "after_or_on",
  ],
  boolean: ["is_true", "is_false"],
  choice: ["is_selected", "is_not_selected"],
  multiSelect: [
    "contains_choice",
    "does_not_contain_choice",
    "contains_any",
    "contains_all",
  ],
  general: ["always", "never"],
};

/**
 * Map field types to their valid operator categories.
 */
export const FIELD_TYPE_OPERATORS: Record<string, OperatorCategory> = {
  // Text fields
  short_text: "string",
  long_text: "string",
  email: "string",
  phone_number: "string",
  website: "string",

  // Number fields
  number: "number",
  rating: "number",
  nps: "number",
  opinion_scale: "number",

  // Choice fields
  multiple_choice: "choice",
  dropdown: "choice",
  picture_choice: "choice",
  yes_no: "choice",

  // Multi-select fields
  checkbox: "multiSelect",
  ranking: "multiSelect",

  // Boolean-like
  legal: "boolean",

  // Date
  date: "date",

  // Always valid
  statement: "general",
};

/**
 * Check if an operator is valid for a given field type.
 */
export function isValidOperatorForFieldType(
  operator: ComparisonOperator,
  fieldType: string,
): boolean {
  const category = FIELD_TYPE_OPERATORS[fieldType];
  if (!category) return false;

  // General operators are always valid
  if (category === "general") return true;

  const validOperators = OPERATORS_BY_CATEGORY[category];
  return validOperators.includes(operator as any);
}

/**
 * Get the valid operators for a given field type.
 */
export function getValidOperatorsForFieldType(fieldType: string): ComparisonOperator[] {
  const category = FIELD_TYPE_OPERATORS[fieldType];
  if (!category) return ["always", "never"];

  return [...OPERATORS_BY_CATEGORY[category]];
}

// ---------------------------------------------------------------------------
// Operator evaluation
// ---------------------------------------------------------------------------

interface EvaluateOperatorParams {
  operator: ComparisonOperator;
  left: unknown;
  right?: unknown;
}

/**
 * Evaluate a comparison operator.
 *
 * @returns boolean result of the comparison
 */
export function evaluateOperator(params: EvaluateOperatorParams): boolean {
  const { operator, left, right } = params;

  switch (operator) {
    // String operators
    case "equals":
      return asString(left) === asString(right);
    case "not_equals":
      return asString(left) !== asString(right);
    case "contains": {
      const needle = asString(right);
      if (Array.isArray(left)) {
        return left.some((item) => asString(item).toLowerCase().includes(needle.toLowerCase()));
      }
      return asString(left).toLowerCase().includes(needle.toLowerCase());
    }
    case "not_contains": {
      const needle = asString(right);
      if (Array.isArray(left)) {
        return !left.some((item) => asString(item).toLowerCase().includes(needle.toLowerCase()));
      }
      return !asString(left).toLowerCase().includes(needle.toLowerCase());
    }
    case "starts_with":
      return asString(left).toLowerCase().startsWith(asString(right).toLowerCase());
    case "ends_with":
      return asString(left).toLowerCase().endsWith(asString(right).toLowerCase());
    case "is_empty":
      return isEmpty(left);
    case "is_not_empty":
      return !isEmpty(left);

    // Number operators
    case "less_than": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a < b;
    }
    case "less_than_or_equal": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a <= b;
    }
    case "greater_than": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a > b;
    }
    case "greater_than_or_equal": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a >= b;
    }

    // Date operators
    case "before": {
      const a = asDate(left);
      const b = asDate(right);
      return a !== null && b !== null && a.getTime() < b.getTime();
    }
    case "before_or_on": {
      const a = asDate(left);
      const b = asDate(right);
      return a !== null && b !== null && a.getTime() <= b.getTime();
    }
    case "after": {
      const a = asDate(left);
      const b = asDate(right);
      return a !== null && b !== null && a.getTime() > b.getTime();
    }
    case "after_or_on": {
      const a = asDate(left);
      const b = asDate(right);
      return a !== null && b !== null && a.getTime() >= b.getTime();
    }

    // Boolean operators
    case "is_true":
      return asBoolean(left) === true;
    case "is_false":
      return asBoolean(left) === false || asBoolean(left) === null;

    // Choice operators
    case "is_selected": {
      if (Array.isArray(left)) {
        return left.includes(right);
      }
      return left === right;
    }
    case "is_not_selected": {
      if (Array.isArray(left)) {
        return !left.includes(right);
      }
      return left !== right;
    }

    // Multi-select operators
    case "contains_choice": {
      if (Array.isArray(left)) {
        return left.includes(right);
      }
      return left === right;
    }
    case "does_not_contain_choice": {
      if (Array.isArray(left)) {
        return !left.includes(right);
      }
      return left !== right;
    }
    case "contains_any": {
      if (Array.isArray(left) && Array.isArray(right)) {
        return right.some((r) => left.includes(r));
      }
      return false;
    }
    case "contains_all": {
      if (Array.isArray(left) && Array.isArray(right)) {
        return right.every((r) => left.includes(r));
      }
      return false;
    }

    // General operators
    case "always":
      return true;
    case "never":
      return false;

    default:
      return false;
  }
}
