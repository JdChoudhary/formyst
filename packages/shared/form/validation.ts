import { normalizeFormSchemaSafe } from "./form-utils";
import type { FormField, FormSchema } from "./form-types";
import { getFieldOptions } from "./form-utils";

export interface SubmissionValidationResult {
  valid: boolean;
  /** fieldRef -> human-readable error message */
  errors: Record<string, string>;
}

/** Flattens the schema into an ordered field list. */
export function getSchemaFields(schema: FormSchema): FormField[] {
  const normalized = normalizeFormSchemaSafe(schema);
  if (!normalized) return [];
  return normalized.fields ?? [];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeRegexTest(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return false;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Choice-type fields: does the value reference a known choice (or "other")? */
function isAllowedChoice(field: FormField, value: string, allowOther: boolean): boolean {
  if (allowOther && (value === "__other__" || value.startsWith("other:"))) return true;
  const choices = getFieldOptions(field);
  return choices.some((c) => c.ref === value || c.label === value);
}

function isEmptyValue(field: FormField, value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;

  switch (field.type) {
    case "checkbox":
    case "ranking":
    case "file_upload":
      return !Array.isArray(value) || value.length === 0;
    case "number":
    case "rating":
    case "nps":
    case "opinion_scale":
    case "yes_no":
      // 0 / false are valid answers.
      return false;
    case "matrix":
    case "contact_info":
    case "payment":
    case "group":
      return isPlainObject(value) && Object.keys(value).length === 0;
    default:
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "string") return value.trim() === "";
      return false;
  }
}

function validateValueType(field: FormField, value: unknown): string | null {
  switch (field.type) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone_number":
    case "website":
    case "date":
    case "signature":
      return typeof value === "string" ? null : "Invalid value type";

    case "number":
    case "rating":
    case "nps":
    case "opinion_scale":
      return toFiniteNumber(value) === null ? "Please enter a valid number" : null;

    case "multiple_choice":
    case "dropdown": {
      if (typeof value !== "string") return "Invalid value type";
      return isAllowedChoice(field, value, !!field.properties?.allow_other_choice) ? null : "Invalid selection";
    }

    case "picture_choice": {
      if (field.properties?.allow_multiple_selection) {
        if (!Array.isArray(value)) return "Invalid value type";
        return value.every((item) => typeof item === "string") ? null : "Invalid value type";
      }
      if (typeof value !== "string") return "Invalid value type";
      return isAllowedChoice(field, value, false) ? null : "Invalid selection";
    }

    case "checkbox":
    case "ranking":
      if (!Array.isArray(value)) return "Invalid value type";
      return value.every((item) => typeof item === "string") ? null : "Invalid value type";

    case "yes_no":
      return typeof value === "boolean" || value === "yes" || value === "no" || value === 0 || value === 1
        ? null
        : "Invalid value type";

    case "matrix":
    case "contact_info":
    case "payment":
    case "group":
      return isPlainObject(value) ? null : "Invalid value type";

    case "file_upload":
      if (!Array.isArray(value)) return "Invalid value type";
      return value.every((item) => isPlainObject(item)) ? null : "Invalid value type";

    default:
      return null;
  }
}

/**
 * Validates `data` against the published form schema (Typeform-compatible).
 * Shared by the server (submission pipeline) and the client (renderers).
 * Answers are keyed by field ref.
 */
export function validateSubmission(
  schema: FormSchema,
  data: Record<string, unknown>,
): SubmissionValidationResult {
  const errors: Record<string, string> = {};
  const fields = getSchemaFields(schema);

  for (const field of fields) {
    if (field.type === "statement") continue;

    const ref = field.ref;
    if (!ref) continue;

    const value = data[ref];
    const filled = !isEmptyValue(field, value);
    const required = !!field.validations?.required;

    if (required && !filled) {
      errors[ref] = "This field is required";
      continue;
    }

    if (!filled) continue;

    const typeError = validateValueType(field, value);
    if (typeError) {
      errors[ref] = typeError;
      continue;
    }

    if (field.type === "email" && typeof value === "string" && !EMAIL_REGEX.test(value)) {
      errors[ref] = "Please enter a valid email address";
      continue;
    }

    if (field.type === "website" && typeof value === "string") {
      try {
        new URL(value);
      } catch {
        errors[ref] = "Please enter a valid URL";
        continue;
      }
    }

    if (["short_text", "long_text", "email"].includes(field.type) && typeof value === "string") {
      const { max_length } = field.validations ?? {};
      if (max_length !== undefined && value.length > max_length) {
        errors[ref] = `Must be no more than ${max_length} characters`;
        continue;
      }
    }

    if (field.type === "number") {
      const numValue = toFiniteNumber(value);
      if (numValue !== null) {
        const { min_value, max_value } = field.validations ?? {};
        if (min_value !== undefined && numValue < min_value) {
          errors[ref] = `Must be at least ${min_value}`;
          continue;
        }
        if (max_value !== undefined && numValue > max_value) {
          errors[ref] = `Must be no more than ${max_value}`;
        }
      }
    }

    if (field.properties?.regexp && typeof value === "string") {
      if (!safeRegexTest(field.properties.regexp, value)) {
        errors[ref] = "Invalid format";
      }
    }

    if (["multiple_choice", "checkbox"].includes(field.type)) {
      const selected = Array.isArray(value) ? value.length : value ? 1 : 0;
      const minSelection = field.properties?.allow_multiple_selection ? 1 : undefined;
      if (minSelection !== undefined && selected < minSelection) {
        errors[ref] = "Select at least one option";
        continue;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
