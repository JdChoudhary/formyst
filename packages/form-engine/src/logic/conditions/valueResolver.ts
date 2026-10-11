/**
 * Value Resolver
 *
 * Resolves ValueReference objects to actual values by looking up
 * answers, variables, constants, and system values.
 */

import type {
  ValueReference,
  FormRuntimeState,
} from "../../types";

/**
 * Resolve a ValueReference to its actual value.
 *
 * @param ref - The value reference to resolve
 * @param state - The current runtime state containing answers, variables, etc.
 * @param fieldAnswerGetter - Optional function to get field answers (for field refs)
 * @returns The resolved value
 */
export function resolveValue(
  ref: ValueReference,
  state: FormRuntimeState,
  fieldAnswerGetter?: (ref: string) => unknown,
): unknown {
  switch (ref.type) {
    case "field": {
      if (fieldAnswerGetter) {
        return fieldAnswerGetter(ref.ref);
      }
      return state.answers[ref.ref];
    }

    case "variable":
      return state.variables[ref.ref];

    case "constant":
      return ref.value;

    case "choice": {
      // Choice references resolve to the selected choice ref(s)
      const fieldAnswer = fieldAnswerGetter
        ? fieldAnswerGetter(ref.fieldRef)
        : state.answers[ref.fieldRef];

      if (Array.isArray(fieldAnswer)) {
        return fieldAnswer.includes(ref.choiceRef);
      }
      return fieldAnswer === ref.choiceRef;
    }

    case "score":
      return state.score;

    case "system": {
      switch (ref.key) {
        case "currentStep":
          return state.currentFieldRef
            ? state.visitedFields.indexOf(state.currentFieldRef)
            : 0;
        case "currentPage":
          return state.currentGroupRef ?? "";
        case "progress":
          return state.progress;
        case "submissionCount":
          return 0; // Must be injected externally
        default:
          return undefined;
      }
    }

    default:
      return undefined;
  }
}

/**
 * Convert a value to a number for numeric comparisons.
 */
export function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return null;
}

/**
 * Convert a value to a string for string comparisons.
 */
export function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

/**
 * Convert a value to a Date for date comparisons.
 */
export function asDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

/**
 * Convert a value to a boolean.
 */
export function asBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  return null;
}

/**
 * Check if a value is "empty" (undefined, null, empty string, empty array, empty object).
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
    return true;
  return false;
}
