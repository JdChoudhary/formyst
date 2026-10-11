# Services Package — AI Agent Guide

> Business logic layer for the formystz platform.

## Overview

This package (`@repo/services`) contains the business logic for the application, used by tRPC routes and other packages.

## Key Files

```
packages/services/
├── course/
│   ├── index.ts        # CourseService exports
│   └── model.ts        # Course-related models
├── user/
│   ├── index.ts        # UserService exports
│   └── model.ts        # User-related models
└── index.ts            # Package exports
```

## Service Pattern

```typescript
// packages/services/course/index.ts
import db, { eq, courses } from "@repo/database";

export const CourseService = {
  async create(userId: string, data: CreateCourseInput) {
    const [course] = await db
      .insert(courses)
      .values({ ...data, userId })
      .returning();
    return course;
  },

  async getById(id: string) {
    return db.query.courses.findFirst({
      where: eq(courses.id, id),
    });
  },

  async getAll(userId: string) {
    return db.select().from(courses).where(eq(courses.userId, userId));
  },

  async update(id: string, data: UpdateCourseInput) {
    const [course] = await db.update(courses).set(data).where(eq(courses.id, id)).returning();
    return course;
  },

  async delete(id: string) {
    await db.delete(courses).where(eq(courses.id, id));
  },
};
```

## Adding a New Service

### 1. Create Service File

```typescript
// packages/services/presentation/index.ts
import db, { eq, presentations } from "@repo/database";

export const PresentationService = {
  async create(userId: string, data: CreatePresentationInput) {
    const [presentation] = await db
      .insert(presentations)
      .values({ ...data, userId })
      .returning();
    return presentation;
  },

  async getById(id: string, userId: string) {
    return db.query.presentations.findFirst({
      where: eq(presentations.id, id),
      with: { slides: true },
    });
  },

  async getAll(userId: string) {
    return db.select().from(presentations).where(eq(presentations.userId, userId));
  },
};
```

### 2. Create Model File (Input/Output Types)

```typescript
// packages/services/presentation/model.ts
import { z } from "zod";

export const createPresentationInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
});

export type CreatePresentationInput = z.infer<typeof createPresentationInputSchema>;
```

### 3. Export from Index

```typescript
// packages/services/index.ts
export { PresentationService } from "./presentation";
export { UserService } from "./user";
```

## Service Categories

### User Service

- User CRUD operations
- Profile management
- Role-based access

### Course Service

- Course CRUD operations
- Enrollment management
- Course content

### (Planned) Presentation Service

- Presentation CRUD
- Slide management
- formyst sessions

### (Planned) Session Service

- Live session management
- Participant handling
- Response collection

## Important Notes

1. **Database Access** — Services use Drizzle ORM from `@repo/database`
2. **Input Validation** — Use Zod schemas for input validation
3. **Error Handling** — Services should throw appropriate errors (TRPCError in tRPC routes)
4. **Single Responsibility** — Each service handles one domain
5. **Reusability** — Services are used by tRPC routes, not called directly from apps
