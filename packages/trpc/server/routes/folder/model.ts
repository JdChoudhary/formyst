import { z } from "zod";

export const folderOutputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string().nullable(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  type: z.string(),
  position: z.number(),
  archived: z.boolean(),
  archivedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export type FolderNode = z.infer<typeof folderOutputSchema> & {
  formCount: number;
  children: FolderNode[];
};

/** Recursive tree shape returned by `getAll`, with per-folder form counts. */
export const folderNodeSchema: z.ZodType<FolderNode> = folderOutputSchema.extend({
  formCount: z.number(),
  children: z.lazy(() => z.array(folderNodeSchema)),
});

export const createFolderInputSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
});

export const renameFolderInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

export const moveFolderInputSchema = z.object({
  id: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
});

export const folderIdInputSchema = z.object({
  id: z.string().uuid(),
});

export const getChildrenInputSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
});

export const reorderFoldersInputSchema = z.object({
  orderedFolderIds: z.array(z.string().uuid()).min(1),
});
