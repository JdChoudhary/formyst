import { pgTable, text, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
export const tag = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 100,
    }).notNull(),

    slug: varchar("slug", {
      length: 100,
    }),

    color: varchar("color", {
      length: 20,
    }),

    description: text("description"),

    createdBy: text("created_by").references(() => user.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("tag_unique").on(table.userId, table.name)],
);
