/** Platform statistics shown on the admin dashboard. */
export interface AdminStats {
  users: number;
  forms: number;
  responses: number;
}

/** One day in the admin dashboard activity series. */
export interface AdminActivityPoint {
  /** Calendar day in `YYYY-MM-DD` (UTC). */
  date: string;
  users: number;
  forms: number;
  responses: number;
}

/** A form ranked by responses, for the dashboard leaderboard. */
export interface AdminTopForm {
  id: string;
  title: string;
  responses: number;
}

/** A headline number plus its rolling week-over-week change. */
export interface AdminMetric {
  /** All-time total. */
  total: number;
  /** Created in the last 7 days of the window. */
  last7: number;
  /** Percentage change vs the previous 7 days (0 when there is no baseline). */
  change: number;
}

/** Everything the admin dashboard renders: KPIs, activity series, leaderboard. */
export interface AdminDashboard {
  metrics: {
    users: AdminMetric;
    forms: AdminMetric;
    responses: AdminMetric;
  };
  /** Daily counts, oldest first, spanning `windowDays`. */
  activity: AdminActivityPoint[];
  /** Top forms by response count. */
  topForms: AdminTopForm[];
  windowDays: number;
}

/** A user row plus the number of forms they own. */
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

/** Row shape used for a user's forms in the admin UI. */
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

/**
 * Form detail shown in the admin form view.
 *
 * Deliberately metadata-only: the form schema (the actual questions/content)
 * is never returned to the admin, per the platform's privacy rules.
 */
export interface AdminFormDetail extends AdminFormSummary {
  userId: string;
  folderId: string | null;
  apiEnabled: boolean;
  revision: number;
  owner: { id: string; name: string; email: string } | null;
}

/** A response row shown in the admin form view. */
export interface AdminResponse {
  id: string;
  status: string;
  data: Record<string, unknown>;
  submittedAt: Date | null;
  createdAt: Date;
}
