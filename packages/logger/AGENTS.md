# Logger Package — AI Agent Guide

> Winston-based logging for the formystz platform.

## Overview

This package (`@repo/logger`) provides a configured Winston logger for consistent logging across all packages and apps.

## Key Files

```
packages/logger/
├── index.ts        # Logger export
├── env.ts          # Environment variable validation
└── package.json
```

## Usage

```typescript
import { logger } from "@repo/logger";

// Basic logging
logger.info("Server started on port 8000");
logger.error("Database connection failed", { error });
logger.warn("Low memory warning");
logger.debug("Debug information", { data });

// With metadata
logger.info("User created", { userId: "123", email: "user@example.com" });
logger.error("Request failed", { path: "/api/users", method: "GET", status: 500 });
```

## Log Levels

- `error` — Critical errors
- `warn` — Warning messages
- `info` — General information (default)
- `debug` — Debug details

## Environment Variables

```env
NODE_ENV=development  # Controls log format (json in production, colorized in dev)
```

## Important Notes

1. **Singleton** — Import `logger` directly from `@repo/logger`
2. **Structured Logging** — Pass metadata as second argument
3. **Production Format** — JSON logs in production for log aggregation
4. **Development Format** — Colorized, human-readable logs in development
