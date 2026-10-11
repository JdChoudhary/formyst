import { z } from "zod";
import { createEnv, nodeEnvSchema, parseCommaSeparatedList } from "@repo/shared/env";

/**
 * Auth configuration.
 *
 * Validated once at import time so a misconfigured deployment fails at boot
 * instead of on the first sign-in attempt.
 */
const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,

    BETTER_AUTH_SECRET: z
      .string()
      .min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),

    BETTER_AUTH_URL: z
      .string()
      .url("BETTER_AUTH_URL must be an absolute URL, e.g. http://localhost:8000")
      .default("http://localhost:8000"),

    /** Browser origins allowed to send credentialed auth requests. */
    CORS_ORIGIN: z
      .string()
      .default("http://localhost:3000")
      .transform(parseCommaSeparatedList),

    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),
  })
  .superRefine((value, ctx) => {
    const hasClientId = value.GOOGLE_CLIENT_ID.trim() !== "";
    const hasClientSecret = value.GOOGLE_CLIENT_SECRET.trim() !== "";

    // A half-configured provider silently breaks the Google button at runtime.
    if (hasClientId !== hasClientSecret) {
      ctx.addIssue({
        code: "custom",
        path: [hasClientId ? "GOOGLE_CLIENT_SECRET" : "GOOGLE_CLIENT_ID"],
        message:
          "Google sign-in needs BOTH GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither.",
      });
    }
  });

export const env = createEnv("auth", envSchema, process.env);

export type AuthEnv = typeof env;

/** True when a complete Google OAuth credential pair is present. */
export const isGoogleAuthConfigured =
  env.GOOGLE_CLIENT_ID.trim() !== "" && env.GOOGLE_CLIENT_SECRET.trim() !== "";
