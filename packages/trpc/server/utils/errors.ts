import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { isServiceError, type ServiceErrorCode } from "@repo/services/errors";

const TRPC_CODE_BY_SERVICE_CODE: Record<ServiceErrorCode, TRPCError["code"]> = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL: "INTERNAL_SERVER_ERROR",
};

/**
 * Translate anything a resolver can throw into a `TRPCError`.
 *
 * Services signal failure with `ServiceError` carrying an explicit code, so
 * this is a mechanical lookup — no more guessing an HTTP status by matching
 * substrings of the message. Errors that are already `TRPCError`s (or Zod
 * validation errors) pass through unchanged.
 */
export function toTRPCError(error: unknown, fallbackMessage = "Unexpected error"): TRPCError {
  if (error instanceof TRPCError) return error;

  if (error instanceof ZodError) {
    return new TRPCError({ code: "BAD_REQUEST", message: "Invalid input", cause: error });
  }

  if (isServiceError(error)) {
    return new TRPCError({
      code: TRPC_CODE_BY_SERVICE_CODE[error.code],
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: fallbackMessage,
    cause: error,
  });
}

/**
 * Re-map a failed middleware result whose cause is a `ServiceError`.
 *
 * tRPC v11 converts errors thrown inside a resolver into
 * `TRPCError{INTERNAL_SERVER_ERROR}` (with the original error as `cause`) at
 * the resolver boundary — *before* an outer middleware's `try/catch` runs —
 * so a catch-based mapper never sees the `ServiceError` and every typed
 * service failure would surface as a 500. The middleware therefore inspects
 * the failed result instead and returns a TRPCError with the service's code.
 *
 * Returns `null` when nothing needs remapping (already-typed TRPCErrors,
 * genuine internal bugs, …).
 */
export function recodeServiceError(error: TRPCError): TRPCError | null {
  if (error.code !== "INTERNAL_SERVER_ERROR") return null;
  const cause = error.cause;
  if (!isServiceError(cause)) return null;
  return new TRPCError({
    code: TRPC_CODE_BY_SERVICE_CODE[cause.code],
    message: cause.message,
    cause,
  });
}
