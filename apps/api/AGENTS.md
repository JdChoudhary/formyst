# API Server — AI Agent Guide

> Express + tRPC REST API server for the formystz platform.

## Overview

This package (`@repo/api`) provides the Express HTTP server that hosts the tRPC router and exposes REST endpoints via OpenAPI.

## Key Files

```
apps/api/
├── src/
│   ├── index.ts        # Entry point - HTTP server startup
│   ├── server.ts       # Express app configuration + tRPC mounting
│   └── env.ts          # Environment variable validation
├── public/
│   ├── signin.html     # Static sign-in page
│   └── signup.html     # Static sign-up page
├── package.json
├── tsconfig.json
└── tsup.config.ts      # Build configuration
```

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────►│  Express API │────►│  PostgreSQL  │
│   Frontend   │     │   (tRPC)     │     │   Database   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  OpenAPI     │
                     │  (REST)      │
                     └──────────────┘
```

## tRPC Integration

```typescript
// apps/api/src/server.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "@repo/trpc";

const app = express();

// Mount tRPC
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
  }),
);
```

## OpenAPI Endpoints

tRPC routes with `.meta({ openapi: {...} })` are automatically exposed as REST endpoints.

```typescript
// tRPC route definition
authRouter.login.meta({ openapi: { method: "POST", path: "/authentication/login" } });

// Available as REST endpoint:
// POST /authentication/login
```

### Available Endpoints

| Method | Path                          | Description               |
| ------ | ----------------------------- | ------------------------- |
| POST   | `/authentication/create-user` | Create new user (admin)   |
| POST   | `/authentication/login`       | Login with email/password |
| POST   | `/authentication/logout`      | Logout current user       |
| GET    | `/authentication/me`          | Get current user info     |
| GET    | `/health`                     | Health check              |

## API Documentation

The API documentation is available at:

- **Scalar**: `http://localhost:8000/docs` (HTML UI)
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## Environment Variables

```env
PORT=8000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/formystz
BETTER_AUTH_SECRET=super-secret-key-min-16-chars!!
BETTER_AUTH_URL=http://localhost:8000
```

## Development

```bash
# Start in development mode (with hot reload)
pnpm dev

# Build for production
pnpm build

# Start production
pnpm start
```

## Request/Response Flow

```
1. Client sends HTTP request
2. Express parses request
3. tRPC adapter routes to procedure
4. Middleware checks auth (if protectedProcedure)
5. Input validated with Zod
6. Handler executes business logic
7. Output validated with Zod
8. Response sent to client
```

## Error Handling

```typescript
import { TRPCError } from "@trpc/server";

// In tRPC routes
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Resource not found",
});

// Error response format
{
  "message": "Resource not found",
  "code": "NOT_FOUND",
  "zodError": null
}
```

## Important Notes

1. **tRPC Primary** — Most API access is via tRPC, not raw REST
2. **OpenAPI Secondary** — REST endpoints are generated from tRPC routes
3. **Cookie Auth** — Authentication uses HTTP-only cookies
4. **CORS** — Configured to allow frontend origin
5. **Static Files** — Public HTML files served from `public/` directory
