import type { FormField, FormSchema } from "./form-types";
import { getSchemaFields } from "./validation";

/**
 * Normalised respondent identity used by duplicate prevention.
 *
 * Duplicate prevention can track respondents by the email address and/or
 * phone number they entered — but only when the form actually collects one.
 * Both server (submission policies) and client (localStorage guard) use this
 * helper so the two sides always agree on what "the same respondent" means.
 */
export interface SubmissionIdentity {
  emails: string[];
  phones: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercased, trimmed email, or null when the value is not an email. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_REGEX.test(email) ? email : null;
}

/**
 * Digit-only phone, or null when the value is not phone-like. Formatting and
 * the international `+` prefix are dropped so "+1 (555) 123-4567" and
 * "15551234567" compare as the same number.
 */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

function collectIdentity(value: unknown, out: SubmissionIdentity): void {
  if (typeof value === "string") {
    const email = normalizeEmail(value);
    if (email) {
      out.emails.push(email);
      return;
    }
    const phone = normalizePhone(value);
    if (phone) out.phones.push(phone);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectIdentity(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectIdentity(item, out);
  }
}

/**
 * Extracts the respondent identity from a submission.
 *
 * Reads `email` and `phone_number` fields directly; `contact_info` answers are
 * plain objects, so their string values are scanned for email/phone shapes.
 */
export function extractSubmissionIdentity(
  schema: FormSchema,
  data: Record<string, unknown>,
): SubmissionIdentity {
  const out: SubmissionIdentity = { emails: [], phones: [] };
  if (!data) return out;

  for (const field of getSchemaFields(schema) as FormField[]) {
    const ref = field.ref;
    if (!ref) continue;
    const value = data[ref];
    if (value === undefined || value === null || value === "") continue;

    if (field.type === "email") {
      const email = normalizeEmail(value);
      if (email) out.emails.push(email);
    } else if (field.type === "phone_number") {
      const phone = normalizePhone(value);
      if (phone) out.phones.push(phone);
    } else if (field.type === "contact_info") {
      collectIdentity(value, out);
    }
  }

  return {
    emails: [...new Set(out.emails)],
    phones: [...new Set(out.phones)],
  };
}

/** True when two identities share at least one email or phone. */
export function identitiesMatch(a: SubmissionIdentity, b: SubmissionIdentity): boolean {
  if (a.emails.some((email) => b.emails.includes(email))) return true;
  return a.phones.some((phone) => b.phones.includes(phone));
}
