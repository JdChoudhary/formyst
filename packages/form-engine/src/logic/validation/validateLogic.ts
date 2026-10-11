/**
 * Logic Validator
 *
 * Validates the logic configuration for:
 * - Invalid references (field, group, variable, outcome)
 * - Type incompatibilities (e.g., number field with string operator)
 * - Navigation issues (jumping to non-existent fields)
 * - Cycles (infinite navigation loops)
 * - Unreachable nodes
 * - Contradictory rules
 * - Invalid operator/value combinations
 */

import type {
  LogicRule,
  Condition,
  LogicAction,
  LogicEngineConfig,
  ValueReference,
  ComparisonOperator,
} from "../../types";
import { FIELD_TYPE_OPERATORS, getValidOperatorsForFieldType } from "../conditions/operators";

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationError {
  type: "error" | "warning";
  ruleId?: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

export function validateLogic(
  config: LogicEngineConfig,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const rules = config.form.logic ?? [];
  const fieldRefs = new Set(
    config.form.fields.map((f) => f.ref).filter((r): r is string => Boolean(r)),
  );
  const fieldTypes: Record<string, string> = {};
  for (const field of config.form.fields) {
    if (field.ref) {
      fieldTypes[field.ref] = field.type;
    }
  }
  const groupRefs = new Set(
    (config.form.groups ?? [])
      .map((g) => g.ref ?? g.id)
      .filter((r): r is string => Boolean(r)),
  );
  const thankyouRefs = new Set(
    (config.form.thankyou_screens ?? [])
      .map((t) => t.ref)
      .filter((r): r is string => Boolean(r)),
  );
  const variableKeys = new Set(
    Object.keys(config.form.variables ?? {}),
  );
  const outcomeIds = new Set(
    (config.form.outcomes ?? []).map((o) => o.id),
  );

  // Track navigation targets for cycle detection
  const navigationEdges: Array<{ from: string; to: string }> = [];

  // Validate each rule
  for (const rule of rules) {
    validateRule(rule, {
      fieldRefs,
      fieldTypes,
      groupRefs,
      thankyouRefs,
      variableKeys,
      outcomeIds,
      errors,
      warnings,
      navigationEdges,
    });
  }

  // Detect navigation cycles
  const cycles = detectCycles(navigationEdges);
  for (const cycle of cycles) {
    errors.push({
      type: "error",
      path: "logic",
      message: `Navigation cycle detected: ${cycle.join(" → ")}`,
    });
  }

  // Check for unreachable fields
  const reachableFields = findReachableFields(rules, fieldRefs, groupRefs);
  for (const ref of fieldRefs) {
    if (!reachableFields.has(ref)) {
      warnings.push({
        type: "warning",
        path: `field.${ref}`,
        message: `Field "${ref}" may never be reached by any logic rule`,
      });
    }
  }

  // Check for contradictory rules (show/hide same field in same conditions)
  const contradictions = findContradictoryRules(rules);
  for (const contradiction of contradictions) {
    warnings.push({
      type: "warning",
      ruleId: contradiction.ruleIds.join(", "),
      path: "logic",
      message: contradiction.message,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Rule validation
// ---------------------------------------------------------------------------

interface RuleValidationContext {
  fieldRefs: Set<string>;
  fieldTypes: Record<string, string>;
  groupRefs: Set<string>;
  thankyouRefs: Set<string>;
  variableKeys: Set<string>;
  outcomeIds: Set<string>;
  errors: ValidationError[];
  warnings: ValidationError[];
  navigationEdges: Array<{ from: string; to: string }>;
}

function validateRule(
  rule: LogicRule,
  ctx: RuleValidationContext,
): void {
  // Validate condition tree
  validateCondition(rule.when, rule.id, ctx);

  // Validate actions
  for (let i = 0; i < rule.then.length; i++) {
    const action = rule.then[i];
    if (action === undefined) continue;
    validateAction(action, rule.id, i, ctx);
  }

  // Validate source refs
  if (rule.sourceRefs) {
    for (const ref of rule.sourceRefs) {
      if (!ctx.fieldRefs.has(ref)) {
        ctx.errors.push({
          type: "error",
          ruleId: rule.id,
          path: `rule.${rule.id}.sourceRefs`,
          message: `Source reference "${ref}" does not exist in fields`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Condition validation
// ---------------------------------------------------------------------------

function validateCondition(
  condition: Condition,
  ruleId: string,
  ctx: RuleValidationContext,
): void {
  switch (condition.type) {
    case "condition":
      validateLeafCondition(condition, ruleId, ctx);
      break;

    case "group":
      if (condition.conditions.length === 0) {
        ctx.warnings.push({
          type: "warning",
          ruleId,
          path: `rule.${ruleId}.condition`,
          message: "Empty condition group",
        });
      }
      for (const subCondition of condition.conditions) {
        validateCondition(subCondition, ruleId, ctx);
      }
      break;

    case "not":
      validateCondition(condition.condition, ruleId, ctx);
      break;
  }
}

function validateLeafCondition(
  condition: { source: ValueReference; operator: ComparisonOperator; value?: ValueReference },
  ruleId: string,
  ctx: RuleValidationContext,
): void {
  // Validate source reference
  validateValueReference(condition.source, ruleId, "source", ctx);

  // Validate value reference if present
  if (condition.value) {
    validateValueReference(condition.value, ruleId, "value", ctx);
  }

  // Validate operator/value type compatibility
  if (condition.source.type === "field") {
    const fieldType = ctx.fieldTypes[condition.source.ref];
    if (fieldType) {
      const validOps = getValidOperatorsForFieldType(fieldType);
      if (!validOps.includes(condition.operator)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path: `rule.${ruleId}.condition.operator`,
          message: `Operator "${condition.operator}" is not valid for field type "${fieldType}"`,
        });
      }
    }
  }

  // Validate "always"/"never" don't need values
  if (condition.operator === "always" || condition.operator === "never") {
    // These are fine without values
  } else if (condition.operator === "is_empty" || condition.operator === "is_not_empty") {
    // These don't need a value
  } else if (!condition.value) {
    ctx.errors.push({
      type: "error",
      ruleId,
      path: `rule.${ruleId}.condition.value`,
      message: `Operator "${condition.operator}" requires a value`,
    });
  }
}

// ---------------------------------------------------------------------------
// Value reference validation
// ---------------------------------------------------------------------------

function validateValueReference(
  ref: ValueReference,
  ruleId: string,
  path: string,
  ctx: RuleValidationContext,
): void {
  switch (ref.type) {
    case "field":
      if (!ctx.fieldRefs.has(ref.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path: `rule.${ruleId}.${path}`,
          message: `Field reference "${ref.ref}" does not exist`,
        });
      }
      break;

    case "variable":
      if (!ctx.variableKeys.has(ref.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path: `rule.${ruleId}.${path}`,
          message: `Variable reference "${ref.ref}" does not exist`,
        });
      }
      break;

    case "choice":
      if (!ctx.fieldRefs.has(ref.fieldRef)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path: `rule.${ruleId}.${path}`,
          message: `Choice field reference "${ref.fieldRef}" does not exist`,
        });
      }
      break;

    case "constant":
    case "score":
    case "system":
      // Always valid
      break;
  }
}

// ---------------------------------------------------------------------------
// Action validation
// ---------------------------------------------------------------------------

function validateAction(
  action: LogicAction,
  ruleId: string,
  actionIndex: number,
  ctx: RuleValidationContext,
): void {
  const path = `rule.${ruleId}.action[${actionIndex}]`;

  switch (action.type) {
    case "jump":
      validateActionTarget(action.target, ruleId, path, ctx);
      ctx.navigationEdges.push({
        from: ruleId,
        to: `${action.target.type}:${action.target.ref}`,
      });
      break;

    case "skip_field":
      if (!ctx.fieldRefs.has(action.target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Skip target field "${action.target.ref}" does not exist`,
        });
      }
      break;

    case "skip_group":
      if (!ctx.groupRefs.has(action.target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Skip target group "${action.target.ref}" does not exist`,
        });
      }
      break;

    case "show_field":
    case "hide_field":
    case "make_required":
    case "make_optional":
    case "enable_field":
    case "disable_field":
      if (!ctx.fieldRefs.has(action.target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Target field "${action.target.ref}" does not exist`,
        });
      }
      break;

    case "show_group":
    case "hide_group":
      if (!ctx.groupRefs.has(action.target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Target group "${action.target.ref}" does not exist`,
        });
      }
      break;

    case "set_value":
      validateValueReference(action.value, ruleId, `${path}.value`, ctx);
      break;

    case "copy_value":
      validateValueReference(action.source, ruleId, `${path}.source`, ctx);
      break;

    case "set_variable":
    case "add_variable":
    case "subtract_variable":
    case "multiply_variable":
    case "divide_variable":
      if (!ctx.variableKeys.has(action.target)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Variable target "${action.target}" does not exist`,
        });
      }
      validateValueReference(action.value, ruleId, `${path}.value`, ctx);
      break;

    case "increment_variable":
    case "decrement_variable":
      if (!ctx.variableKeys.has(action.target)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Variable target "${action.target}" does not exist`,
        });
      }
      break;

    case "end_form":
      if (action.target) {
        if (!ctx.thankyouRefs.has(action.target.ref)) {
          ctx.errors.push({
            type: "error",
            ruleId,
            path,
            message: `Thankyou screen reference "${action.target.ref}" does not exist`,
          });
        }
      }
      break;

    case "redirect":
      try {
        new URL(action.url);
      } catch {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Invalid redirect URL: "${action.url}"`,
        });
      }
      break;
  }
}

function validateActionTarget(
  target: { type: string; ref: string },
  ruleId: string,
  path: string,
  ctx: RuleValidationContext,
): void {
  switch (target.type) {
    case "field":
      if (!ctx.fieldRefs.has(target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Target field "${target.ref}" does not exist`,
        });
      }
      break;

    case "group":
      if (!ctx.groupRefs.has(target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Target group "${target.ref}" does not exist`,
        });
      }
      break;

    case "thankyou":
      if (!ctx.thankyouRefs.has(target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Thankyou screen "${target.ref}" does not exist`,
        });
      }
      break;

    case "outcome":
      if (!ctx.outcomeIds.has(target.ref)) {
        ctx.errors.push({
          type: "error",
          ruleId,
          path,
          message: `Outcome "${target.ref}" does not exist`,
        });
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// Cycle detection
// ---------------------------------------------------------------------------

function detectCycles(
  edges: Array<{ from: string; to: string }>,
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (stack.has(node)) {
      // Found cycle
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push([...path.slice(cycleStart), node]);
      }
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    path.push(node);

    for (const edge of edges) {
      if (edge.from === node) {
        dfs(edge.to, path);
      }
    }

    path.pop();
    stack.delete(node);
  }

  const nodes = new Set<string>();
  for (const edge of edges) {
    nodes.add(edge.from);
    nodes.add(edge.to);
  }

  for (const node of nodes) {
    dfs(node, []);
  }

  return cycles;
}

// ---------------------------------------------------------------------------
// Reachability analysis
// ---------------------------------------------------------------------------

function findReachableFields(
  rules: LogicRule[],
  fieldRefs: Set<string>,
  groupRefs: Set<string>,
): Set<string> {
  const reachable = new Set<string>();

  // Start from the first field
  const allFields = [...fieldRefs];
  const firstField = allFields[0];
  if (firstField !== undefined) {
    reachable.add(firstField);
  }

  // Fields are reachable by default (sequential order)
  for (const ref of allFields) {
    reachable.add(ref);
  }

  // Jump actions make targets reachable
  for (const rule of rules) {
    for (const action of rule.then) {
      if (action.type === "jump" && action.target.type === "field") {
        reachable.add(action.target.ref);
      }
    }
  }

  return reachable;
}

// ---------------------------------------------------------------------------
// Contradiction detection
// ---------------------------------------------------------------------------

function findContradictoryRules(
  rules: LogicRule[],
): Array<{ ruleIds: string[]; message: string }> {
  const contradictions: Array<{ ruleIds: string[]; message: string }> = [];
  const showHideActions = new Map<string, string[]>(); // fieldRef → ruleIds

  for (const rule of rules) {
    for (const action of rule.then) {
      let key: string | undefined;

      if (action.type === "show_field") {
        key = `show:${action.target.ref}`;
      } else if (action.type === "hide_field") {
        key = `hide:${action.target.ref}`;
      }

      if (key) {
        const existing = showHideActions.get(key) ?? [];
        existing.push(rule.id);
        showHideActions.set(key, existing);
      }
    }
  }

  // Check for show + hide on same field
  for (const rule of rules) {
    for (const action of rule.then) {
      if (action.type === "show_field") {
        const hideKey = `hide:${action.target.ref}`;
        const hideRuleIds = showHideActions.get(hideKey);
        if (hideRuleIds && hideRuleIds.includes(rule.id)) {
          contradictions.push({
            ruleIds: [rule.id],
            message: `Rule "${rule.id}" both shows and hides field "${action.target.ref}"`,
          });
        }
      }
    }
  }

  return contradictions;
}
