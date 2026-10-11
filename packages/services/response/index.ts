import db, { and, asc, desc, eq, gte, inArray, ne } from "@repo/database";
import { form, formResponse, formResponseAnswer, formVersion, formWebhook } from "@repo/database";
import { extractSubmissionIdentity, identitiesMatch } from "@repo/shared";
import type { FormSchema } from "@repo/shared/form/form-types";
import type {
  SaveDraftInput,
  SubmitResponseInput,
  StartResponseInput,
  StageResponseInput,
  CompleteResponseInput,
  GetResponseInput,
  CreateWebhookInput,
  DeleteWebhookInput,
  ListWebhooksInput,
} from "./model";
import { logger } from "@repo/logger";
import { sendMail } from "@repo/mail/src/nodemailer";
import {
  getSchemaFields,
  SubmissionPolicyError,
  SubmissionValidationError,
  validateSubmission,
} from "./validation";

export { SubmissionPolicyError, SubmissionValidationError } from "./validation";
export type { SubmissionPolicy, SubmissionPolicyMeta } from "./validation";

type FormRow = typeof form.$inferSelect;
type FormVersionRow = typeof formVersion.$inferSelect;
type FormResponseRow = typeof formResponse.$inferSelect;
type FormResponseAnswerRow = typeof formResponseAnswer.$inferSelect;
type FormWebhookRow = typeof formWebhook.$inferSelect;

export type { FormResponseRow, FormResponseAnswerRow, FormWebhookRow };
export {
  saveDraftInputSchema,
  submitResponseInputSchema,
  getDraftInputSchema,
  listResponsesInputSchema,
  startResponseInputSchema,
  stageResponseInputSchema,
  completeResponseInputSchema,
  getResponseInputSchema,
  createWebhookInputSchema,
  deleteWebhookInputSchema,
  listWebhooksInputSchema,
} from "./model";
export type {
  SaveDraftInput,
  SubmitResponseInput,
  StartResponseInput,
  StageResponseInput,
  CompleteResponseInput,
  GetResponseInput,
  CreateWebhookInput,
  DeleteWebhookInput,
  ListWebhooksInput,
} from "./model";

export interface ResponseListDTO {
  responses: FormResponseRow[];
  answers: FormResponseAnswerRow[];
  /** Kept empty — event tracking tables were removed. */
  events: never[];
}

const DRAFTABLE_STATUSES = ["draft", "partial", "abandoned"] as const;
type DraftableStatus = (typeof DRAFTABLE_STATUSES)[number];
type PgTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Upper bound on prior submissions scanned for email/phone/IP duplicate
 * matching. Recent-first, so the common case (a recent duplicate) is always
 * found; the bound keeps a high-traffic form from scanning every response on
 * each submit.
 */
const DUPLICATE_SCAN_LIMIT = 1000;

function getSchemaFieldMeta(schema: FormSchema): Array<{
  id: string;
  ref: string;
  type: string;
  label: string;
}> {
  return getSchemaFields(schema).map((field, index) => ({
    id: field.ref ?? `field_${index}`,
    ref: field.ref ?? `field_${index}`,
    type: field.type,
    label: field.title,
  }));
}

/** Classify the *answer* kind (not the field kind) for analytics projections. */
function classifyAnswerType(fieldType: string): string {
  switch (fieldType) {
    case "multiple_choice":
    case "dropdown":
    case "picture_choice":
    case "checkbox":
    case "ranking":
      return "choices";
    case "number":
    case "rating":
    case "nps":
    case "opinion_scale":
      return "number";
    case "yes_no":
      return "boolean";
    case "file_upload":
      return "files";
    case "matrix":
    case "address":
    case "contact_info":
    case "payment":
    case "scheduler":
      return "object";
    default:
      return "text";
  }
}

function projectAnswerValue(fieldType: string, value: unknown) {
  const numberTypes = new Set(["number", "rating", "nps", "opinion_scale"]);
  const choiceTypes = new Set([
    "multiple_choice",
    "dropdown",
    "picture_choice",
    "checkbox",
    "ranking",
  ]);

  if (numberTypes.has(fieldType)) {
    const n = typeof value === "number" ? value : Number(value);
    return { valueNumber: Number.isFinite(n) ? Math.round(n) : null };
  }
  if (choiceTypes.has(fieldType)) {
    const ids = Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : typeof value === "string"
        ? [value]
        : [];
    return { valueChoiceIds: ids };
  }
  if (fieldType === "yes_no") {
    return {
      valueBoolean:
        value === true || value === "yes" || value === 1 || value === "1"
          ? true
          : value === false || value === "no" || value === 0 || value === "0"
            ? false
            : null,
    };
  }
  return {};
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "object" && Object.keys(value as object).length === 0) return false;
  return true;
}

function computeProgress(
  schemaFields: Array<{ id: string; type: string; label: string }>,
  data: Record<string, unknown>,
) {
  const totalFields = schemaFields.length;
  const completedFields = schemaFields.filter((f) => isFilled(data[f.id])).length;
  const completionPercentage =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  return { totalFields, completedFields, completionPercentage };
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Minimal HTML escaping for notification emails built from respondent input. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectTextValues(value: unknown, values: string[] = []): string[] {
  if (typeof value === "string") {
    values.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, values));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectTextValues(item, values));
  }
  return values;
}

/** Seconds from now until `epochMs`, or undefined once the moment has passed. */
function secondsUntil(epochMs: number): number | undefined {
  const seconds = Math.ceil((epochMs - Date.now()) / 1000);
  return seconds > 0 ? seconds : undefined;
}

function findProfanity(
  data: Record<string, unknown>,
  settings: {
    customWords?: unknown;
    whitelistedWords?: unknown;
  },
): string | null {
  const blockedWords = [...(Array.isArray(settings.customWords) ? settings.customWords : [])]
    .filter((word): word is string => typeof word === "string")
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
  if (blockedWords.length === 0) return null;

  const whitelist = new Set(
    (Array.isArray(settings.whitelistedWords) ? settings.whitelistedWords : [])
      .filter((word): word is string => typeof word === "string")
      .map((word) => word.trim().toLowerCase()),
  );
  const text = collectTextValues(data).join(" ").toLowerCase();
  return (
    blockedWords.find(
      (word) =>
        !whitelist.has(word) &&
        new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text),
    ) ?? null
  );
}

export class FormResponseService {
  /**
   * Resolves the form + the version that public respondents should fill.
   * Prefers the published version, falls back to the current version.
   */
  private async resolveFormAndVersion(formId: string): Promise<{
    form: FormRow;
    version: FormVersionRow;
    schema: FormSchema;
  } | null> {
    const [row] = await db.select().from(form).where(eq(form.id, formId)).limit(1);
    if (!row) return null;

    let versionId = row.publishedVersionId ?? row.currentVersionId;
    let version: FormVersionRow | undefined;

    if (versionId) {
      [version] = await db.select().from(formVersion).where(eq(formVersion.id, versionId)).limit(1);
    }

    if (!version) {
      [version] = await db
        .select()
        .from(formVersion)
        .where(eq(formVersion.formId, formId))
        .orderBy(desc(formVersion.version))
        .limit(1);
    }

    if (!version) return null;
    return { form: row, version, schema: version.schema };
  }

  private async getExistingDraft(formId: string, sessionId: string, client: PgTx | typeof db = db) {
    const [row] = await client
      .select()
      .from(formResponse)
      .where(
        and(
          eq(formResponse.formId, formId),
          eq(formResponse.sessionId, sessionId),
          inArray(formResponse.status, DRAFTABLE_STATUSES),
        ),
      )
      .orderBy(desc(formResponse.updatedAt))
      .limit(1);
    return row ?? null;
  }

  /** An already-finalized response for this session (idempotent resubmit). */
  private async getExistingSubmitted(
    formId: string,
    sessionId: string,
    client: PgTx | typeof db = db,
  ) {
    const [row] = await client
      .select()
      .from(formResponse)
      .where(
        and(
          eq(formResponse.formId, formId),
          eq(formResponse.sessionId, sessionId),
          eq(formResponse.status, "submitted"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * SHA-256 of `formId:ip` for the requesting client, or null when the
   * request carries no IP (no proxy headers). The raw IP is never stored;
   * the per-form salt keeps hashes from being correlated across forms.
   */
  private async hashRequestIp(
    formId: string,
    httpHeaders: Record<string, string>,
  ): Promise<string | null> {
    const forwarded = httpHeaders["x-forwarded-for"];
    const ip = (forwarded?.split(",")[0] || httpHeaders["x-real-ip"] || "").trim();
    if (!ip) return null;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${formId}:${ip}`),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Autosave / manual-save of an in-progress response.
   * Upserts the single active draft row for (formId, sessionId).
   */
  async saveDraft(input: SaveDraftInput) {
    const resolved = await this.resolveFormAndVersion(input.formId);
    if (!resolved) return null;

    const schemaFields = getSchemaFieldMeta(resolved.schema);
    const progress = computeProgress(schemaFields, input.formData);
    const status: DraftableStatus = progress.completionPercentage >= 100 ? "partial" : "draft";
    const lastActivityAt = new Date();

    return db.transaction(async (tx) => {
      const existing = await this.getExistingDraft(input.formId, input.sessionId, tx);

      let row: FormResponseRow | undefined;

      if (existing) {
        [row] = await tx
          .update(formResponse)
          .set({
            data: input.formData,
            status,
            completedFields: progress.completedFields,
            totalFields: progress.totalFields,
            completionPercentage: progress.completionPercentage,
            lastFieldId: input.lastFieldId ?? existing.lastFieldId,
            lastStepReached: input.lastStepReached ?? existing.lastStepReached,
            lastActivityAt,
            updatedAt: lastActivityAt,
          })
          .where(eq(formResponse.id, existing.id))
          .returning();
      } else {
        [row] = await tx
          .insert(formResponse)
          .values({
            formId: input.formId,
            formVersionId: resolved.version.id,
            sessionId: input.sessionId,
            status,
            submissionId: crypto.randomUUID(),
            landedAt: lastActivityAt,
            data: input.formData,
            completedFields: progress.completedFields,
            totalFields: progress.totalFields,
            completionPercentage: progress.completionPercentage,
            lastFieldId: input.lastFieldId ?? null,
            lastStepReached: input.lastStepReached ?? 0,
            startedAt: lastActivityAt,
            lastActivityAt,
            updatedAt: lastActivityAt,
          })
          .onConflictDoNothing()
          .returning();

        if (!row) {
          // Lost a race with a concurrent autosave — update the winner instead.
          [row] = await tx
            .update(formResponse)
            .set({
              data: input.formData,
              status,
              completedFields: progress.completedFields,
              totalFields: progress.totalFields,
              completionPercentage: progress.completionPercentage,
              lastFieldId: input.lastFieldId ?? null,
              lastStepReached: input.lastStepReached ?? 0,
              lastActivityAt,
              updatedAt: lastActivityAt,
            })
            .where(
              and(
                eq(formResponse.formId, input.formId),
                eq(formResponse.sessionId, input.sessionId),
                inArray(formResponse.status, DRAFTABLE_STATUSES),
              ),
            )
            .returning();
        }
      }

      return row ?? null;
    });
  }

  /**
   * Submission policies configured on the form (bot trap, duplicate prevention,
   * response limit, rate limit, profanity filter, password protection).
   *
   * Throws a `SubmissionPolicyError` carrying the policy label the web clients
   * match on (plus a `timeRemaining` countdown where a window applies) when a
   * policy blocks the submission. Field validation failures use
   * `SubmissionValidationError` instead. Kept in one method so the legacy
   * `submit` endpoint and the newer `completeResponse` endpoint cannot diverge —
   * previously only `submit` enforced these, so a client using the staged
   * endpoints silently bypassed every security setting.
   */
  private async enforceSubmissionPolicies(
    formId: string,
    schema: FormSchema,
    sessionId: string,
    submissionData: Record<string, unknown>,
    httpHeaders: Record<string, string> = {},
  ): Promise<void> {
    const settings = (schema.settings ?? {}) as Record<string, any>;
    const { duplicatePrevention, rateLimit, responseLimit, profanityFilter } = settings;

    if (settings.passwordProtection?.enabled) {
      // Server-side gate: respondent must have passed the password modal
      // (client sets `form_password_verified` cookie on success).
      const cookieHeader = httpHeaders["cookie"];
      const hasPasswordCookie =
			cookieHeader &&
			/\bform_password_verified=1\b/.test(cookieHeader);
      if (!hasPasswordCookie) {
			throw new SubmissionPolicyError(
				"Password required",
				settings.passwordProtection.message ||
				"This form is password protected. Please enter the password to continue.",
			);
		}
    }

    if (settings.botProtection?.enabled && submissionData.__bot_trap) {
      throw new SubmissionPolicyError(
        "Bot detected",
        settings.botProtection.message || "Bot detected. Access denied.",
      );
    }

    if (duplicatePrevention?.enabled && !duplicatePrevention.allowOverride) {
      const strategy = String(duplicatePrevention.strategy || "combined");
      const timeBased = duplicatePrevention.mode === "time-based";
      const windowMinutes = Math.max(1, Number(duplicatePrevention.timeWindow) || 1440);
      const maxAttempts = Math.max(1, Number(duplicatePrevention.maxAttempts) || 1);
      const since = timeBased ? new Date(Date.now() - windowMinutes * 60_000) : undefined;
      const message =
        duplicatePrevention.message ||
        (timeBased
          ? "You have already submitted this form. Please wait before submitting again."
          : "You have already submitted this form. Each user can only submit once.");

      const identity = extractSubmissionIdentity(schema, submissionData);
      const wantsIp = strategy === "ip" || strategy === "combined";
      const ipHash = wantsIp ? await this.hashRequestIp(formId, httpHeaders) : null;

      let useSession = strategy === "session" || strategy === "combined";
      let useIdentity = strategy === "email" || strategy === "combined";
      const useIp = wantsIp && ipHash !== null;

      // A strategy with nothing to match on must not silently allow duplicates:
      // fall back to the session check when the form collects no email/phone
      // (or the request carries no IP).
      if (strategy === "email" && identity.emails.length === 0 && identity.phones.length === 0) {
        useIdentity = false;
        useSession = true;
      }
      if (strategy === "ip" && !useIp) useSession = true;

      // One-time mode blocks on a single match; time-based mode blocks once
      // the matched attempts inside the window reach `maxAttempts`.
      const attemptThreshold = timeBased ? maxAttempts : 1;
      const matchedAt = new Set<number>();
      const recordMatch = (at: Date | null | undefined) => {
        if (at instanceof Date) matchedAt.add(at.getTime());
      };

      if (useSession) {
        const sessionConditions = [
          eq(formResponse.formId, formId),
          eq(formResponse.status, "submitted"),
          eq(formResponse.sessionId, sessionId),
        ];
        if (since) sessionConditions.push(gte(formResponse.submittedAt, since));
        const sessionRows = await db
          .select({ submittedAt: formResponse.submittedAt })
          .from(formResponse)
          .where(and(...sessionConditions))
          .orderBy(desc(formResponse.submittedAt))
          .limit(attemptThreshold);
        for (const row of sessionRows) recordMatch(row.submittedAt);
      }

      if (matchedAt.size < attemptThreshold && (useIdentity || useIp)) {
        // Identity / IP matching needs the stored answers, so scan the recent
        // submissions for this form (windowed in time-based mode). Bounded so
        // a very busy form cannot turn every submit into a full table scan.
        const scanConditions = [eq(formResponse.formId, formId), eq(formResponse.status, "submitted")];
        if (since) scanConditions.push(gte(formResponse.submittedAt, since));
        const previousResponses = await db
          .select({
            submittedAt: formResponse.submittedAt,
            sessionId: formResponse.sessionId,
            ipHash: formResponse.ipHash,
            data: formResponse.data,
          })
          .from(formResponse)
          .where(and(...scanConditions))
          .orderBy(desc(formResponse.submittedAt))
          .limit(DUPLICATE_SCAN_LIMIT);

        for (const previous of previousResponses) {
          if (!previous.submittedAt) continue;
          if (matchedAt.size >= attemptThreshold) break;
          if (matchedAt.has(previous.submittedAt.getTime())) continue;

          let matched = false;
          if (useSession && previous.sessionId === sessionId) matched = true;
          if (!matched && useIdentity) {
            const previousIdentity = extractSubmissionIdentity(
              schema,
              (previous.data ?? {}) as Record<string, unknown>,
            );
            if (identitiesMatch(identity, previousIdentity)) matched = true;
          }
          if (!matched && useIp && ipHash && previous.ipHash === ipHash) matched = true;

          if (matched) recordMatch(previous.submittedAt);
        }
      }

      if (matchedAt.size >= attemptThreshold) {
        let oldest: number | null = null;
        for (const at of matchedAt) oldest = oldest === null ? at : Math.min(oldest, at);
        throw new SubmissionPolicyError(
          "Duplicate submission detected",
          message,
          {
            // One-time mode blocks indefinitely (no countdown); time-based mode
            // counts down until the oldest matched attempt leaves the window.
            timeRemaining:
              timeBased && oldest !== null
                ? secondsUntil(oldest + windowMinutes * 60_000)
                : undefined,
          },
        );
      }
    }

    if (responseLimit?.enabled && Number.isFinite(responseLimit.maxResponses)) {
      const submittedResponses = await db
        .select({ id: formResponse.id })
        .from(formResponse)
        .where(and(eq(formResponse.formId, formId), eq(formResponse.status, "submitted")));
      if (submittedResponses.length >= Math.max(0, Number(responseLimit.maxResponses))) {
        throw new SubmissionPolicyError(
          "Response limit reached",
          responseLimit.message || "This form is no longer accepting responses.",
        );
      }
    }

    if (rateLimit?.enabled && Number.isFinite(rateLimit.maxSubmissions)) {
      const windowMinutes = Math.max(1, Number(rateLimit.timeWindow) || 30);
      const since = new Date(Date.now() - windowMinutes * 60_000);
      const recentSubmissions = await db
        .select({ id: formResponse.id, submittedAt: formResponse.submittedAt })
        .from(formResponse)
        .where(
          and(
            eq(formResponse.formId, formId),
            eq(formResponse.status, "submitted"),
            gte(formResponse.submittedAt, since),
          ),
        );
      if (recentSubmissions.length >= Math.max(1, Number(rateLimit.maxSubmissions))) {
        // The block lifts when the oldest counted submission exits the window.
        const oldest = recentSubmissions.reduce<number | null>((min, row) => {
          const at = row.submittedAt ? new Date(row.submittedAt).getTime() : null;
          if (at === null) return min;
          return min === null ? at : Math.min(min, at);
        }, null);
        throw new SubmissionPolicyError(
          "Rate limit exceeded",
          rateLimit.message || "Too many submissions. Please try again later.",
          {
            timeRemaining:
              oldest === null ? undefined : secondsUntil(oldest + windowMinutes * 60_000),
          },
        );
      }
    }

    if (profanityFilter?.enabled) {
      const blockedWord = findProfanity(submissionData, profanityFilter);
      if (blockedWord) {
        throw new SubmissionPolicyError(
          "Content validation failed",
          profanityFilter.customMessage || "Please keep your submission respectful.",
        );
      }
    }
  }

  /**
   * Email the form owner about a new submission, when Settings → Notifications
   * is enabled. Best-effort: `sendMail` reports failures instead of throwing,
   * and a mail problem must never fail a submission the respondent completed.
   */
  private async sendSubmissionNotification(
    schema: FormSchema,
    submissionData: Record<string, unknown>,
  ): Promise<void> {
    const notifications = (schema.settings as Record<string, any> | undefined)?.notifications;
    const recipient: string | undefined = notifications?.email;
    if (!notifications?.enabled || !recipient) return;

    const rows = getSchemaFieldMeta(schema)
      .filter((field) => submissionData[field.id] !== undefined)
      .map(
        (field) =>
          `<tr><td style="padding:6px 12px;font-weight:600;vertical-align:top">${escapeHtml(
            field.label,
          )}</td><td style="padding:6px 12px">${escapeHtml(
            serializeValue(submissionData[field.id]) ?? "",
          )}</td></tr>`,
      )
      .join("");

    const result = await sendMail({
      to: recipient,
      subject: notifications.subject || "You received a submission! 🥳",
      html: `<div style="font-family:system-ui,sans-serif"><p>${
        notifications.message || "You have received a new submission on your form."
      }</p><table style="border-collapse:collapse">${rows}</table></div>`,
    });

    if (!result.success) {
      logger.error("Failed to send submission notification", { error: result.error });
    }
  }

  /**
   * Final submission. Marks the response submitted, snapshots per-field
   * answers (with field label/type at submission time) and records events.
   */
  async submit(input: SubmitResponseInput) {
    const resolved = await this.resolveFormAndVersion(input.formId);
    if (!resolved) return null;

    // Capture the (hashed) client IP so the IP duplicate strategy has data.
    const ipHash = await this.hashRequestIp(input.formId, input.httpHeaders ?? {});

    await this.enforceSubmissionPolicies(
      input.formId,
      resolved.schema,
      input.sessionId,
      input.submissionData,
      input.httpHeaders ?? {},
    );

    // Server-side validation against the published schema (required fields,
    // types, min/max, pattern). Field-level errors reach the client as HTTP 400.
    const validation = validateSubmission(resolved.schema, input.submissionData);
    if (!validation.valid) {
      throw new SubmissionValidationError(validation.errors);
    }

    const schemaFields = getSchemaFieldMeta(resolved.schema);
    const progress = computeProgress(schemaFields, input.submissionData);
    const now = new Date();

    const response = await db.transaction(async (tx) => {
      // Prefer the active draft; fall back to an already-submitted response so
      // double-clicks / retries stay idempotent (no duplicate rows).
      const existing =
        (await this.getExistingDraft(input.formId, input.sessionId, tx)) ??
        (await this.getExistingSubmitted(input.formId, input.sessionId, tx));
      const rowId = existing?.id;
      const startedAt = existing?.startedAt ?? now;

      let row: FormResponseRow | undefined;

      if (rowId) {
        [row] = await tx
          .update(formResponse)
          .set({
            status: "submitted",
            ipHash,
            data: input.submissionData,
            completedFields: progress.completedFields,
            totalFields: progress.totalFields,
            completionPercentage: progress.completionPercentage,
            lastFieldId: input.lastFieldId ?? existing.lastFieldId,
            lastStepReached: input.lastStepReached ?? existing.lastStepReached,
            submittedAt: existing.submittedAt ?? now,
            timeSpentSeconds:
              existing.timeSpentSeconds ??
              Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000)),
            lastActivityAt: now,
            updatedAt: now,
          })
          .where(eq(formResponse.id, rowId))
          .returning();
      } else {
        [row] = await tx
          .insert(formResponse)
          .values({
            formId: input.formId,
            formVersionId: resolved.version.id,
            sessionId: input.sessionId,
            status: "submitted",
            ipHash,
            submissionId: crypto.randomUUID(),
            landedAt: startedAt,
            data: input.submissionData,
            completedFields: progress.completedFields,
            totalFields: progress.totalFields,
            completionPercentage: progress.completionPercentage,
            lastFieldId: input.lastFieldId ?? null,
            lastStepReached: input.lastStepReached ?? 0,
            startedAt,
            submittedAt: now,
            timeSpentSeconds: 0,
            lastActivityAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .returning();
      }

      if (!row) return null;

      // Idempotently rebuild the per-field answer snapshot.
      await tx.delete(formResponseAnswer).where(eq(formResponseAnswer.responseId, row.id));

      const answers = schemaFields
        .filter((field) => input.submissionData[field.id] !== undefined)
        .map((field, index) => {
          const rawValue = input.submissionData[field.id] as unknown;
          return {
            responseId: row!.id,
            formId: resolved.form.id,
            formVersionId: resolved.version.id,
            fieldId: field.id,
            fieldRef: field.ref,
            fieldType: field.type,
            fieldLabel: field.label,
            answerType: classifyAnswerType(field.type),
            value: rawValue,
            valueText: serializeValue(rawValue),
            ...projectAnswerValue(field.type, rawValue),
            sortOrder: index,
          };
        });

      if (answers.length > 0) {
        await tx.insert(formResponseAnswer).values(answers);
      }

      return row;
    });

    if (response) {
      await this.sendSubmissionNotification(resolved.schema, input.submissionData);
    }
    return response;
  }

  /** Resume a draft for a returning session. */
  async getBySession(formId: string, sessionId: string) {
    const row = await this.getExistingDraft(formId, sessionId);
    if (!row) return null;

    return { ...row, events: [] };
  }

  /** All responses (+ answers) for analytics. */
  async getAll(formId: string): Promise<ResponseListDTO> {
    const responses = await db
      .select()
      .from(formResponse)
      .where(
        and(
          eq(formResponse.formId, formId),
          ne(formResponse.status, "deleted"),
          ne(formResponse.status, "spam"),
        ),
      )
      .orderBy(desc(formResponse.submittedAt), desc(formResponse.updatedAt));

    if (responses.length === 0) {
      return { responses: [], answers: [], events: [] };
    }

    const responseIds = responses.map((r) => r.id);

    const answers = await db
      .select()
      .from(formResponseAnswer)
      .where(inArray(formResponseAnswer.responseId, responseIds))
      .orderBy(asc(formResponseAnswer.sortOrder));

    return { responses, answers, events: [] };
  }

  // ---- New Typeform-style endpoints ----

  /**
   * POST /forms/:id/responses — Start a new response session.
   * Creates a draft response row with a public submissionId.
   */
  async startResponse(input: StartResponseInput) {
    const resolved = await this.resolveFormAndVersion(input.formId);
    if (!resolved) return null;

    const now = new Date();
    const landedAt = input.landedAt ? new Date(input.landedAt) : now;
    const submissionId = crypto.randomUUID();

    const [row] = await db
      .insert(formResponse)
      .values({
        formId: input.formId,
        formVersionId: resolved.version.id,
        submissionId,
        sessionId: input.sessionId,
        status: "draft",
        landedAt,
        startedAt: now,
        lastActivityAt: now,
        data: {},
        referrer: input.metadata?.referrer,
        utmSource: input.metadata?.utmSource,
        utmMedium: input.metadata?.utmMedium,
        utmCampaign: input.metadata?.utmCampaign,
        utmTerm: input.metadata?.utmTerm,
        utmContent: input.metadata?.utmContent,
      })
      .returning();

    return row ?? null;
  }

  /**
   * PATCH /forms/:id/responses/:submissionId — Autosave / stage answers.
   * Upserts the answer set for an in-progress response.
   */
  async stageResponse(input: StageResponseInput) {
    const resolved = await this.resolveFormAndVersion(input.formId);
    if (!resolved) return null;

    const schemaFields = getSchemaFieldMeta(resolved.schema);
    const progress = computeProgress(schemaFields, input.formData);
    const status: DraftableStatus = progress.completionPercentage >= 100 ? "partial" : "draft";
    const now = new Date();

    return db.transaction(async (tx) => {
      // Find the existing response by submissionId + sessionId
      const [existing] = await tx
        .select()
        .from(formResponse)
        .where(
          and(
            eq(formResponse.formId, input.formId),
            eq(formResponse.submissionId, input.submissionId),
            eq(formResponse.sessionId, input.sessionId),
            inArray(formResponse.status, DRAFTABLE_STATUSES),
          ),
        )
        .limit(1);

      if (!existing) return null;

      const [row] = await tx
        .update(formResponse)
        .set({
          data: input.formData,
          status,
          completedFields: progress.completedFields,
          totalFields: progress.totalFields,
          completionPercentage: progress.completionPercentage,
          lastFieldId: input.lastFieldId ?? existing.lastFieldId,
          lastStepReached: input.lastStepReached ?? existing.lastStepReached,
          lastStagedAt: now,
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(eq(formResponse.id, existing.id))
        .returning();

      return row ?? null;
    });
  }

  /**
   * POST /forms/:id/responses/:submissionId/complete — Final submission.
   * Validates and marks the response as submitted, snapshots answers.
   */
  async completeResponse(input: CompleteResponseInput) {
    const resolved = await this.resolveFormAndVersion(input.formId);
    if (!resolved) return null;

    const ipHash = await this.hashRequestIp(input.formId, input.httpHeaders ?? {});

    // Same security settings as `submit` (duplicate prevention, response/rate
    // limits, profanity filter, bot trap, password protection) so this endpoint
    // cannot bypass them.
    await this.enforceSubmissionPolicies(
      input.formId,
      resolved.schema,
      input.sessionId,
      input.submissionData,
      input.httpHeaders ?? {},
    );

    // Server-side validation
    const validation = validateSubmission(resolved.schema, input.submissionData);
    if (!validation.valid) {
      throw new SubmissionValidationError(validation.errors);
    }

    const schemaFields = getSchemaFieldMeta(resolved.schema);
    const progress = computeProgress(schemaFields, input.submissionData);
    const now = new Date();

    const response = await db.transaction(async (tx) => {
      // Find the existing draft by submissionId + sessionId
      const [existing] = await tx
        .select()
        .from(formResponse)
        .where(
          and(
            eq(formResponse.formId, input.formId),
            eq(formResponse.submissionId, input.submissionId),
            eq(formResponse.sessionId, input.sessionId),
            inArray(formResponse.status, DRAFTABLE_STATUSES),
          ),
        )
        .limit(1);

      if (!existing) return null;

      const startedAt = existing.startedAt ?? now;

      const [row] = await tx
        .update(formResponse)
        .set({
          status: "submitted",
          ipHash,
          data: input.submissionData,
          completedFields: progress.completedFields,
          totalFields: progress.totalFields,
          completionPercentage: progress.completionPercentage,
          lastFieldId: input.lastFieldId ?? existing.lastFieldId,
          lastStepReached: input.lastStepReached ?? existing.lastStepReached,
          submittedAt: existing.submittedAt ?? now,
          timeSpentSeconds:
            existing.timeSpentSeconds ??
            Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000)),
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(eq(formResponse.id, existing.id))
        .returning();

      if (!row) return null;

      // Snapshot per-field answers
      await tx.delete(formResponseAnswer).where(eq(formResponseAnswer.responseId, row.id));

      const answers = schemaFields
        .filter((field) => input.submissionData[field.id] !== undefined)
        .map((field, index) => {
          const rawValue = input.submissionData[field.id] as unknown;
          return {
            responseId: row!.id,
            formId: resolved.form.id,
            formVersionId: resolved.version.id,
            fieldId: field.id,
            fieldRef: field.ref,
            fieldType: field.type,
            fieldLabel: field.label,
            answerType: classifyAnswerType(field.type),
            value: rawValue,
            valueText: serializeValue(rawValue),
            ...projectAnswerValue(field.type, rawValue),
            sortOrder: index,
          };
        });

      if (answers.length > 0) {
        await tx.insert(formResponseAnswer).values(answers);
      }

      return row;
    });

    if (response) {
      await this.sendSubmissionNotification(resolved.schema, input.submissionData);
    }
    return response;
  }

  /**
   * GET /forms/:id/responses/:submissionId — Resume or view a response.
   */
  async getResponse(input: GetResponseInput) {
    const [row] = await db
      .select()
      .from(formResponse)
      .where(
        and(
          eq(formResponse.formId, input.formId),
          eq(formResponse.submissionId, input.submissionId),
          eq(formResponse.sessionId, input.sessionId),
        ),
      )
      .limit(1);

    if (!row) return null;

    // Fetch associated answers
    const answers = await db
      .select()
      .from(formResponseAnswer)
      .where(eq(formResponseAnswer.responseId, row.id))
      .orderBy(asc(formResponseAnswer.sortOrder));

    return { ...row, answers };
  }

  // ---- Webhooks ----

  /** Register a webhook for a form. */
  async createWebhook(input: CreateWebhookInput) {
    const [row] = await db
      .insert(formWebhook)
      .values({
        formId: input.formId,
        url: input.url,
        events: input.events,
        secret: input.secret,
        active: input.active,
      })
      .returning();

    return row ?? null;
  }

  /** Remove a webhook. */
  async deleteWebhook(input: DeleteWebhookInput) {
    const [deleted] = await db
      .delete(formWebhook)
      .where(and(eq(formWebhook.id, input.webhookId), eq(formWebhook.formId, input.formId)))
      .returning();

    return deleted ?? null;
  }

  /** List webhooks for a form. */
  async listWebhooks(input: ListWebhooksInput) {
    return db
      .select()
      .from(formWebhook)
      .where(eq(formWebhook.formId, input.formId))
      .orderBy(desc(formWebhook.createdAt));
  }
}
