import { pgTable, uuid, index, primaryKey } from "drizzle-orm/pg-core";
import { form } from "./form";
import { tag } from "./tag";

/**
 * Join table between forms and tags.
 *
 * It previously had no primary key, so the same tag could be attached to a
 * form any number of times. The composite primary key makes each pair unique
 * and also provides the index used for "tags of this form" lookups.
 */
export const formTags = pgTable(
  "form_tags",
  {
    formId: uuid("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),

    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.formId, table.tagId] }),
    // Reverse lookup: "all forms carrying this tag".
    index("idx_form_tags_tag").on(table.tagId),
  ],
);
