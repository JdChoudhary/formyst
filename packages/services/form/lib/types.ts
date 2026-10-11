/**
 * The form schema types live in @repo/shared (single source of truth).
 * This module exists only to preserve internal import paths.
 */
export type { FormSchema, FormField } from "@repo/shared";
export { normalizeFormSchema, ensureSchemaDefaults } from "@repo/shared";
