import { z } from "zod";

/** Folder kinds. `system` folders are seeded per workspace. */
export const FOLDER_TYPES = ["system", "custom"] as const;
export type FolderType = (typeof FOLDER_TYPES)[number];

export const createFolderInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
  type: z.enum(FOLDER_TYPES).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  createdBy: z.string().min(1).optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;

/**
 * The folders every workspace is seeded with. Names are unique per user at the
 * root level (enforced by `folder_root_name_unique`), which is what makes
 * `createDefaults` safely re-runnable.
 */
export const DEFAULT_FOLDER_DEFINITIONS = [
  { name: "My Forms", icon: "folder" },
  { name: "Templates", icon: "layout-template" },
  { name: "Archive", icon: "archive" },
  { name: "Trash", icon: "trash" },
] as const;
