import {
  pgTable,
  type AnyPgColumn,
  text,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";

/**
 * A folder in a user's workspace. Folders nest via `parent_id` and are
 * soft-deleted (`deleted_at`) so a delete stays reversible.
 */
export const folder = pgTable(
  "folder",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    parentId: uuid("parent_id").references((): AnyPgColumn => folder.id, {
      onDelete: "cascade",
    }),

    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }),
    description: text("description"),
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 20 }),

    type: varchar("type", { length: 20 }).default("system").notNull(),
    position: integer("position").default(0).notNull(),

    archived: boolean("archived").default(false).notNull(),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),

    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("folder_user_idx").on(table.userId),
    index("folder_parent_idx").on(table.parentId),

    /**
     * Postgres treats NULLs as distinct in a unique index, so a single
     * `(user_id, parent_id, name)` index never rejected duplicate ROOT
     * folders — a user could create "Reports" a hundred times at the top
     * level. Two partial indexes, plus `deleted_at IS NULL`, enforce the rule
     * at both nesting levels and let a name be reused after a soft delete.
     */
    uniqueIndex("folder_root_name_unique")
      .on(table.userId, table.name)
      .where(sql`${table.parentId} IS NULL AND ${table.deletedAt} IS NULL`),

    uniqueIndex("folder_child_name_unique")
      .on(table.userId, table.parentId, table.name)
      .where(sql`${table.parentId} IS NOT NULL AND ${table.deletedAt} IS NULL`),
  ],
);
