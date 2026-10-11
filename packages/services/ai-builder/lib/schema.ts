import { z } from "zod";
import { createDefaultFormSchema, fieldSchema, validateFormSchema } from "@repo/shared";
import type { FormSchema } from "@repo/shared";
import type { AIBuilderSchemaIssue } from "../model";

/**
 * Coerce LLM output (which loves ```json fences and padding prose) into a
 * plain parsed JSON value. Returns `null` when nothing JSON-like survives.
 */
export function extractJsonFromText(text: string): unknown {
  // Strip markdown fences and any surrounding prose at the edges.
  let cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");

  if (firstObject !== -1 && lastObject > firstObject) {
    cleaned = cleaned.slice(firstObject, lastObject + 1);
    try {
      const parsed = JSON.parse(cleaned) as unknown;
      if (parsed !== null && typeof parsed === "object") {
        const wrapped = parsed as { schema?: unknown; form?: unknown };
        // Some models wrap the schema: { "schema": {...} } / { "form": {...} }.
        if (wrapped.schema && typeof wrapped.schema === "object") return wrapped.schema;
        if (wrapped.form && typeof wrapped.form === "object") return wrapped.form;
        return parsed;
      }
    } catch {
      // fall through to the array attempt below
    }
  }

  const firstArray = cleaned.indexOf("[");
  const lastArray = cleaned.lastIndexOf("]");
  if (firstArray !== -1 && lastArray > firstArray) {
    try {
      return JSON.parse(cleaned.slice(firstArray, lastArray + 1)) as unknown;
    } catch {
      // ignore — finalizeSchema reports the schema-level issues
    }
  }

  // Last resort: maybe the whole object survived without fences.
  try {
    return JSON.parse(text.trim()) as unknown;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export type { AIBuilderSchemaIssue };

export interface SchemaResult {
  /** Canonical, already-validated form schema — never a raw model dump. */
  schema: FormSchema | null;
  valid: boolean;
  issues: AIBuilderSchemaIssue[];
}

/**
 * Validate the model's raw output against the canonical `formSchema` from
 * `@repo/shared` and turn it into a real, renderable schema.
 *
 * Strategy (in order):
 * 1. `formSchema.safeParse` the whole output — a fully-shaped schema is used
 *    as-is.
 * 2. Otherwise the model produced a *partial* object (`title`/`description`/
 *    `fields`). We validate the `fields` array against `z.array(fieldSchema)`
 *    and build the canonical shell with `createDefaultFormSchema`, so every
 *    defaults/theme/settings decision comes from the platform, not the model.
 * 3. If neither holds up, return `valid: false` with the collected issues so
 *    the route can report precisely why the output was rejected.
 */
export function finalizeSchema(raw: unknown): SchemaResult {
  const fullValidation = validateFormSchema(raw);
  if (fullValidation.valid) {
    return { schema: fullValidation.data, valid: true, issues: [] };
  }

  const issues: AIBuilderSchemaIssue[] = fullValidation.issues;
  const obj = isPlainObject(raw) ? raw : {};

  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim().slice(0, 255)
      : "Untitled form";
  const description =
    typeof obj.description === "string" && obj.description.trim() ? obj.description.trim() : undefined;

  const fieldsResult = z.array(fieldSchema).safeParse(obj.fields);

  if (fieldsResult.success) {
    const schema = createDefaultFormSchema({ title, description });
    // `fields` carries the canonical FormField type already — assignment is safe.
    schema.fields = fieldsResult.data as typeof schema.fields;
    return { schema, valid: true, issues: [] };
  }

  // The title alone gives the user something to salvage even when fields fail.
  if (title && title !== "Untitled form") {
    const schema = createDefaultFormSchema({ title, description });
    return { schema, valid: false, issues };
  }

  return { schema: null, valid: false, issues };
}

/** Short title fallback for the assistant message when the model omits one. */
export function deriveTitleFromPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/, "")
    .trim();
  if (!cleaned) return "Untitled form";
  const words = cleaned.split(" ").slice(0, 7).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}