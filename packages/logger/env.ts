import { z } from "zod";
import { createEnv, nodeEnvSchema } from "@repo/shared/env";

/**
 * Logger configuration.
 *
 * NODE_ENV used to be `z.enum(["development", "prod"])`, which rejected the
 * standard `NODE_ENV=production` and crashed the process at boot. The allowed
 * log levels also missed `warn`, which winston supports.
 */
const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  LOGGER_LEVEL: z.enum(["error", "warn", "info", "debug", "verbose"]).optional(),
});

export const env = createEnv("logger", envSchema, process.env);

export type LoggerEnv = typeof env;
