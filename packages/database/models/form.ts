import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { folder } from "./folder";
import { theme } from "./theme";

/**
 * A form definition. `form_version` holds the versioned schema snapshots;
 * this row only tracks identity, ownership and the pointers to the versions
 * that are currently live.
 */
export const form = pgTable(
  "form",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    folderId: uuid("folder_id").references(() => folder.id, { onDelete: "set null" }),

    /**
     * Provenance only — deliberately nullable with `set null` so deleting the
     * author's account never deletes forms they created for someone else,
     * and never blocks the deletion with a foreign-key error.
     */
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),

    title: text("title").notNull(),
    description: text("description"),

    /**
     * Public URL key. Uniqueness is GLOBAL, not per user: the public pages
     * resolve a form by slug alone (`/f/{slug}`), so a per-user index would
     * let two accounts claim the same slug and serve each other's form.
     */
    slug: text("slug").notNull(),

    // Both uuid now (was uuid/text mismatch). No .references() on either —
    // form <-> formVersion is circular (a form needs a current version,
    // a version needs its form), so this FK is enforced at the app layer,
    // not the DB, to avoid a chicken-and-egg constraint at insert time.
    currentVersionId: uuid("current_version_id"),
    publishedVersionId: uuid("published_version_id"),

    /** Mirrors `form_version.version` of the current version; 0 = never saved. */
    revision: integer("revision").notNull().default(0),

    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at"),

    apiEnabled: boolean("api_enabled").notNull().default(false),
    apiKeyHash: text("api_key_hash"),

    // Theme reference — the form stores ONLY an id (library theme) or a URL
    // (external/Typeform theme). The full visual config is resolved on read
    // (see FormService.withDetail) so both renderers stay compatible.
    themeId: uuid("theme_id").references(() => theme.id, { onDelete: "set null" }),
    themeUrl: text("theme_url"),

    // Kept out of the versioned jsonb schema on purpose — see note above.
    // Never store passwordProtection.password in formVersion.schema.
    passwordProtectionEnabled: boolean("password_protection_enabled").notNull().default(false),
    passwordHash: text("password_hash"),

    /**
     * Denormalized counter. The dashboard shows "N responses" on every form
     * load, so this avoids a COUNT(*) over form_response each time. It is
     * incremented in the same transaction that finalises a submission.
     */
    responseCount: integer("response_count").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    // Enforced globally — see the `slug` comment above.
    uniqueIndex("form_slug_unique").on(t.slug),
    // Serves the public "published form by slug" lookup directly.
    index("form_published_slug_idx").on(t.isPublished, t.slug),
    index("form_user_idx").on(t.userId),
    index("form_folder_idx").on(t.folderId),
    index("form_created_by_idx").on(t.createdBy),
  ],
);
