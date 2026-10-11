export { getSchemaFields, validateSubmission } from "@repo/shared";
export type { SubmissionValidationResult } from "@repo/shared";

import type { FormField, FormSchema } from "@repo/shared/form/form-types";
import { ServiceError } from "../errors";

/**
 * Thrown by the service when a submission fails schema validation.
 *
 * Extends `ServiceError` so the tRPC layer maps it to HTTP 400 automatically,
 * while the per-field messages stay available for the route to forward.
 */
export class SubmissionValidationError extends ServiceError {
  constructor(public errors: Record<string, string>) {
    super("BAD_REQUEST", "Submission failed validation", { reason: "submission_validation" });
    this.name = "SubmissionValidationError";
  }
}

/**
 * The form-level policies that can block a submission.
 *
 * These strings are a client contract: the renderers (active and copy-era)
 * match on them exactly to pick the right toast / duplicate-countdown UI, so
 * they must not be reworded without updating the web components.
 */
export type SubmissionPolicy =
  | "Password required"
  | "Bot detected"
  | "Duplicate submission detected"
  | "Rate limit exceeded"
  | "Response limit reached"
  | "Content validation failed";

export interface SubmissionPolicyMeta {
  /** Seconds until the respondent may try again (time-window policies). */
  timeRemaining?: number;
  /** Attempts left when the policy is attempt-based. */
  attemptsRemaining?: number;
}

/**
 * Thrown when a form-level policy (bot trap, duplicate prevention, response
 * limit, rate limit, profanity filter) blocks a submission — as opposed to
 * field validation failures, which carry per-field messages.
 *
 * The tRPC error formatter surfaces `policy`/`timeRemaining`/`attemptsRemaining`
 * as top-level fields on the HTTP error body so the copy-era client branches
 * (`result.error === "Duplicate submission detected"`, …) work unchanged.
 */
export class SubmissionPolicyError extends ServiceError {
  readonly policy: SubmissionPolicy;
  readonly timeRemaining: number | undefined;
  readonly attemptsRemaining: number | undefined;

  constructor(policy: SubmissionPolicy, message: string, meta: SubmissionPolicyMeta = {}) {
    super("BAD_REQUEST", message, { reason: "submission_policy" });
    this.name = "SubmissionPolicyError";
    this.policy = policy;
    this.timeRemaining = meta.timeRemaining;
    this.attemptsRemaining = meta.attemptsRemaining;
  }
}

export type { FormField, FormSchema };
