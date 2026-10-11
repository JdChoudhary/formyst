import {
  extractSubmissionIdentity,
  identitiesMatch,
  normalizeEmail,
  normalizePhone,
  type SubmissionIdentity,
} from "@repo/shared";
import type { FormSchema } from "@repo/shared/form/form-types";

/** Formats a remaining cooldown (seconds) as a human-readable duration. */
export function formatTimeRemaining(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;

  if (minutes > 0 && secs > 0) return `${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

/** One past submission recorded in this browser. */
export interface LocalSubmissionRecord {
  at: number;
  email?: string;
  phone?: string;
}

export interface LocalDuplicateState {
  blocked: boolean;
  message?: string;
  /** Seconds until the oldest counted attempt leaves the window (time-based only). */
  timeRemaining?: number;
}

interface DuplicatePreventionSettings {
  enabled?: boolean;
  strategy?: "ip" | "email" | "session" | "combined";
  mode?: "time-based" | "one-time";
  timeWindow?: number;
  maxAttempts?: number;
  allowOverride?: boolean;
  message?: string;
}

/** Keep storage bounded — only the most recent attempts are remembered. */
const MAX_LOCAL_RECORDS = 20;
const storageKey = (formId: string) => `formyst_duplicate:${formId}`;

function readRecords(formId: string): LocalSubmissionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(formId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record): record is LocalSubmissionRecord =>
        !!record && typeof record === "object" && typeof (record as any).at === "number",
    );
  } catch {
    return [];
  }
}

/**
 * Remembers a successful submission in localStorage so the local guard can
 * warn (and block) before the respondent fills the form in again. The server
 * remains authoritative — this only improves the experience.
 */
export function recordLocalSubmission(
  formId: string,
  schema: FormSchema,
  data: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    const identity = extractSubmissionIdentity(schema, data);
    const records = readRecords(formId);
    records.push({
      at: Date.now(),
      email: identity.emails[0],
      phone: identity.phones[0],
    });
    window.localStorage.setItem(
      storageKey(formId),
      JSON.stringify(records.slice(-MAX_LOCAL_RECORDS)),
    );
  } catch {
    // Storage unavailable (private mode / quota) — server policy still applies.
  }
}

/**
 * Local duplicate guard: mirrors the server's duplicate-prevention policy
 * against this browser's recorded submissions.
 *
 * Pass the identity currently entered in the form so that, under the email
 * strategy, a *different* respondent using the same browser is not blocked.
 */
export function getLocalDuplicateState(
  formId: string,
  duplicatePrevention: DuplicatePreventionSettings | undefined,
  currentIdentity?: SubmissionIdentity,
): LocalDuplicateState {
  if (!duplicatePrevention?.enabled || duplicatePrevention.allowOverride) {
    return { blocked: false };
  }

  const records = readRecords(formId);
  if (records.length === 0) return { blocked: false };

  let candidates = records;
  if (duplicatePrevention.strategy === "email" && currentIdentity) {
    // Normalise defensively — callers may hand us raw answers, and a
    // case/format difference must never make a duplicate look like a new
    // respondent.
    const normalizedCurrent: SubmissionIdentity = {
      emails: currentIdentity.emails
        .map((email) => normalizeEmail(email))
        .filter((email): email is string => email !== null),
      phones: currentIdentity.phones
        .map((phone) => normalizePhone(phone))
        .filter((phone): phone is string => phone !== null),
    };
    const currentHasIdentity =
      normalizedCurrent.emails.length > 0 || normalizedCurrent.phones.length > 0;
    candidates = records.filter((record) => {
      const recordIdentity: SubmissionIdentity = {
        emails: record.email ? [record.email] : [],
        phones: record.phone ? [record.phone] : [],
      };
      const recordHasIdentity =
        recordIdentity.emails.length > 0 || recordIdentity.phones.length > 0;
      // Without an identity on either side we cannot prove it is someone else,
      // so keep the conservative match.
      if (!recordHasIdentity || !currentHasIdentity) return true;
      return identitiesMatch(recordIdentity, normalizedCurrent);
    });
    if (candidates.length === 0) return { blocked: false };
  }

  const timeBased = duplicatePrevention.mode === "time-based";
  const windowMs = Math.max(1, Number(duplicatePrevention.timeWindow) || 1440) * 60_000;
  const maxAttempts = Math.max(1, Number(duplicatePrevention.maxAttempts) || 1);
  const threshold = timeBased ? maxAttempts : 1;
  const now = Date.now();

  // One-time mode: any past submission blocks. Time-based: only attempts
  // inside the window count, and only once they reach maxAttempts.
  const counted = timeBased
    ? candidates.filter((record) => now - record.at < windowMs)
    : candidates;
  if (counted.length < threshold) return { blocked: false };

  const message =
    duplicatePrevention.message ||
    (timeBased
      ? "You have already submitted this form. Please wait before submitting again."
      : "You have already submitted this form. Each user can only submit once.");

  if (!timeBased) return { blocked: true, message };

  const oldest = counted.reduce((min, record) => Math.min(min, record.at), Number.POSITIVE_INFINITY);
  const seconds = Math.ceil((oldest + windowMs - now) / 1000);
  return { blocked: true, message, timeRemaining: seconds > 0 ? seconds : undefined };
}
