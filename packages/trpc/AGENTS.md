# tRPC Package — AI Agent Guide

> tRPC router, procedures, and route definitions for the formystz platform API.

## Overview

This package (`@repo/trpc`) provides the tRPC server configuration, procedures (public, protected, admin), and route definitions for the API layer.

## Key Files

```
packages/trpc/
├── server/
│   ├── trpc.ts              # tRPC initialization + procedure definitions
│   ├── context.ts           # Request context type
│   ├── index.ts             # Main router export
│   ├── routes/
│   │   ├── index.ts         # Route registry
│   │   ├── auth/
│   │   │   ├── route.ts     # Auth routes (login, signup, logout, me)
│   │   │   └── model.ts     # Auth Zod schemas
│   │   └── health/
│   │       ├── route.ts     # Health check route
│   │       └── model.ts
│   ├── services/
│   │   └── index.ts         # Service layer exports
│   └── utils/
│       ├── cookie.ts        # Cookie utilities
│       └── path-generator.ts # OpenAPI path generation
├── client/
│   └── index.ts             # Client-side tRPC utilities
└── package.json
```

## Procedures

### publicProcedure

No authentication required. Open to everyone.

```typescript
import { publicProcedure, router } from "../../trpc";

export const myRouter = router({
  myQuery: publicProcedure
    .meta({ openapi: { method: "GET", path: "/my-endpoint" } })
    .input(z.object({ id: z.string() }))
    .output(z.object({ result: z.string() }))
    .query(async ({ input }) => {
      return { result: `Hello ${input.id}` };
    }),
});
```

### protectedProcedure

Requires a valid Better Auth session. Adds `ctx.user` with:

- `id` — User ID
- `role` — User role (default: "student")
- `email` — User email
- `name` — User name

```typescript
export const myRouter = router({
  myQuery: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is guaranteed to exist
    return { userId: ctx.user.id };
  }),
});
```

### adminProcedure

Requires admin or super-admin role.

```typescript
export const myRouter = router({
  adminOnly: adminProcedure.query(async ({ ctx }) => {
    // ctx.user.role is "admin" or "super-admin"
    return { message: "Admin access granted" };
  }),
});
```

### superAdminProcedure

Requires super-admin role only.

```typescript
export const myRouter = router({
  superAdminOnly: superAdminProcedure.query(async ({ ctx }) => {
    return { message: "Super admin access granted" };
  }),
});
```

## Adding a New Route

### 1. Create Model File (Zod Schemas)

```typescript
// packages/trpc/server/routes/myFeature/model.ts
import { z } from "zod";

export const myFeatureInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const myFeatureOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.date(),
});
```

### 2. Create Route File

```typescript
// packages/trpc/server/routes/myFeature/route.ts
import { z } from "../../schema";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { myFeatureInputSchema, myFeatureOutputSchema } from "./model";

const TAGS = ["MyFeature"];
const getPath = generatePath("/my-feature");

export const myFeatureRouter = router({
  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(myFeatureInputSchema)
    .output(myFeatureOutputSchema)
    .mutation(async ({ input, ctx }) => {
      // Implementation
      return { id: "uuid", title: input.title, createdAt: new Date() };
    }),

  getAll: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.array(myFeatureOutputSchema))
    .query(async ({ ctx }) => {
      // Implementation
      return [];
    }),
});
```

### 3. Register Route

```typescript
// packages/trpc/server/routes/index.ts
import { myFeatureRouter } from "./myFeature/route";

export const appRouter = router({
  // ... existing routes
  myFeature: myFeatureRouter,
});

export type AppRouter = typeof appRouter;
```

## OpenAPI Integration

Routes with `.meta({ openapi: {...} })` are automatically exposed as REST endpoints via `trpc-to-openapi`.

```typescript
// This tRPC procedure...
myProcedure.meta({ openapi: { method: "POST", path: "/api/my-endpoint" } });

// ...is also available as:
// POST /api/my-endpoint
```

## Common Patterns

### Input Validation

```typescript
import { z } from "zod";

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["student", "teacher", "admin"]),
});
```

### Error Handling

```typescript
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "NOT_FOUND",
  message: "Resource not found",
});
```

### Database Access

```typescript
import db, { eq, user } from "@repo/database";

const [record] = await db.select().from(user).where(eq(user.id, id)).limit(1);
```

## Environment Variables

The tRPC package itself doesn't have env vars — it uses the hosting app's context.

## Important Notes

1. **Zod v4** — Use `z.object()` from `zod` (not `zod/v4`)
2. **Schema Export** — Import `z` and helpers from `../../schema`
3. **Path Generator** — Use `generatePath()` for consistent OpenAPI paths
4. **Tags** — Group related routes with tags for OpenAPI docs
5. **Type Safety** — The `AppRouter` type is exported for client usage
