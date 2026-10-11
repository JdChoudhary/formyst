/**
 * Condition Evaluator
 *
 * Recursively evaluates a condition tree (AND/OR/NOT with leaf conditions).
 * This is the core of the declarative logic system.
 */

import type {
  Condition,
  FormRuntimeState,
} from "../../types";
import { resolveValue } from "./valueResolver";
import { evaluateOperator } from "./operators";

// ---------------------------------------------------------------------------
// Evaluation context
// ---------------------------------------------------------------------------

export interface ConditionContext {
  /** Current runtime state */
  state: FormRuntimeState;
  /** Optional field answer getter */
  fieldAnswerGetter?: (ref: string) => unknown;
  /** Maximum recursion depth (default: 20) */
  maxDepth?: number;
}

// ---------------------------------------------------------------------------
// Main evaluator
// ---------------------------------------------------------------------------

/**
 * Recursively evaluate a condition tree.
 *
 * @param condition - The condition tree to evaluate
 * @param ctx - Evaluation context with runtime state
 * @returns boolean result
 */
export function evaluateCondition(
  condition: Condition,
  ctx: ConditionContext,
  depth = 0,
): boolean {
  const maxDepth = ctx.maxDepth ?? 20;

  // Prevent infinite recursion
  if (depth > maxDepth) {
    console.warn(
      `[FormEngine] Condition evaluation exceeded max depth (${maxDepth}). Stopping.`,
    );
    return false;
  }

  switch (condition.type) {
    case "condition":
      return evaluateLeafCondition(condition, ctx);

    case "group":
      return evaluateGroup(condition, ctx, depth);

    case "not":
      return !evaluateCondition(condition.condition, ctx, depth + 1);

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Group evaluation (AND/OR)
// ---------------------------------------------------------------------------

function evaluateGroup(
  group: { operator: "and" | "or"; conditions: Condition[] },
  ctx: ConditionContext,
  depth: number,
): boolean {
  if (group.conditions.length === 0) return false;

  // Short-circuit evaluation
  if (group.operator === "and") {
    for (const condition of group.conditions) {
      if (!evaluateCondition(condition, ctx, depth + 1)) {
        return false;
      }
    }
    return true;
  }

  // OR — at least one must be true
  for (const condition of group.conditions) {
    if (evaluateCondition(condition, ctx, depth + 1)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Leaf condition evaluation
// ---------------------------------------------------------------------------

function evaluateLeafCondition(
  condition: { source: any; operator: any; value?: any },
  ctx: ConditionContext,
): boolean {
  const left = resolveValue(
    condition.source,
    ctx.state,
    ctx.fieldAnswerGetter,
  );

  const right = condition.value
    ? resolveValue(condition.value, ctx.state, ctx.fieldAnswerGetter)
    : undefined;

  return evaluateOperator({
    operator: condition.operator,
    left,
    right,
  });
}

// ---------------------------------------------------------------------------
// Utility: Convert legacy flat condition to new recursive condition
// ---------------------------------------------------------------------------

/**
 * Convert a legacy flat condition (from form-schema.ts) to a new recursive
 * Condition tree. This preserves backward compatibility.
 *
 * Legacy format:
 *   { op: "equal", vars: [{ type: "field", value: "age" }, { type: "constant", value: 18 }] }
 *
 * New format:
 *   { type: "condition", source: { type: "field", ref: "age" }, operator: "equals", value: { type: "constant", value: 18 } }
 */
export function convertLegacyCondition(legacy: {
  op: string;
  vars: Array<{ type: string; value: string | number | boolean }>;
}): Condition {
  const operatorMap: Record<string, string> = {
    equal: "equals",
    is: "equals",
    not_equal: "not_equals",
    is_not: "not_equals",
    lower_than: "less_than",
    lower_equal_than: "less_than_or_equal",
    greater_than: "greater_than",
    greater_equal_than: "greater_than_or_equal",
    contains: "contains",
    not_contains: "not_contains",
    begins_with: "starts_with",
    ends_with: "ends_with",
    always: "always",
    on: "equals",
    not_on: "not_equals",
    earlier_than: "before",
    earlier_than_or_on: "before_or_on",
    later_than: "after",
    later_than_or_on: "after_or_on",
  };

  const vars = legacy.vars ?? [];
  const leftVar = vars[0];
  const rightVar = vars[1];

  // Map legacy var types to new value reference types
  function mapVarType(
    v: { type: string; value: string | number | boolean },
  ): ValueReference {
    switch (v.type) {
      case "field":
        return { type: "field", ref: String(v.value) };
      case "hidden":
        return { type: "field", ref: String(v.value) };
      case "variable":
        return { type: "variable", ref: String(v.value) };
      case "choice":
        return { type: "constant", value: v.value };
      case "constant":
        return { type: "constant", value: v.value };
      default:
        return { type: "constant", value: v.value };
    }
  }

  if (!leftVar) {
    return { type: "condition", source: { type: "constant", value: null }, operator: "always" };
  }

  const source = mapVarType(leftVar);
  const operator = (operatorMap[legacy.op] ?? legacy.op) as any;
  const value = rightVar ? mapVarType(rightVar) : undefined;

  return {
    type: "condition",
    source,
    operator,
    value,
  };
}

// Import ValueReference type for the convertLegacyCondition function
import type { ValueReference } from "../../types";
