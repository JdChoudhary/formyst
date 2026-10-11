import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../../trpc";
import { adminService } from "../../services";
import {
  adminFormIdInputSchema,
  adminTargetUserInputSchema,
  adminUserIdInputSchema,
} from "./model";

/**
 * Bootstrap allow-list: comma-separated emails that are treated as admins even
 * before any account carries the `admin` role. Moved here from
 * `apps/web/lib/admin/data.ts` so the rule is enforced server-side.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

/**
 * Asserts the context carries a session whose user may use admin endpoints —
 * either the `admin` role or the `ADMIN_EMAILS` bootstrap list. Throws the
 * tRPC auth errors the web client maps to a dashboard redirect.
 */
function requireAdminAccess(
  ctx: { user?: { id: string; role: string; email: string; name: string } },
): asserts ctx is { user: { id: string; role: string; email: string; name: string } } {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  const role = ctx.user.role;
  const email = (ctx.user.email ?? "").toLowerCase();
  if (role !== "admin" && !ADMIN_EMAILS.includes(email)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

/** Valid session + admin role/allow-list. */
const adminProcedure = protectedProcedure.use(async (options) => {
  requireAdminAccess(options.ctx);
  return options.next({ ctx: options.ctx });
});

export const adminRouter = router({
  /**
   * Gatekeeper for `requireAdmin()` in the web app: resolves the session from
   * forwarded cookies and confirms admin access, returning the summary the
   * admin pages render. Non-admins get UNAUTHORIZED/FORBIDDEN.
   */
  requireAdmin: adminProcedure.query(({ ctx }) => {
    requireAdminAccess(ctx);
    return {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
      },
    };
  }),

  getStats: adminProcedure.query(() => adminService.getStats()),

  /** KPI + activity series + top forms for the admin dashboard. */
  getDashboard: adminProcedure.query(() => adminService.getDashboard()),

  getUser: adminProcedure.input(adminUserIdInputSchema).query(({ input }) =>
    adminService.getUser(input.id),
  ),

  listFormsByUser: adminProcedure
    .input(adminTargetUserInputSchema)
    .query(({ input }) => adminService.listFormsByUser(input.userId)),

  getFormDetail: adminProcedure
    .input(adminFormIdInputSchema)
    .query(({ input }) => adminService.getFormDetail(input.formId)),

  listFormResponses: adminProcedure
    .input(adminFormIdInputSchema)
    .query(({ input }) => adminService.listFormResponses(input.formId)),

  listUserEmails: adminProcedure.query(() => adminService.listUserEmails()),

  countUserResponses: adminProcedure
    .input(adminTargetUserInputSchema)
    .query(({ input }) => adminService.countUserResponses(input.userId)),
});
