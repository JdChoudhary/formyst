import {
  pgTable,
  text,
  uuid,
  jsonb,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { form } from "./form";

export const formWebhook = pgTable(
  "form_webhook",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),

    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().notNull().default(["response.completed"]),
    secret: text("secret"),
    active: boolean("active").notNull().default(true),

    lastTriggeredAt: timestamp("last_triggered_at"),
    failureCount: integer("failure_count").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    formIdx: index("form_webhook_form_idx").on(t.formId),
  }),
);
