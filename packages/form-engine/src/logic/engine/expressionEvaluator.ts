/**
 * Expression Evaluator
 *
 * A safe expression evaluator for calculation expressions.
 * Does NOT use eval() or dynamically execute user-provided JavaScript.
 *
 * Supports:
 * - Variable references
 * - Field references
 * - Constants
 * - Basic arithmetic: +, -, *, /
 * - Parentheses for grouping
 * - Score references
 */

import type {
  CalculationExpression,
  CalculationOperand,
  CalculationOperator,
  FormRuntimeState,
} from "../../types";
import { asNumber, resolveValue } from "../conditions/valueResolver";

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenType = "number" | "variable" | "field" | "score" | "operator" | "lparen" | "rparen";

interface Token {
  type: TokenType;
  value: string | number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (ch === undefined) break;

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Numbers
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length) {
        const digit = expr[i];
        if (digit === undefined || !/[0-9.]/.test(digit)) break;
        num += digit;
        i++;
      }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }

    // Identifiers (variables, fields, score)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < expr.length) {
        const part = expr[i];
        if (part === undefined || !/[a-zA-Z0-9_]/.test(part)) break;
        ident += part;
        i++;
      }

      if (ident === "score") {
        tokens.push({ type: "score", value: "score" });
      } else {
        // Default to variable reference
        tokens.push({ type: "variable", value: ident });
      }
      continue;
    }

    // Operators
    if ("+-*/()".includes(ch)) {
      if (ch === "(") tokens.push({ type: "lparen", value: ch });
      else if (ch === ")") tokens.push({ type: "rparen", value: ch });
      else tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    // Unknown character — skip
    i++;
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Parser — recursive descent for arithmetic expressions
// ---------------------------------------------------------------------------

interface ASTNode {
  type: "number" | "variable" | "field" | "score" | "binary";
  value?: number;
  name?: string;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
}

function parseExpression(tokens: Token[]): ASTNode {
  let pos = 0;

  function parseAddSub(): ASTNode {
    let left = parseMulDiv();

    for (;;) {
      const token = tokens[pos];
      if (
        token === undefined ||
        token.type !== "operator" ||
        (token.value !== "+" && token.value !== "-")
      ) {
        break;
      }
      const op = token.value as string;
      pos++;
      const right = parseMulDiv();
      left = { type: "binary", operator: op, left, right };
    }

    return left;
  }

  function parseMulDiv(): ASTNode {
    let left = parsePrimary();

    for (;;) {
      const token = tokens[pos];
      if (
        token === undefined ||
        token.type !== "operator" ||
        (token.value !== "*" && token.value !== "/")
      ) {
        break;
      }
      const op = token.value as string;
      pos++;
      const right = parsePrimary();
      left = { type: "binary", operator: op, left, right };
    }

    return left;
  }

  function parsePrimary(): ASTNode {
    const token = tokens[pos];
    if (token === undefined) {
      return { type: "number", value: 0 };
    }

    if (token.type === "number") {
      pos++;
      return { type: "number", value: token.value as number };
    }

    if (token.type === "variable") {
      pos++;
      return { type: "variable", name: token.value as string };
    }

    if (token.type === "field") {
      pos++;
      return { type: "field", name: token.value as string };
    }

    if (token.type === "score") {
      pos++;
      return { type: "score" };
    }

    if (token.type === "lparen") {
      pos++; // skip (
      const node = parseAddSub();
      const closing = tokens[pos];
      if (closing?.type === "rparen") {
        pos++; // skip )
      }
      return node;
    }

    // Unknown token — skip
    pos++;
    return { type: "number", value: 0 };
  }

  return parseAddSub();
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

function evaluateAST(
  node: ASTNode,
  state: FormRuntimeState,
): number {
  switch (node.type) {
    case "number":
      return node.value ?? 0;

    case "variable": {
      const val = state.variables[node.name ?? ""];
      return asNumber(val) ?? 0;
    }

    case "field": {
      const val = state.answers[node.name ?? ""];
      return asNumber(val) ?? 0;
    }

    case "score":
      return state.score;

    case "binary": {
      const left = evaluateAST(node.left!, state);
      const right = evaluateAST(node.right!, state);

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right === 0 ? left : left / right;
        default:
          return 0;
      }
    }

    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Safely evaluate a mathematical expression string.
 *
 * Supports: +, -, *, /, (), variable names, field names, "score"
 *
 * Examples:
 *   evaluateExpression("price * quantity", state) → number
 *   evaluateExpression("score / total * 100", state) → number
 *   evaluateExpression("(a + b) * 2", state) → number
 */
export function evaluateExpression(
  expression: string,
  state: FormRuntimeState,
): number {
  const tokens = tokenize(expression);
  const ast = parseExpression(tokens);
  return evaluateAST(ast, state);
}

/**
 * Evaluate a CalculationExpression object.
 */
export function evaluateCalculation(
  calc: CalculationExpression,
  state: FormRuntimeState,
): { variable: string; value: number } {
  const leftValue = resolveOperand(calc.left, state);
  const rightValue = resolveOperand(calc.right, state);

  let result: number;
  switch (calc.operator) {
    case "add":
      result = leftValue + rightValue;
      break;
    case "subtract":
      result = leftValue - rightValue;
      break;
    case "multiply":
      result = leftValue * rightValue;
      break;
    case "divide":
      result = rightValue === 0 ? leftValue : leftValue / rightValue;
      break;
  }

  return { variable: calc.target, value: result };
}

function resolveOperand(
  operand: CalculationOperand,
  state: FormRuntimeState,
): number {
  switch (operand.type) {
    case "variable":
      return asNumber(state.variables[operand.ref]) ?? 0;
    case "field":
      return asNumber(state.answers[operand.ref]) ?? 0;
    case "constant":
      return operand.value;
    case "score":
      return state.score;
    default:
      return 0;
  }
}
