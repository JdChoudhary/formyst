import { check, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { aiChatSession } from "./ai-chat-session";

export type AIChatMessageRole = "user" | "assistant" | "system";

/**
 * A single turn in an AI builder conversation.
 *
 * Messages are append-only. Ownership/context come from the parent session, so
 * this table only needs the session FK — `getChatHistory` verifies the session
 * belongs to the caller before reading a single row. `metadata` carries
 * provider diagnostics and, on assistant turns that produced a form, the
 * validated schema, so a conversation can be replayed to the model and its
 * previews restored without a separate `form` link.
 */
export const aiChatMessage = pgTable(
  "ai_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    sessionId: uuid("session_id")
      .notNull()
      .references(() => aiChatSession.id, { onDelete: "cascade" }),

    role: text("role", { enum: ["user", "assistant", "system"] })
      .notNull()
      .$type<AIChatMessageRole>(),

    content: text("content").notNull(),

    /**
     * Turn payload beyond `content`: the validated schema an assistant turn
     * produced, provider diagnostics, etc. This is what lets a later turn
     * replay the current form back to the model as follow-up context.
     */
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    /** Provider model that produced this turn (assistant turns only). */
    modelUsed: varchar("model_used", { length: 100 }),

    /** Total tokens billed for this turn, when the provider reports usage. */
    tokensUsed: integer("tokens_used"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // History is always read as "messages in this session, oldest first".
    index("ai_chat_messages_session_idx").on(t.sessionId, t.createdAt),
    check(
      "ai_message_tokens_nonneg",
      sql`${t.tokensUsed} IS NULL OR ${t.tokensUsed} >= 0`,
    ),
  ],
);
