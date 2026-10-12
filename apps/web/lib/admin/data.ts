import { redirect } from "next/navigation";

import { api } from "~/trpc/server";

/**
 * Admin dashboard data access.
 *
 * The admin UI used to fetch straight from the database; that now happens on
 * the backend (`packages/services/admin` behind the `admin` tRPC router), so
 * this module is a thin client wrapper. The web app therefore no longer
 * imports `@repo/database` or `@repo/auth`.
 *
 * Because the tRPC transport has no superjson transformer, `Date` values
 * arrive serialized as ISO strings and are converted back before returning.
 */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  formCount: number;
}

export interface AdminStats {
  users: number;
  forms: number;
  responses: number;
}

/** One day in the dashboard activity series (`date` is `YYYY-MM-DD`). */
export interface AdminActivityPoint {
  date: string;
  users: number;
  forms: number;
  responses: number;
}

/** A form ranked by responses. */
export interface AdminTopForm {
  id: string;
  title: string;
  responses: number;
}

/** A headline number with its rolling week-over-week change. */
export interface AdminMetric {
  total: number;
  last7: number;
  change: number;
}

/** Everything the admin dashboard renders. */
export interface AdminDashboard {
  metrics: {
    users: AdminMetric;
    forms: AdminMetric;
    responses: AdminMetric;
  };
  activity: AdminActivityPoint[];
  topForms: AdminTopForm[];
  windowDays: number;
}

export interface AdminFormSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  responseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminFormDetail extends AdminFormSummary {
  userId: string;
  apiEnabled: boolean;
  revision: number;
  owner: { id: string; name: string; email: string } | null;
}

export interface AdminResponse {
  id: string;
  status: string;
  data: Record<string, unknown>;
  submittedAt: Date | null;
  createdAt: Date;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  return value instanceof Date ? value : new Date(value);
}

/** True when a tRPC call was rejected because the session isn't an admin. */
function isAccessError(error: unknown): boolean {
  const candidate = error as {
    data?: { code?: string };
    shape?: { data?: { code?: string } };
  };
  const code = candidate?.data?.code ?? candidate?.shape?.data?.code;
  return code === "UNAUTHORIZED" || code === "FORBIDDEN";
}

/**
 * Verifies the current request's session belongs to an admin. The `admin`
 * tRPC router enforces the role/allow-list server-side; access violations
 * surface as UNAUTHORIZED/FORBIDDEN and are mapped to the dashboard redirect.
 */
export async function requireAdmin() {
  try {
    return await api.admin.requireAdmin.query();
  } catch (error) {
    if (isAccessError(error)) redirect("/dashboard");
    throw error;
  }
}

export async function getUser(id: string): Promise<AdminUser | null> {
  const row = await api.admin.getUser.query({ id });
  if (!row) return null;
  return {
    ...row,
    banExpires: toDate(row.banExpires),
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  };
}

export async function listFormsByUser(userId: string): Promise<AdminFormSummary[]> {
  const rows = await api.admin.listFormsByUser.query({ userId });
  return rows.map((row) => ({
    ...row,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  }));
}

export async function getFormDetail(formId: string): Promise<AdminFormDetail | null> {
  const row = await api.admin.getFormDetail.query({ formId });
  if (!row) return null;
  return {
    ...row,
    createdAt: toDate(row.createdAt)!,
    updatedAt: toDate(row.updatedAt)!,
  };
}

export async function listFormResponses(formId: string): Promise<AdminResponse[]> {
  const rows = await api.admin.listFormResponses.query({ formId });
  return rows.map((row) => ({
    ...row,
    submittedAt: toDate(row.submittedAt),
    createdAt: toDate(row.createdAt)!,
  }));
}

export async function getStats(): Promise<AdminStats> {
  return api.admin.getStats.query();
}

export async function getDashboard(): Promise<AdminDashboard> {
  return api.admin.getDashboard.query();
}

export async function listUserEmails(): Promise<string[]> {
  return api.admin.listUserEmails.query();
}

/** Number of responses across a user's forms — used for user detail stats. */
export async function countUserResponses(userId: string): Promise<number> {
  return api.admin.countUserResponses.query({ userId });
}