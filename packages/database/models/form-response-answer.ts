import {
  pgTable,
  text,
  uuid,
  jsonb,
  timestamp,
  integer,
  index,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { formResponse } from "./form-response";
import { form } from "./form";
import { formVersion } from "./form-version";

export const formResponseAnswer = pgTable(
  "form_response_answer",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    responseId: text("response_id")
      .notNull()
      .references(() => formResponse.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }), // denormalized for analytics queries
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersion.id),

    fieldId: text("field_id").notNull(),
    /**
     * Public/API-friendly reference.
     *
     * Example:
     * "email"
     * "company_name"
     */
    fieldRef: text("field_ref"),
    // Snapshot at submission time — never trust the live schema for old answers
    fieldType: text("field_type").notNull(),
    fieldLabel: text("field_label").notNull(),
    /**
     * Type of answer rather than field type.
     *
     * Example:
     *
     * fieldType = "checkbox"
     * answerType = "choices"
     */
    answerType: text("answer_type").notNull(),

    // Raw answer for scalar field types (short_text, date, email, etc.)
    value: jsonb("value").$type<unknown>(),

    // Normalized projections — avoid parsing jsonb for every analytics query
    valueText: text("value_text"),
    valueNumber: integer("value_number"), // rating, opinion_scale, nps
    valueChoiceIds: jsonb("value_choice_ids").$type<string[]>(), // multiple_choice, by option id
    valueBoolean: boolean("value_boolean"), // yes_no

    // Populated only for deep_dive fields — AI follow-up conversation
    // valueTranscript: jsonb("value_transcript").$type<{ assistant: string; user: string }[]>(),
    /**
     * Deep-dive / AI conversation.
     */
    valueTranscript: jsonb("value_transcript").$type<
      {
        role: "assistant" | "user";
        content: string;
        timestamp?: string;
      }[]
    >(),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    responseIdx: index("response_answer_response_idx").on(t.responseId),
    formFieldIdx: index("response_answer_form_field_idx").on(t.formId, t.fieldId),
    fieldTypeIdx: index("response_answer_field_type_idx").on(t.fieldType),
    valueTextIdx: index("response_answer_value_text_idx")
      .on(t.valueText)
      .where(sql`${t.valueText} IS NOT NULL`),
    responseFieldUnique: uniqueIndex("response_answer_response_field_idx").on(
      t.responseId,
      t.fieldId,
    ),
  }),
);
