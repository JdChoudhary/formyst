import { pgTable, text, uuid, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { form } from "./form";
export const formAnalyticsDaily = pgTable(
  "form_analytics_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),
    views: integer("views").notNull().default(0),
    starts: integer("starts").notNull().default(0),
    completions: integer("completions").notNull().default(0),
    avgCompletionTimeSeconds: integer("avg_completion_time_seconds"),
    completionRate: integer("completion_rate"), // store as basis points (0-10000) to avoid float
    date: timestamp("date").notNull(),
  },
  (t) => ({
    formDateUnique: uniqueIndex("analytics_daily_form_date_idx").on(t.formId, t.date),
  }),
);
