/**
 * Typed errors for the service layer.
 *
 * Services used to signal failure with bare `Error`s and the tRPC routes then
 * guessed at an HTTP status by matching substrings of the message
 * (`message === "Form not found"`, `message.startsWith("Cannot publish")`, ...).
 * That silently turned real bugs into 500s and would break on any copy edit.
 *
 * Every service now throws a `ServiceError` carrying an explicit code, and the
 * route layer maps that code to a tRPC error mechanically.
 */

export type ServiceErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL";

export interface ServiceErrorOptions {
  /** Stable machine-readable detail, e.g. `"form_not_found"`. */
  reason?: string;
  /** Original error, preserved for logging. */
  cause?: unknown;
}

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly reason: string | undefined;

  constructor(code: ServiceErrorCode, message: string, options: ServiceErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ServiceError";
    this.code = code;
    this.reason = options.reason;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

/* -------------------------------------------------------------------------- */
/* Factories — keep call sites short and messages consistent                  */
/* -------------------------------------------------------------------------- */

export function badRequestError(message: string, reason?: string): ServiceError {
  return new ServiceError("BAD_REQUEST", message, { reason });
}

export function unauthorizedError(message = "Not authenticated"): ServiceError {
  return new ServiceError("UNAUTHORIZED", message, { reason: "not_authenticated" });
}

export function forbiddenError(message = "You do not have access to this resource"): ServiceError {
  return new ServiceError("FORBIDDEN", message, { reason: "forbidden" });
}

export function notFoundError(message: string, reason?: string): ServiceError {
  return new ServiceError("NOT_FOUND", message, { reason });
}

export function conflictError(message: string, reason?: string): ServiceError {
  return new ServiceError("CONFLICT", message, { reason });
}

export function internalError(message: string, cause?: unknown): ServiceError {
  return new ServiceError("INTERNAL", message, { reason: "internal", cause });
}

/** Maps to HTTP 429. Message should tell the caller when to retry. */
export function tooManyRequestsError(
  message = "Too many requests. Please try again later.",
  retryAfterMs?: number,
): ServiceError {
  return new ServiceError("TOO_MANY_REQUESTS", message, {
    reason: "rate_limited",
    cause: retryAfterMs,
  });
}

/** Maps to HTTP 503 — e.g. the AI provider has no configured API key. */
export function serviceUnavailableError(message = "Service temporarily unavailable"): ServiceError {
  return new ServiceError("SERVICE_UNAVAILABLE", message, { reason: "service_unavailable" });
}

/* -------------------------------------------------------------------------- */
/* PostgreSQL error inspection                                                */
/* -------------------------------------------------------------------------- */

/** https://www.postgresql.org/docs/current/errcodes-appendix.html */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";
export const PG_NOT_NULL_VIOLATION = "23502";

/** Reads the SQLSTATE off a driver error without trusting its shape. */
export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** The `constraint` name on a driver error, when the driver supplied one. */
export function pgConstraintName(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const constraint = (error as { constraint?: unknown }).constraint;
  return typeof constraint === "string" ? constraint : undefined;
}

export function isPgUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === PG_UNIQUE_VIOLATION;
}

/**
 * Runs a write that may collide with a unique index and turns the driver's
 * 23505 into a friendly CONFLICT. Every other error is rethrown untouched, so
 * genuinely unexpected failures still surface as 500s.
 */
export async function withUniqueConstraint<T>(
  operation: () => Promise<T>,
  conflict: { message: string; reason: string },
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isPgUniqueViolation(error)) {
      throw conflictError(conflict.message, conflict.reason);
    }
    throw error;
  }
}

/**
 * Wraps a database call so driver errors surface as `ServiceError`s instead of
 * leaking SQLSTATE codes and table names to the client.
 */
export async function withDatabaseErrors<T>(
  operation: () => Promise<T>,
  mapError: (error: unknown) => ServiceError,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isServiceError(error)) throw error;
    throw mapError(error);
  }
}
