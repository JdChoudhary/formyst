# Database Package — AI Agent Guide

> Drizzle ORM + PostgreSQL database layer for the formystz platform.

## Overview

This package (`@repo/database`) provides the database schema, migrations, and ORM configuration using Drizzle ORM with PostgreSQL.

## Key Files

```
packages/database/
├── schema.ts              # Main export (re-exports auth + formyst schemas)
├── drizzle.config.ts      # Drizzle Kit configuration
├── drizzle/               # Generated migrations
│   ├── 0000_tidy_wong.sql
│   └── meta/
└── index.ts               # Package exports
```

## Database Tables

### Auth Tables (auth-schema.ts)

| Table          | Description                                 |
| -------------- | ------------------------------------------- |
| `user`         | User accounts (id, name, email, role, etc.) |
| `session`      | User sessions (Better Auth managed)         |
| `account`      | OAuth accounts                              |
| `organization` | Multi-tenant organizations                  |
| `member`       | Organization membership                     |
| `invitation`   | Organization invitations                    |

## Schema Patterns

| Table          | Description                                    |
| -------------- | ---------------------------------------------- |
| `folder`       | Folders for organizing forms                   |
| `tag`          | Tags for categorizing forms                    |
| `form`         | Forms with schema, settings, and versions      |
| `form_version` | Versioned form data (blocks, fields, settings) |

### Table Definition

```typescript
import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const presentations = pgTable("presentations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").default("draft").notNull(),
  settings: jsonb("settings").default({}).$type<{ allowAnonymous?: boolean }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

### Relations

```typescript
import { relations } from "drizzle-orm";

export const presentationRelations = relations(presentations, ({ one, many }) => ({
  user: one(user, {
    fields: [presentations.userId],
    references: [user.id],
  }),
  slides: many(slides),
}));
```

## Common Queries

```typescript
import db, { eq, and, desc } from "@repo/database";
import { folder, form } from "@repo/database";

// Get all presentations for a user
const userPresentations = await db
  .select()
  .from(presentations)
  .where(eq(presentations.userId, userId))
  .orderBy(desc(presentations.createdAt));

// Get presentation with slides
const presentation = await db.query.presentations.findFirst({
  where: eq(presentations.id, id),
  with: {
    slides: true,
  },
});

// Create a new presentation
const [newPresentation] = await db
  .insert(presentations)
  .values({
    userId,
    title: "My formyst",
    status: "draft",
  })
  .returning();
```

## Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Open Drizzle Studio (GUI)
pnpm dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/formystz
```

## Important Notes

1. **UUID Primary Keys** — All formyst tables use `uuid("id").defaultRandom().primaryKey()`
2. **Text IDs** — Auth tables use `text("id").primaryKey()` (Better Auth requirement)
3. **Cascade Deletes** — Use `onDelete: "cascade"` for related data
4. **JSONB Columns** — Use `$type<T>()` for typed JSON fields
5. **Timestamps** — Always include `createdAt` and `updatedAt`
6. **Indexes** — Add indexes for frequently queried columns
