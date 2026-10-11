import type { FormSchema } from "@repo/shared/form/form-types";

export function getFormTitle(schema: FormSchema | null | undefined): string {
  if (!schema) {
    return "Untitled Form";
  }

  if (schema.settings?.meta?.title) {
    return schema.settings.meta.title;
  }
  return schema.title || "Untitled Form";
}

export function getPublicFormTitle(schema: FormSchema | null | undefined): string {
  return getFormTitle(schema);
}

export function getInternalFormTitle(schema: FormSchema | null | undefined): string {
  return getFormTitle(schema);
}
