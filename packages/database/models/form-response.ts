import {
  pgTable,
  text,
  uuid,
  jsonb,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { form } from "./form";
import { formVersion } from "./form-version";
import { user } from "./auth-schema";

export const formResponse = pgTable(
  "form_response",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersion.id, { onDelete: "restrict" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),

    // Public-facing id, decoupled from internal PK — this is what the client sends back on stage/complete calls
    submissionId: text("submission_id").notNull(),

    status: text("status", {
      enum: ["draft", "submitted", "partial", "abandoned", "spam", "deleted"],
    })
      .notNull()
      .default("draft"),

    sessionId: text("session_id"),
    idempotencyKey: text("idempotency_key"),

    // Anti-tampering: HMAC issued on form load, verified on every stage/complete call
    payloadSignature: text("payload_signature"),

    // Free-form event tagging — source, spam flag, theme version, query-param variants
    scopes: jsonb("scopes").$type<{ type: string; id: string; version?: number }[]>().default([]),

    // Optional convenience snapshot — full answer set for export/replay.
    // formResponseAnswer remains the source of truth for querying.
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),

    completedFields: integer("completed_fields").notNull().default(0),
    totalFields: integer("total_fields").notNull().default(0),
    completionPercentage: integer("completion_percentage").notNull().default(0),

    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    country: text("country"),
    region: text("region"),
    city: text("city"),

    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),

    landedAt: timestamp("landed_at").notNull(), // form first opened, from client
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    lastStagedAt: timestamp("last_staged_at"), // bumped on every autosave
    timeSpentSeconds: integer("time_spent_seconds"),

    lastFieldId: text("last_field_id"),
    lastStepReached: integer("last_step_reached").notNull().default(0),

    isDuplicate: boolean("is_duplicate").notNull().default(false),
    isSpam: boolean("is_spam").notNull().default(false),
    aiProcessed: boolean("ai_processed").notNull().default(false),

    // Quiz/outcome scoring — 1:1 with response, cheap as columns rather than a join
    score: integer("score"),
    outcomeKey: text("outcome_key"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    // Maintained by the driver so no write path can forget to bump it.
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    /*
     * Composite (form_id, submitted_at): serves both "all responses for this
     * form" and the analytics dashboard's "…ORDER BY submitted_at DESC".
     * It replaces the previous single-column form_response_form_idx and
     * form_response_submitted_at_idx, whose leading column this covers.
     */
    formSubmittedIdx: index("form_response_form_submitted_idx").on(
      t.formId,
      t.submittedAt,
    ),
    versionIdx: index("form_response_version_idx").on(t.formVersionId),
    userIdx: index("form_response_user_idx").on(t.userId),
    sessionIdx: index("form_response_session_idx").on(t.sessionId),
    statusIdx: index("form_response_status_idx").on(t.status),

    submissionIdUnique: uniqueIndex("form_response_submission_id_idx").on(t.formId, t.submissionId),

    draftSessionUnique: uniqueIndex("form_response_draft_session_idx")
      .on(t.formId, t.sessionId)
      .where(sql`${t.status} NOT IN ('submitted', 'spam', 'deleted')`),

    idempotencyUnique: uniqueIndex("form_response_idempotency_idx").on(t.formId, t.idempotencyKey),
  }),
);
