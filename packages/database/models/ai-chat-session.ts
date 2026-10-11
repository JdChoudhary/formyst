import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

/**
 * A conversation with the AI form builder.
 *
 * One session is one chat: it can span many turns and produce many forms. The
 * `title` is derived from the first user message so a session list has
 * something human-readable, and `updatedAt` is bumped on every message so the
 * list can be ordered by recency.
 */
export const aiChatSession = pgTable(
  "ai_chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /** Derived from the first user turn; null until the first message lands. */
    title: text("title"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Serves "this user's sessions, most recently active first" directly.
    index("ai_chat_sessions_user_updated_idx").on(t.userId, t.updatedAt),
    // Lets a lookup scope any session id straight to its owner.
    uniqueIndex("ai_chat_sessions_user_id_unique_idx").on(t.userId, t.id),
  ],
);
