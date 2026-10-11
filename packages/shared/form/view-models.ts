import { createDefaultFormSchema } from "./form-defaults";
import type { FormField, FormSchema } from "./form-types";

/**
 * Builder convenience view: a section/step with its fields resolved from the
 * flat v2 `fields` array (via `groups`). Stored form definitions are v2
 * (`fields` + `groups`) — this type is UI-only, never persisted.
 */
export interface FormBlock {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  settings?: {
    showStepNumber?: boolean;
    stepNumberStyle?: "number" | "roman" | "letters";
    layout?: "single" | "two-column" | "three-column";
    spacing?: "compact" | "normal" | "relaxed";
    backgroundColor?: string;
    borderColor?: string;
  };
}

/** Empty schema used as a fallback when a form has no saved schema yet. */
export const EMPTY_SCHEMA: FormSchema = createDefaultFormSchema({ title: "" });

/**
 * Submission shape used by the analytics UI.
 * Mapped from `form_response` rows returned by the response router.
 */
export interface FormSubmissionView {
  id: string;
  form_id: string;
  user_id?: string | null;
  status: "draft" | "submitted" | "partial" | "abandoned" | "spam" | "deleted";
  submission_data: Record<string, any>;
  submitted_at: string;
  started_at: string;
  last_activity_at: string;
  time_spent_seconds: number | null;
  last_field_id: string | null;
  last_step_reached: number;
  completed_fields: number;
  total_fields: number;
  completion_percentage: number;
  ip_address?: string | null;
  country?: string | null;
  city?: string | null;
  referrer?: string | null;
  created_at: string;
}

/** Form shape consumed by analytics + public pages. */
export interface FormView {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slug: string;
  schema: FormSchema;
  is_published: boolean;
  is_api_enabled: boolean;
  api_key?: string | null;
  created_at: string;
  updated_at: string;
}

const toDateString = (value: unknown, fallback: string) =>
  value ? new Date(value as string).toISOString() : fallback;

/** Maps a server form_response row to the analytics FormSubmissionView shape. */
export const toSubmissionView = (row: Record<string, any>): FormSubmissionView => {
  const updated = new Date(row.updatedAt ?? row.created_at).toISOString();
  return {
    id: row.id,
    form_id: row.formId ?? row.form_id,
    user_id: row.userId ?? row.user_id,
    status: row.status,
    submission_data: row.data ?? row.submission_data ?? {},
    submitted_at: toDateString(row.submittedAt ?? row.submitted_at, updated),
    started_at: toDateString(row.startedAt ?? row.started_at, updated),
    last_activity_at: toDateString(row.lastActivityAt ?? row.last_activity_at, updated),
    time_spent_seconds: row.timeSpentSeconds ?? row.time_spent_seconds ?? null,
    last_field_id: row.lastFieldId ?? row.last_field_id ?? null,
    last_step_reached: row.lastStepReached ?? row.last_step_reached ?? 0,
    completed_fields: row.completedFields ?? row.completed_fields ?? 0,
    total_fields: row.totalFields ?? row.total_fields ?? 0,
    completion_percentage: row.completionPercentage ?? row.completion_percentage ?? 0,
    ip_address: row.ipHash ?? row.ip_address ?? null,
    country: row.country ?? null,
    city: row.city ?? null,
    referrer: row.referrer ?? null,
    created_at: toDateString(row.createdAt ?? row.created_at, updated),
  };
};

/** Maps a server form detail (FormDetailDTO) to the analytics Form shape. */
export const toFormView = (dto: Record<string, any>): FormView => ({
  id: dto.id,
  user_id: dto.createdBy ?? dto.created_by,
  title: dto.title,
  description: dto.description ?? null,
  slug: dto.slug,
  schema: dto.schema ?? EMPTY_SCHEMA,
  is_published: dto.isPublished ?? dto.is_published ?? false,
  is_api_enabled: dto.apiEnabled ?? dto.api_enabled ?? false,
  api_key: null,
  created_at: toDateString(dto.createdAt ?? dto.created_at, new Date().toISOString()),
  updated_at: toDateString(dto.updatedAt ?? dto.updated_at, new Date().toISOString()),
});
