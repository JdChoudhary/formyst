import { pgTable, text, uuid, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { form } from "./form";
import { formVersion } from "./form-version";
export const formFieldAnalytics = pgTable(
  "form_field_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersion.id),
    fieldId: text("field_id").notNull(),

    views: integer("views").notNull().default(0), // times this field was reached
    starts: integer("starts").notNull().default(0), // focus events
    completions: integer("completions").notNull().default(0), // change events that stuck
    dropOffs: integer("drop_offs").notNull().default(0), // last field reached before abandon/partial
    avgTimeSpentMs: integer("avg_time_spent_ms"),

    periodStart: timestamp("period_start").notNull(), // daily bucket
    periodEnd: timestamp("period_end").notNull(),

    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    formFieldPeriodUnique: uniqueIndex("field_analytics_form_field_period_idx").on(
      t.formId,
      t.fieldId,
      t.periodStart,
    ),
  }),
);
