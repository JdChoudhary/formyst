/**
 * Action Executor
 *
 * Executes LogicAction objects against the current runtime state.
 * Each action produces mutations to the state without directly modifying
 * the original form schema.
 */

import type {
  LogicAction,
  FormRuntimeState,
  EvaluationResult,
} from "../../types";
import { resolveValue, asNumber } from "../conditions/valueResolver";

// ---------------------------------------------------------------------------
// Action execution context
// ---------------------------------------------------------------------------

export interface ActionContext {
  /** Current runtime state (read-only reference) */
  state: FormRuntimeState;
  /** Mutable result accumulator — actions write their effects here */
  result: EvaluationResult;
  /** Optional field answer getter */
  fieldAnswerGetter?: (ref: string) => unknown;
}

// ---------------------------------------------------------------------------
// Main executor
// ---------------------------------------------------------------------------

/**
 * Execute a single action against the current context.
 *
 * @param action - The action to execute
 * @param ctx - The execution context
 */
export function executeAction(action: LogicAction, ctx: ActionContext): void {
  switch (action.type) {
    // Navigation
    case "jump":
      handleJump(action, ctx);
      break;
    case "skip_field":
      handleSkipField(action, ctx);
      break;
    case "skip_group":
      handleSkipGroup(action, ctx);
      break;

    // Visibility
    case "show_field":
      ctx.result.visibility[action.target.ref] = true;
      break;
    case "hide_field":
      ctx.result.visibility[action.target.ref] = false;
      break;
    case "show_group":
      ctx.result.visibility[action.target.ref] = true;
      break;
    case "hide_group":
      ctx.result.visibility[action.target.ref] = false;
      break;

    // Field behavior
    case "make_required":
      ctx.result.required[action.target.ref] = true;
      break;
    case "make_optional":
      ctx.result.required[action.target.ref] = false;
      break;
    case "enable_field":
      ctx.result.enabled[action.target.ref] = true;
      break;
    case "disable_field":
      ctx.result.enabled[action.target.ref] = false;
      break;

    // Value operations
    case "set_value":
      handleSetValue(action, ctx);
      break;
    case "clear_value":
      handleClearValue(action, ctx);
      break;
    case "copy_value":
      handleCopyValue(action, ctx);
      break;

    // Variable operations
    case "set_variable":
      handleSetVariable(action, ctx);
      break;
    case "add_variable":
      handleArithmeticVariable(action, ctx, "add");
      break;
    case "subtract_variable":
      handleArithmeticVariable(action, ctx, "subtract");
      break;
    case "multiply_variable":
      handleArithmeticVariable(action, ctx, "multiply");
      break;
    case "divide_variable":
      handleArithmeticVariable(action, ctx, "divide");
      break;
    case "increment_variable":
      handleIncrementVariable(action, ctx, 1);
      break;
    case "decrement_variable":
      handleIncrementVariable(action, ctx, -1);
      break;

    // Ending
    case "end_form":
      handleEndForm(action, ctx);
      break;
    case "redirect":
      // Redirect is handled at a higher level
      break;
  }
}

/**
 * Execute a list of actions in order.
 */
export function executeActions(
  actions: LogicAction[],
  ctx: ActionContext,
): void {
  for (const action of actions) {
    executeAction(action, ctx);
  }
}

// ---------------------------------------------------------------------------
// Individual action handlers
// ---------------------------------------------------------------------------

function handleJump(
  action: { type: "jump"; target: any },
  ctx: ActionContext,
): void {
  const target = action.target;
  switch (target.type) {
    case "field":
      ctx.result.navigation = target.ref;
      break;
    case "group":
      ctx.result.navigation = target.ref;
      break;
    case "thankyou":
      ctx.result.navigation = "thankyou";
      break;
    case "outcome":
      ctx.result.outcome = target.ref;
      ctx.result.navigation = "thankyou";
      break;
  }
}

function handleSkipField(
  action: { type: "skip_field"; target: { type: "field"; ref: string } },
  ctx: ActionContext,
): void {
  ctx.result.skipRefs.push(action.target.ref);
}

function handleSkipGroup(
  action: { type: "skip_group"; target: { type: "group"; ref: string } },
  ctx: ActionContext,
): void {
  ctx.result.skipRefs.push(action.target.ref);
}

function handleSetValue(
  action: { type: "set_value"; target: any; value: any },
  ctx: ActionContext,
): void {
  const value = resolveValue(action.value, ctx.state, ctx.fieldAnswerGetter);
  const target = action.target;

  if (target.type === "field") {
    ctx.result.fieldValues[target.ref] = value;
  }
  // Variable targets are handled by set_variable
}

function handleClearValue(
  action: { type: "clear_value"; target: any },
  ctx: ActionContext,
): void {
  const target = action.target;

  if (target.type === "field") {
    ctx.result.fieldValues[target.ref] = null;
  } else if (target.type === "variable") {
    ctx.result.variables[target.ref] = null;
  }
}

function handleCopyValue(
  action: { type: "copy_value"; source: any; target: any },
  ctx: ActionContext,
): void {
  const value = resolveValue(action.source, ctx.state, ctx.fieldAnswerGetter);
  const target = action.target;

  if (target.type === "field") {
    ctx.result.fieldValues[target.ref] = value;
  } else if (target.type === "variable") {
    ctx.result.variables[target.ref] = value;
  }
}

function handleSetVariable(
  action: { type: "set_variable"; target: string; value: any },
  ctx: ActionContext,
): void {
  const value = resolveValue(action.value, ctx.state, ctx.fieldAnswerGetter);
  ctx.result.variables[action.target] = value;
}

type ArithmeticOp = "add" | "subtract" | "multiply" | "divide";

function handleArithmeticVariable(
  action: { type: string; target: string; value: any },
  ctx: ActionContext,
  op: ArithmeticOp,
): void {
  // Read from result first (for cascading within same action list), then state
  const current = asNumber(ctx.result.variables[action.target] ?? ctx.state.variables[action.target]) ?? 0;
  const operand = asNumber(resolveValue(action.value, ctx.state, ctx.fieldAnswerGetter)) ?? 0;

  let result: number;
  switch (op) {
    case "add":
      result = current + operand;
      break;
    case "subtract":
      result = current - operand;
      break;
    case "multiply":
      result = current * operand;
      break;
    case "divide":
      result = operand === 0 ? current : current / operand;
      break;
  }

  ctx.result.variables[action.target] = result;
}

function handleIncrementVariable(
  action: { type: string; target: string },
  ctx: ActionContext,
  delta: number,
): void {
  const current = asNumber(ctx.result.variables[action.target] ?? ctx.state.variables[action.target]) ?? 0;
  ctx.result.variables[action.target] = current + delta;
}

function handleEndForm(
  action: { type: "end_form"; target?: any },
  ctx: ActionContext,
): void {
  if (action.target) {
    ctx.result.navigation = "thankyou";
    ctx.result.outcome = action.target.ref;
  } else {
    ctx.result.navigation = "thankyou";
  }
}
