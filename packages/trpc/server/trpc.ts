import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";
import { ZodError } from "zod";

import type { Context } from "./context";
import { auth } from "@repo/auth";
import { SubmissionPolicyError } from "@repo/services/response";
import { recodeServiceError } from "./utils/errors";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    errorFormatter({ shape, error }) {
      const policy = error.cause instanceof SubmissionPolicyError ? error.cause : undefined;
      return {
        ...shape,
        // Policy blocks (bot / duplicate / rate limit / response limit /
        // profanity) surface as top-level fields on the OpenAPI error body so
        // the copy-era client branches (`result.error === "Duplicate
        // submission detected"`, countdown UI) keep working.
        ...(policy
          ? {
              error: policy.policy,
              timeRemaining: policy.timeRemaining,
              attemptsRemaining: policy.attemptsRemaining,
            }
          : {}),
        data: {
          ...shape.data,
          zodError:
            error.code === "BAD_REQUEST" && error.cause instanceof ZodError
              ? error.cause.flatten()
              : null,
          code: error.code,
        },
      };
    },
  });

export const router = tRPCContext.router;

/**
 * Maps service-layer failures (typed `ServiceError`s, including submission
 * policies) to their tRPC error codes in one place.
 *
 * NOTE: tRPC v11 converts resolver-thrown errors to an
 * `INTERNAL_SERVER_ERROR` TRPCError (cause preserved) at the resolver
 * boundary, so `next()` resolves with a failed result instead of rejecting —
 * a try/catch here never sees the original error. We inspect the failed
 * result and re-throw the remapped error instead.
 */
const mapServiceErrors = tRPCContext.middleware(async ({ next }) => {
  const result = await next();
  if (result.ok) return result;

  const remapped = recodeServiceError(result.error);
  if (remapped) {
    throw remapped;
  }
  return result;
});

/** Open to everyone — no authentication required. */
export const publicProcedure = tRPCContext.procedure.use(mapServiceErrors);

/**
 * Requires a valid Better Auth session.
 * Adds `ctx.user.id`, `ctx.user.role`, `ctx.user.email`, and `ctx.user.name` to the context.
 */
export const protectedProcedure: typeof tRPCContext.procedure = publicProcedure.use(
  async (options) => {
    const { ctx } = options;
    const headers = new Headers();
    for (const [key, value] of Object.entries(ctx.req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }
    return options.next({
      ctx: {
        ...ctx,
        user: {
          id: session.user.id,
          role: (session.user as any).role ?? "user",
          email: session.user.email,
          name: session.user.name,
          impersonatedBy: session.session.impersonatedBy,
        },
      },
    });
  },
);

export const adminProcedure: typeof tRPCContext.procedure = protectedProcedure.use(
  async (options) => {
    const { ctx } = options;
    const role = ctx.user?.role;
    if (role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return options.next();
  },
);
