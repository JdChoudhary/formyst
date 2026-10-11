import { pgTable, text, uuid, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { form } from "./form";
import { formVersion } from "./form-version";
export const formView = pgTable(
  "form_view",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersion.id),
    sessionId: text("session_id"),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    country: text("country"),
    startedResponse: boolean("started_response").notNull().default(false), // backfilled when formResponse is created for this session
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  },
  (t) => ({
    formIdx: index("form_view_form_idx").on(t.formId),
    sessionIdx: index("form_view_session_idx").on(t.sessionId),
  }),
);
