import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";
import type { Theme } from "@repo/shared/form/form-types";

/**
 * Reusable form themes — a professional theme library.
 *
 * The table stores:
 *   - `config` — the full renderer `Theme` typed with the same schema the
 *     renderers already read (`schema.theme`).
 *   - Metadata columns (name, origin, isDefault, ...) for listing/filtering.
 *
 * A saved theme drops straight onto any form:
 *   schema.theme = theme.config;
 */
export const theme = pgTable(
  "theme",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),

    origin: text("origin", {
      enum: ["new", "duplicate", "auto-branding"],
    })
      .notNull()
      .default("new"),

    sourceThemeId: uuid("source_theme_id").references((): AnyPgColumn => theme.id, {
      onDelete: "set null",
    }),

    // The full renderer Theme config — the single source of truth.
    config: jsonb("config").$type<Theme>().notNull(),

    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("theme_user_idx").on(t.userId),
    index("theme_source_idx").on(t.sourceThemeId),

    /**
     * The route layer already mapped SQLSTATE 23505 on themes to a CONFLICT
     * response — but no unique constraint existed, so duplicate names were
     * silently allowed. This makes that mapping actually fire.
     */
    uniqueIndex("theme_user_name_unique").on(t.userId, t.name),

    /**
     * `ThemeService.setDefault` opens by clearing every flag and then setting
     * exactly one. A partial unique index guarantees the "at most one default
     * per user" invariant holds even if two requests race.
     */
    uniqueIndex("theme_user_default_unique")
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ],
);
