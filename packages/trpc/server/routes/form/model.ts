import { z } from "zod";
import { formSchema } from "@repo/shared";

export const formOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  folderId: z.string().nullable(),
  createdBy: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  currentVersionId: z.string().nullable(),
  publishedVersionId: z.string().nullable(),
  revision: z.number().int(),
  isPublished: z.boolean(),
  publishedAt: z.date().nullable(),
  apiEnabled: z.boolean(),
  apiKeyHash: z.string().nullable(),
  themeId: z.string().uuid().nullable(),
  themeUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(["draft", "published"]),
});

export const formVersionOutputSchema = z.object({
  id: z.string(),
  formId: z.string(),
  version: z.number().int(),
  schemaHash: z.string(),
  schema: formSchema,
  source: z.enum(["manual", "ai", "import", "restore", "draft"]),
  prompt: z.string().nullable(),
  changeSummary: z.string().nullable(),
  restoredFromVersionId: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.date(),
});

export const formDetailOutputSchema = formOutputSchema.extend({
  schema: formSchema.nullable(),
  version: formVersionOutputSchema.nullable(),
});

export const createFormInputSchema = z.object({
  title: z.string().min(1).max(255),
  publicTitle: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  folderId: z.string().uuid().nullable().optional(),
  schema: formSchema.optional(),
  themeId: z.string().uuid().nullable().optional(),
  themeUrl: z.string().url().nullable().optional(),
});

export const updateFormInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
  themeId: z.string().uuid().nullable().optional(),
  themeUrl: z.string().url().nullable().optional(),
});

export const formIdInputSchema = z.object({
  id: z.string(),
});

export const getFormBySlugInputSchema = z.object({
  slug: z.string().min(1),
});

export const listFormsInputSchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
  search: z.string().max(200).optional(),
  publishedOnly: z.boolean().optional(),
});

export const saveVersionInputSchema = z.object({
  id: z.string(),
  schema: formSchema,
  source: z.enum(["manual", "ai", "import", "restore"]).default("manual"),
  prompt: z.string().max(5000).optional(),
  changeSummary: z.string().max(2000).optional(),
});

export const saveDraftInputSchema = z.object({
  id: z.string(),
  schema: formSchema,
});

export const restoreVersionInputSchema = z.object({
  id: z.string(),
  versionId: z.string(),
  changeSummary: z.string().max(2000).optional(),
});
