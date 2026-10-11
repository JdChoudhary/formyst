import { z } from "zod";
import { createEnv, nodeEnvSchema, parseBooleanFlag } from "@repo/shared/env";

/**
 * Business-logic configuration.
 *
 * The previous version of this file validated an *empty* schema, so it could
 * never fail and gave callers nothing. These limits are the ones the services
 * actually branch on, so they belong here rather than as magic numbers buried
 * in individual modules.
 */
const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,

  /** Maximum size of a respondent's answer payload, in bytes. */
  RESPONSE_DATA_MAX_BYTES: z.coerce.number().int().min(1_000).default(256_000),

  /** How long a single webhook delivery may take before it is abandoned. */
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(5_000),

  /** Master switch for outbound webhook delivery. */
  WEBHOOK_DELIVERY_ENABLED: z
    .string()
    .default("true")
    .transform((value) => parseBooleanFlag(value, true)),
});

export const env = createEnv("services", envSchema, process.env);

export type ServicesEnv = typeof env;
