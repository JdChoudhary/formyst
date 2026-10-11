import db, { count, desc, eq, gte, sql } from "@repo/database";
import { form, formResponse, user } from "@repo/database";

import type {
  AdminActivityPoint,
  AdminDashboard,
  AdminFormDetail,
  AdminFormSummary,
  AdminMetric,
  AdminResponse,
  AdminStats,
  AdminUser,
} from "./model";

/**
 * Read-only queries behind the admin dashboard.
 *
 * These previously lived in `apps/web/lib/admin/data.ts`, which imported
 * `@repo/database` directly from the frontend. Keeping them here means only
 * the backend packages touch the database; the web app reaches them through
 * the `admin` tRPC router.
 */
export class AdminService {
  /** Counts across the whole platform. */
  public async getStats(): Promise<AdminStats> {
    const [[userRow], [formRow], [responseRow]] = await Promise.all([
      db.select({ value: count() }).from(user),
      db.select({ value: count() }).from(form),
      db.select({ value: count() }).from(formResponse),
    ]);
    return {
      users: Number(userRow?.value ?? 0),
      forms: Number(formRow?.value ?? 0),
      responses: Number(responseRow?.value ?? 0),
    };
  }

  /**
   * Analytics for the admin dashboard: headline metrics with week-over-week
   * change, a daily activity series, and the top forms by responses.
   *
   * Counts are grouped in Postgres by calendar day and merged into a dense
   * series here, so the chart always has one point per day (including zeros)
   * regardless of how sparse the data is.
   *
   * The window defaults to 90 days — the longest range the dashboard offers —
   * so the client can switch between 7/30/90-day views by slicing the series
   * locally instead of paying for another round-trip per range.
   */
  public async getDashboard(windowDays = 90): Promise<AdminDashboard> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (windowDays - 1));

    const userDay = sql<string>`to_char(${user.createdAt}, 'YYYY-MM-DD')`;
    const formDay = sql<string>`to_char(${form.createdAt}, 'YYYY-MM-DD')`;
    const responseDay = sql<string>`to_char(${formResponse.createdAt}, 'YYYY-MM-DD')`;

    const [userRows, formRows, responseRows, totals, topFormRows] = await Promise.all([
      db
        .select({ day: userDay, value: count() })
        .from(user)
        .where(gte(user.createdAt, start))
        .groupBy(userDay),
      db
        .select({ day: formDay, value: count() })
        .from(form)
        .where(gte(form.createdAt, start))
        .groupBy(formDay),
      db
        .select({ day: responseDay, value: count() })
        .from(formResponse)
        .where(gte(formResponse.createdAt, start))
        .groupBy(responseDay),
      this.getStats(),
      // Rank by the real response rows rather than `form.responseCount`, which
      // is a denormalized counter that can lag behind the response table.
      db
        .select({ id: form.id, title: form.title, responses: count(formResponse.id) })
        .from(form)
        .leftJoin(formResponse, eq(formResponse.formId, form.id))
        .groupBy(form.id, form.title)
        .having(sql`count(${formResponse.id}) > 0`)
        .orderBy(desc(count(formResponse.id)))
        .limit(6),
    ]);

    // Dense daily buckets, oldest first — a chart needs a point per day.
    const buckets = new Map<string, AdminActivityPoint>();
    for (let offset = 0; offset < windowDays; offset += 1) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + offset);
      const key = day.toISOString().slice(0, 10);
      buckets.set(key, { date: key, users: 0, forms: 0, responses: 0 });
    }
    for (const row of userRows) {
      const bucket = buckets.get(row.day);
      if (bucket) bucket.users = Number(row.value);
    }
    for (const row of formRows) {
      const bucket = buckets.get(row.day);
      if (bucket) bucket.forms = Number(row.value);
    }
    for (const row of responseRows) {
      const bucket = buckets.get(row.day);
      if (bucket) bucket.responses = Number(row.value);
    }

    const activity = [...buckets.values()];

    // Week-over-week change is always measured on the trailing 7 days,
    // independent of the selected chart range.
    const rollingWindow = (
      key: keyof Omit<AdminActivityPoint, "date">,
    ): Pick<AdminMetric, "last7" | "change"> => {
      const last7 = activity.slice(-7).reduce((sum, point) => sum + point[key], 0);
      const previous7 = activity.slice(-14, -7).reduce((sum, point) => sum + point[key], 0);
      const change =
        previous7 === 0 ? (last7 > 0 ? 100 : 0) : ((last7 - previous7) / previous7) * 100;
      return { last7, change };
    };

    return {
      metrics: {
        users: { total: totals.users, ...rollingWindow("users") },
        forms: { total: totals.forms, ...rollingWindow("forms") },
        responses: { total: totals.responses, ...rollingWindow("responses") },
      },
      activity,
      topForms: topFormRows.map((row) => ({ ...row, responses: Number(row.responses) })),
      windowDays,
    };
  }

  /** One user with the number of forms they own, or null when unknown. */
  public async getUser(id: string): Promise<AdminUser | null> {
    const [row] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        formCount: sql<number>`(select count(*) from ${form} where ${form.userId} = ${user.id})`,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return row ? { ...row, formCount: Number(row.formCount) } : null;
  }

  /** Every form owned by a user, newest first. */
  public async listFormsByUser(userId: string): Promise<AdminFormSummary[]> {
    return db
      .select({
        id: form.id,
        title: form.title,
        slug: form.slug,
        description: form.description,
        isPublished: form.isPublished,
        responseCount: form.responseCount,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      })
      .from(form)
      .where(eq(form.userId, userId))
      .orderBy(desc(form.createdAt));
  }

  /**
   * A form's metadata and its owner. The form schema is intentionally omitted —
   * the admin UI never returns the actual form content (privacy).
   */
  public async getFormDetail(formId: string): Promise<AdminFormDetail | null> {
    const [row] = await db
      .select({
        id: form.id,
        userId: form.userId,
        folderId: form.folderId,
        title: form.title,
        slug: form.slug,
        description: form.description,
        isPublished: form.isPublished,
        responseCount: form.responseCount,
        apiEnabled: form.apiEnabled,
        revision: form.revision,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      })
      .from(form)
      .where(eq(form.id, formId))
      .limit(1);
    if (!row) return null;

    const [owner] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, row.userId))
      .limit(1);

    return {
      id: row.id,
      userId: row.userId,
      folderId: row.folderId,
      title: row.title,
      slug: row.slug,
      description: row.description,
      isPublished: row.isPublished,
      responseCount: row.responseCount,
      apiEnabled: row.apiEnabled,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: owner ?? null,
    };
  }

  /** Responses for a form, newest first. */
  public async listFormResponses(formId: string): Promise<AdminResponse[]> {
    const rows = await db
      .select({
        id: formResponse.id,
        status: formResponse.status,
        data: formResponse.data,
        submittedAt: formResponse.submittedAt,
        createdAt: formResponse.createdAt,
      })
      .from(formResponse)
      .where(eq(formResponse.formId, formId))
      .orderBy(desc(formResponse.createdAt));

    return rows.map((row) => ({ ...row, data: (row.data ?? {}) as Record<string, unknown> }));
  }

  /** Every registered user's email, newest accounts first. */
  public async listUserEmails(): Promise<string[]> {
    const rows = await db
      .select({ email: user.email })
      .from(user)
      .orderBy(desc(user.createdAt));
    return rows.map((row) => row.email);
  }

  /** Number of responses across a user's forms — used for user detail stats. */
  public async countUserResponses(userId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(formResponse)
      .innerJoin(form, eq(form.id, formResponse.formId))
      .where(eq(form.userId, userId));

    return Number(row?.value ?? 0);
  }
}

export type {
  AdminActivityPoint,
  AdminDashboard,
  AdminFormDetail,
  AdminFormSummary,
  AdminMetric,
  AdminResponse,
  AdminStats,
  AdminTopForm,
  AdminUser,
} from "./model";
