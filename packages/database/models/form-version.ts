import {
  pgTable,
  text,
  jsonb,
  timestamp,
  integer,
  uniqueIndex,
  index,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { form } from "./form";
import { user } from "./auth-schema";
import type { FormSchema } from "@repo/shared/form/form-types";

/**
 * An immutable snapshot of a form's schema.
 *
 * `version` is a per-form monotonic counter. Two concurrent saves used to be
 * able to compute the same "next" number and insert duplicate versions; the
 * unique index below turns that race into a database error the service can
 * retry instead of silent corruption.
 */
export const formVersion = pgTable(
  "form_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),

    /** Per-form sequence number, starting at 1. */
    version: integer("version").notNull(),

    /** SHA-256 of the canonical schema, for cheap change detection. */
    schemaHash: text("schema_hash").notNull(),

    /** Full snapshot at save time. */
    schema: jsonb("schema").$type<FormSchema>().notNull(),

    source: text("source", {
      enum: ["manual", "ai", "import", "restore", "draft"],
    })
      .notNull()
      .default("manual"),

    /** Prompt that produced this version, when source is `ai`. */
    prompt: text("prompt"),

    changeSummary: text("change_summary"),

    /** Set when this version was created by restoring an earlier one. */
    restoredFromVersionId: uuid("restored_from_version_id").references(
      (): AnyPgColumn => formVersion.id,
      { onDelete: "set null" },
    ),

    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("form_version_form_version_unique").on(t.formId, t.version),
    index("form_version_form_idx").on(t.formId),
    /** Lets a save skip writing a snapshot whose schema is unchanged. */
    index("form_version_schema_hash_idx").on(t.formId, t.schemaHash),
  ],
);
