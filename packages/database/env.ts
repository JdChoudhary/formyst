import { z } from "zod";
import { createEnv, nodeEnvSchema } from "@repo/shared/env";

/**
 * Database configuration.
 *
 * The single required variable is DATABASE_URL; NODE_ENV is validated here too
 * so a typo like `NODE_ENV=prod` fails loudly at boot rather than silently
 * changing SSL/pool behaviour later.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (postgresql://user:pass@host:5432/db)")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres:// or postgresql:// connection string",
    ),
  NODE_ENV: nodeEnvSchema,
  /** Optional override for the pg pool size; drizzle defaults to 10. */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).optional(),
});

export const env = createEnv("database", envSchema, process.env);

export type DatabaseEnv = typeof env;
