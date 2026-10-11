import { z } from "zod";

/**
 * Environment parsing shared by every server package.
 *
 * Each package previously carried its own copy of a `createEnv` helper that
 * surfaced only `error.message`, which hides *which* variable was rejected and
 * crashes the process with an opaque stack. This version collects every issue
 * and throws one readable error at boot.
 *
 * `@repo/shared` is also bundled for the browser, so this module deliberately
 * avoids `@types/node`: the caller passes its own environment object rather
 * than this module reaching for the `process` global.
 */

/** The only NODE_ENV values the platform runs under. */
export const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

export type NodeEnv = z.infer<typeof nodeEnvSchema>;

/** Structural stand-in for `process.env` — no Node types required. */
export type EnvSource = Record<string, string | undefined>;

export interface EnvIssue {
  path: string;
  message: string;
}

/** Thrown when the supplied environment does not satisfy a package's schema. */
export class EnvValidationError extends Error {
  readonly issues: EnvIssue[];

  constructor(scope: string, issues: EnvIssue[]) {
    const detail = issues
      .map((issue) => `  - ${issue.path}: ${issue.message}`)
      .join("\n");
    super(`Invalid environment for ${scope}:\n${detail}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Parse and validate an environment object, failing fast with every issue at
 * once instead of throwing on the first bad variable.
 */
export function createEnv<TSchema extends z.ZodType>(
  scope: string,
  schema: TSchema,
  source: EnvSource,
): z.infer<TSchema> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.map(String).join(".") || "(root)",
      message: issue.message,
    }));
    throw new EnvValidationError(scope, issues);
  }

  return result.data;
}

/** `"8000"` -> `8000`, so ports can be declared in the schema itself. */
export const portSchema = z.coerce.number().int().min(1).max(65_535);

/**
 * Comma-separated list -> trimmed, trailing-slash-free, non-empty entries.
 *
 * Exported as a plain function so each package can pick its own default while
 * still sharing the exact same normalisation (CORS comparisons are
 * string-equality, so a stray trailing slash silently breaks them).
 */
export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/** Zod helper: comma-separated string -> `string[]`. */
export const commaSeparatedListSchema = z
  .string()
  .default("")
  .transform(parseCommaSeparatedList);

/** `"true"` / `"1"` / `"yes"` -> `true`. Anything else -> the fallback. */
export function parseBooleanFlag(raw: string | undefined, fallback = false): boolean {
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}
