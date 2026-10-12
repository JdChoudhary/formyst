import type { FormField } from "@repo/shared";

/**
 * Formatting of *stored* submission answers for analytics.
 *
 * Answers are persisted in their raw submitted form — choice fields store the
 * option ref (`option_1`), contact fields store an object — so analytics must
 * resolve them against the field before showing anything to a human.
 */

/** Human labels for the built-in `contact_info` sub-fields. */
const KNOWN_KEY_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  address: "Address",
};

function humanizeKey(key: string): string {
  return (
    KNOWN_KEY_LABELS[key] ??
    key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/^\w/, (character) => character.toUpperCase())
  );
}

/**
 * True when a stored value carries a real answer.
 *
 * Empty containers do not: `{}` (a contact field nobody filled in) and `[]`
 * must read as "Not answered" rather than being rendered as `{}`.
 */
export function hasAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some((item) => hasAnswerValue(item));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) =>
      hasAnswerValue(item),
    );
  }
  return true;
}

/** Resolve a stored choice ref (`option_1`) to its declared label. */
export function resolveChoiceLabel(
  field: FormField | null | undefined,
  value: string,
): string {
  const choices = field?.properties?.choices;
  if (!choices?.length) return value;
  const match = choices.find(
    (choice) => choice.ref === value || choice.label === value,
  );
  return match?.label ?? value;
}

/** Turn any stored answer into a single human-readable string. */
export function formatAnswer(value: unknown, field?: FormField | null): string {
  if (!hasAnswerValue(value)) return "—";
  if (Array.isArray(value)) {
    return value.map((item) => formatAnswer(item, field)).join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.label === "string") return object.label;
    if (typeof object.title === "string") return object.title;
    if (typeof object.name === "string") return object.name;
    if (typeof object.value !== "undefined") return formatAnswer(object.value, field);

    return Object.entries(object)
      .filter(([, nested]) => hasAnswerValue(nested))
      .map(([key, nested]) => `${humanizeKey(key)}: ${formatAnswer(nested, field)}`)
      .join(" · ");
  }

  const text = String(value);
  return field ? resolveChoiceLabel(field, text) : text;
}

/**
 * Flatten a stored answer into the labels used to group a question's results
 * (one entry per selected choice / value).
 */
export function answerToLabels(value: unknown, field?: FormField | null): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => answerToLabels(item, field));
  if (typeof value === "boolean") return [value ? "Yes" : "No"];
  if (!hasAnswerValue(value)) return [];

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.label === "string") return [object.label];
    if (typeof object.value !== "undefined") return answerToLabels(object.value, field);
    return [formatAnswer(value, field)];
  }

  return [formatAnswer(value, field)];
}
