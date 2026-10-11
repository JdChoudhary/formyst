import { createFieldId, createId, createRef } from "@repo/shared";
import type { FormSchema } from "@repo/shared";
import type { FormBlock, FormField } from "@repo/shared";

import { FORM_BUILDER_CONSTANTS } from "../constants";

/**
 * UI-only legacy groups shape. The v2 schema has no `groups` — the builder
 * keeps a block view purely as an editing convenience and flattens it back to
 * `fields` when saving. Unknown keys like this are stripped by zod parsing on
 * save, so nothing extra is persisted.
 */
export interface BuilderGroup {
  id: string;
  ref?: string;
  title: string;
  description?: string;
  fieldIds: string[];
  layout?: "single" | "two-column" | "three-column";
  logic?: unknown[];
}

export type BuilderSchema = FormSchema & { groups?: BuilderGroup[] };

export const asBuilderSchema = (schema: FormSchema): BuilderSchema => schema as BuilderSchema;

export const generateFieldId = (): string =>
  `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const generateBlockId = (): string => `step-${Date.now()}`;

export const hasFormChanges = (
  formSchema: FormSchema,
  lastSavedSchema: FormSchema | null,
): boolean => {
  if (!lastSavedSchema) {
    const builderSchema = asBuilderSchema(formSchema);
    return (
      (formSchema.fields?.length ?? 0) > 0 ||
      (builderSchema.groups?.length ?? 0) > 0 ||
      formSchema.title !== FORM_BUILDER_CONSTANTS.DEFAULT_FORM_TITLE
    );
  }

  return JSON.stringify(formSchema) !== JSON.stringify(lastSavedSchema);
};

let saveTimeoutId: NodeJS.Timeout | null = null;

export const saveDraftToStorage = (draftKey: string, formSchema: FormSchema): void => {
  if (typeof window !== "undefined") {
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    saveTimeoutId = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(formSchema));
      } catch (error) {
        console.warn("Failed to save draft to localStorage:", error);
      }
      saveTimeoutId = null;
    }, 100);
  }
};

export const loadDraftFromStorage = (draftKey: string): FormSchema | null => {
  if (typeof window === "undefined") return null;

  const draft = localStorage.getItem(draftKey);
  if (!draft) return null;

  try {
    const parsed = JSON.parse(draft);
    if (parsed && typeof parsed === "object" && parsed.settings) {
      return parsed;
    }
  } catch {}

  return null;
};

export const removeDraftFromStorage = (draftKey: string): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(draftKey);
  }
};

export const findSelectedField = (
  formSchema: FormSchema,
  selectedFieldId: string | null,
): FormField | null => {
  if (!selectedFieldId) return null;
  return formSchema.fields?.find((field) => field.ref === selectedFieldId) || null;
};

/**
 * Guarantee every field has a unique `ref`.
 *
 * The v2 schema keys fields by `ref`, but forms created before the ref
 * migration (or imported ones) may carry legacy `id`s or no ref at all —
 * which makes every field collapse to the same key in the builder's list
 * (breaking selection/deletion and triggering React key warnings). Runs on
 * every schema that enters the builder, preserving existing refs.
 */
export const ensureFieldRefs = (formSchema: FormSchema): FormSchema => {
  const fields = formSchema.fields ?? [];
  const usedRefs = new Set<string>();

  const nextFields = fields.map((field) => {
    // Prefer a legacy `id` when present, else mint a fresh unique ref.
    const legacyId =
      typeof (field as FormField & { id?: unknown }).id === "string"
        ? (field as FormField & { id: string }).id
        : "";
    let ref = field.ref || legacyId;
    if (!ref || usedRefs.has(ref)) {
      ref = createFieldId("field");
    }
    while (usedRefs.has(ref)) {
      ref = createFieldId("field");
    }
    usedRefs.add(ref);
    return ref === field.ref ? field : { ...field, ref };
  });

  return { ...formSchema, fields: nextFields };
};

export const getAllFields = (formSchema: FormSchema): FormField[] => formSchema.fields ?? [];

/**
 * Derive the block view used by the builder UI from the v2 schema.
 * Blocks come from `groups` (sections/steps); a single default block is
 * synthesized when the form has no groups yet.
 */ export const getBlocksFromSchema = (formSchema: FormSchema): FormBlock[] => {
  const fields = formSchema.fields ?? [];
  const groups = asBuilderSchema(formSchema).groups;
  if (groups?.length) {
    return groups.map((group) => ({
      id: group.id,
      title: group.title,
      description: group.description,
      fields: group.fieldIds
        .map((id) => fields.find((field) => field.ref === id))
        .filter((field): field is FormField => !!field),
      settings: { layout: group.layout ?? "single" },
    }));
  }
  return fields.length
    ? [{ id: "default", title: "Form Fields", description: "", fields }]
    : [{ id: "default", title: "Form Fields", description: "", fields: [] }];
};

/** Write the block view back into the canonical v2 shape (fields + groups). */
export const syncSchemaFromBlocks = (formSchema: FormSchema, blocks: FormBlock[]): FormSchema => {
  const fields = blocks.flatMap((block) => block.fields ?? []);
  const groups: BuilderGroup[] = blocks.map((block) => ({
    id: block.id,
    ref: createRef(block.title || block.id),
    title: block.title || "Untitled section",
    description: block.description,
    fieldIds: (block.fields ?? []).map((field) => field.ref ?? ""),
    layout: (block.settings?.layout as "single" | "two-column" | "three-column") ?? "single",
    logic: [],
  }));
  return { ...formSchema, fields, groups } as BuilderSchema;
};

export const updateFieldInSchema = (
  formSchema: FormSchema,
  updatedField: FormField,
): FormSchema => ({
  ...formSchema,
  fields: (formSchema.fields ?? []).map((field) =>
    field.ref === updatedField.ref ? updatedField : field,
  ),
});

export const removeFieldFromSchema = (formSchema: FormSchema, fieldId: string): FormSchema => {
  const builderSchema = asBuilderSchema(formSchema);
  return {
    ...formSchema,
    fields: (formSchema.fields ?? []).filter((field) => field.ref !== fieldId),
    groups: (builderSchema.groups ?? []).map((group) => ({
      ...group,
      fieldIds: group.fieldIds.filter((id) => id !== fieldId),
    })),
  } as BuilderSchema;
};

export const addFieldToSchema = (
  formSchema: FormSchema,
  newField: FormField,
  selectedBlockId: string | null,
  index?: number,
): FormSchema => {
  const fields = [...(formSchema.fields ?? [])];
  const insertAt =
    typeof index === "number" && index >= 0 && index <= fields.length ? index : fields.length;
  fields.splice(insertAt, 0, newField);

  let groups: BuilderGroup[] = asBuilderSchema(formSchema).groups?.length
    ? [...asBuilderSchema(formSchema).groups!]
    : [
        {
          id: "default",
          ref: "section_1",
          title: "Form Fields",
          description: "",
          fieldIds: [] as string[],
          layout: "single" as const,
          logic: [],
        },
      ];

  const targetGroupId = selectedBlockId || groups[0].id;
  const groupIndex = groups.findIndex((group) => group.id === targetGroupId);
  if (groupIndex >= 0 && newField.ref) {
    groups[groupIndex] = {
      ...groups[groupIndex],
      fieldIds: [...groups[groupIndex].fieldIds, newField.ref],
    };
  }

  return { ...formSchema, fields, groups } as BuilderSchema;
};

export { createId, createRef };
