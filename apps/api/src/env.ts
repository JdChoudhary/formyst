import { z } from "zod";
import {
  createEnv,
  nodeEnvSchema,
  parseBooleanFlag,
  parseCommaSeparatedList,
  portSchema,
} from "@repo/shared/env";

/**
 * HTTP server configuration.
 *
 * Everything the server needs is declared here and validated once, at import
 * time. Previously NODE_ENV only accepted "development" | "prod", so a normal
 * `NODE_ENV=production` deployment threw before the server could listen.
 */
const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,

  PORT: portSchema.default(8000),

  /** Public origin of this API; used for the OpenAPI document and logging. */
  BASE_URL: z.string().url().default("http://localhost:8000"),

  /** Browser origins allowed to call the API with credentials. */
  CORS_ORIGIN: z.string().default("http://localhost:3000").transform(parseCommaSeparatedList),

  /** Maximum accepted request body, e.g. "1mb". */
  BODY_LIMIT: z.string().default("1mb"),

  /** Serve /docs and /openapi.json. Turn off in locked-down environments. */
  ENABLE_API_DOCS: z
    .string()
    .default("true")
    .transform((value) => parseBooleanFlag(value, true)),

  /**
   * Trust `X-Forwarded-*` headers. Required behind a load balancer so client
   * IPs (and therefore rate limiting) are correct.
   */
  TRUST_PROXY: z
    .string()
    .default("false")
    .transform((value) => parseBooleanFlag(value, false)),

  /** Requests per IP per window. `0` disables rate limiting entirely. */
  RATE_LIMIT_MAX: z.coerce.number().int().min(0).default(600),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),

  /** How long in-flight requests get to finish on SIGTERM before a force exit. */
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(0).default(10_000),
});

export const env = createEnv("api", envSchema, process.env);

export const isProduction = env.NODE_ENV === "production";
export const rateLimitEnabled = env.RATE_LIMIT_MAX > 0;

/**
 * Normalised CORS allow-list. Trailing slashes are already stripped by
 * `parseCommaSeparatedList`, so comparisons are plain string equality.
 */
export const allowedOrigins: readonly string[] = env.CORS_ORIGIN;
