import db, { and, asc, eq, inArray, isNull, sql } from "@repo/database";
import { folder as folderTable, form as formTable } from "@repo/database/schema";
import { slugify } from "@repo/shared/slug";
import { badRequestError, notFoundError, withUniqueConstraint } from "../errors";
import {
  buildFolderTree,
  collectDescendantIds,
  nextPosition,
  wouldCreateCycle,
  type FolderNodeBase,
  type FolderTreeNode,
} from "./helpers";
import { DEFAULT_FOLDER_DEFINITIONS, type CreateFolderInput } from "./model";

type FolderRow = typeof folderTable.$inferSelect;

/** A folder row plus the derived data the workspace UI renders. */
export interface FolderDTO extends FolderRow {
  formCount: number;
}

export type FolderTreeNodeDTO =
  FolderTreeNode<FolderDTO>; /** Ordering columns for every sibling list. */
const SIBLING_ORDER = [asc(folderTable.position), asc(folderTable.name)] as const;

/** Shared CONFLICT raised when a write hits one of the folder-name indexes. */
const FOLDER_NAME_CONFLICT = {
  message: "A folder with this name already exists in this location",
  reason: "folder_name_taken",
} as const;

export class FolderService {
  /* ---------------------------------------------------------------------- */
  /* Reads                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * The full folder tree for a workspace.
   *
   * Archived folders are deliberately included: the sidebar renders
   * `archivedAt` to strike them through and offer a Restore action, so hiding
   * them here would make archiving indistinguishable from deleting.
   */
  async getTree(userId: string): Promise<FolderTreeNodeDTO[]> {
    const rows = await db.query.folder.findMany({
      where: and(eq(folderTable.userId, userId), isNull(folderTable.deletedAt)),
      orderBy: [...SIBLING_ORDER],
    });

    const formCounts = await this.getFormCountsByFolderId(userId);

    return buildFolderTree(rows.map((row) => ({ ...row, formCount: formCounts.get(row.id) ?? 0 })));
  }

  async getChildren(userId: string, parentId: string | null) {
    return db.query.folder.findMany({
      where: and(
        eq(folderTable.userId, userId),
        this.parentCondition(parentId),
        isNull(folderTable.deletedAt),
      ),
      orderBy: [...SIBLING_ORDER],
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Writes                                                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * Seeds the four system folders into a brand-new workspace.
   *
   * Idempotent by design: it is called from a post-signup hook that may run
   * more than once for the same user, so it only inserts what is missing and
   * lets `folder_root_name_unique` absorb any concurrent duplicate.
   */
  async createDefaults(userId: string): Promise<FolderRow[]> {
    const existing = await db
      .select({ name: folderTable.name, position: folderTable.position })
      .from(folderTable)
      .where(
        and(
          eq(folderTable.userId, userId),
          isNull(folderTable.parentId),
          isNull(folderTable.deletedAt),
        ),
      );

    const existingNames = new Set(existing.map((row) => row.name));
    const missing = DEFAULT_FOLDER_DEFINITIONS.filter(
      (definition) => !existingNames.has(definition.name),
    );

    if (missing.length === 0) return [];

    const startPosition = nextPosition(existing.map((row) => row.position));

    return db
      .insert(folderTable)
      .values(
        missing.map((definition, index) => ({
          userId,
          parentId: null,
          name: definition.name,
          slug: slugify(definition.name),
          icon: definition.icon,
          type: "system",
          position: startPosition + index,
          createdBy: userId,
        })),
      )
      .onConflictDoNothing()
      .returning();
  }

  async create(userId: string, data: CreateFolderInput) {
    const parentId = data.parentId ?? null;

    if (parentId !== null) {
      await this.assertUsableParent(userId, parentId);
    }

    const position = await this.nextSiblingPosition(userId, parentId);

    return withUniqueConstraint(async () => {
      const [folder] = await db
        .insert(folderTable)
        .values({
          userId,
          parentId,
          name: data.name,
          slug: slugify(data.name),
          type: data.type ?? "custom",
          icon: data.icon ?? null,
          color: data.color ?? null,
          position,
          createdBy: data.createdBy ?? userId,
        })
        .returning();

      if (!folder) throw notFoundError("Folder could not be created", "folder_create_failed");
      return folder;
    }, FOLDER_NAME_CONFLICT);
  }

  async rename(userId: string, folderId: string, name: string) {
    const trimmed = name.trim();
    if (trimmed === "") {
      throw badRequestError("Folder name cannot be empty", "empty_folder_name");
    }

    return withUniqueConstraint(async () => {
      const [folder] = await db
        .update(folderTable)
        .set({ name: trimmed, slug: slugify(trimmed) })
        .where(
          and(
            eq(folderTable.id, folderId),
            eq(folderTable.userId, userId),
            isNull(folderTable.deletedAt),
          ),
        )
        .returning();

      if (!folder) throw notFoundError("Folder not found", "folder_not_found");
      return folder;
    }, FOLDER_NAME_CONFLICT);
  }

  /**
   * Reparent a folder. Appends it to the end of its new sibling list and
   * refuses any move that would put a folder inside its own subtree.
   */
  async move(userId: string, folderId: string, newParentId: string | null) {
    const folder = await this.getOwnedFolder(userId, folderId);
    if (!folder) throw notFoundError("Folder not found", "folder_not_found");
    if (folder.id === newParentId) {
      throw badRequestError("A folder cannot be its own parent", "folder_self_parent");
    }

    if (newParentId !== null) {
      await this.assertUsableParent(userId, newParentId);

      // Includes soft-deleted rows: a deleted ancestor restored later would
      // otherwise resurrect a cycle that this check had waved through.
      const allFolders = await this.getFolderIdentityRows(userId);
      if (wouldCreateCycle(allFolders, folderId, newParentId)) {
        throw badRequestError(
          "Cannot move a folder into itself or one of its own descendants",
          "folder_cycle",
        );
      }
    }

    const position = await this.nextSiblingPosition(userId, newParentId);

    return withUniqueConstraint(async () => {
      const [moved] = await db
        .update(folderTable)
        .set({ parentId: newParentId, position })
        .where(
          and(
            eq(folderTable.id, folderId),
            eq(folderTable.userId, userId),
            isNull(folderTable.deletedAt),
          ),
        )
        .returning();

      if (!moved) throw notFoundError("Folder not found", "folder_not_found");
      return moved;
    }, FOLDER_NAME_CONFLICT);
  }

  /**
   * Archive a folder and everything beneath it.
   *
   * Cascading matters: the sidebar treats an archived folder as inactive, so
   * leaving live children under it would strand them behind a struck-through
   * parent that no longer offers normal actions.
   */
  async archive(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    if (!folder) throw notFoundError("Folder not found", "folder_not_found");

    const ids = await this.getSubtreeIds(userId, folderId);
    const now = new Date();

    const rows = await db
      .update(folderTable)
      .set({ archived: true, archivedAt: now })
      .where(
        and(
          eq(folderTable.userId, userId),
          inArray(folderTable.id, ids),
          isNull(folderTable.deletedAt),
        ),
      )
      .returning();

    const archived = rows.find((row) => row.id === folderId);
    if (!archived) throw notFoundError("Folder not found", "folder_not_found");
    return archived;
  }

  /**
   * Un-archive a folder and its subtree. Also clears the soft-delete flag so
   * the same action restores a folder that was previously trashed.
   */
  async restore(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId, { includeDeleted: true });
    if (!folder) throw notFoundError("Folder not found", "folder_not_found");

    const ids = await this.getSubtreeIds(userId, folderId, { includeDeleted: true });

    const rows = await db
      .update(folderTable)
      .set({ archived: false, archivedAt: null, deletedAt: null })
      .where(and(eq(folderTable.userId, userId), inArray(folderTable.id, ids)))
      .returning();

    const restored = rows.find((row) => row.id === folderId);
    if (!restored) throw notFoundError("Folder not found", "folder_not_found");
    return restored;
  }

  /**
   * Soft-delete a folder and all of its descendants, otherwise the children
   * end up orphaned under a trashed parent. Returns the rows that were
   * trashed — an empty array means the folder was not found.
   */
  async delete(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    if (!folder) return [];

    const ids = await this.getSubtreeIds(userId, folderId);

    return db
      .update(folderTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(folderTable.userId, userId),
          inArray(folderTable.id, ids),
          isNull(folderTable.deletedAt),
        ),
      )
      .returning();
  }

  /**
   * Persist a new ordering for one sibling list.
   *
   * The caller only ever sends folders that share a parent (the sidebar
   * reorders within a drop target), so a mixed list is a client bug — writing
   * interleaved positions across two parents would silently scramble both.
   */
  async reorder(userId: string, orderedFolderIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(orderedFolderIds)];
    if (uniqueIds.length !== orderedFolderIds.length) {
      throw badRequestError(
        "The same folder was listed more than once",
        "duplicate_folder_in_order",
      );
    }

    const rows = await db
      .select({ id: folderTable.id, parentId: folderTable.parentId })
      .from(folderTable)
      .where(
        and(
          eq(folderTable.userId, userId),
          inArray(folderTable.id, uniqueIds),
          isNull(folderTable.deletedAt),
        ),
      );

    if (rows.length !== uniqueIds.length) {
      throw notFoundError("One or more folders could not be found", "folder_not_found");
    }

    const parentIds = new Set(rows.map((row) => row.parentId));
    if (parentIds.size > 1) {
      throw badRequestError(
        "Folders can only be reordered within the same parent",
        "reorder_crosses_parents",
      );
    }

    await db.transaction(async (tx) => {
      for (const [index, folderId] of uniqueIds.entries()) {
        await tx
          .update(folderTable)
          .set({ position: index })
          .where(and(eq(folderTable.id, folderId), eq(folderTable.userId, userId)));
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Internals                                                              */
  /* ---------------------------------------------------------------------- */

  private parentCondition(parentId: string | null) {
    return parentId === null ? isNull(folderTable.parentId) : eq(folderTable.parentId, parentId);
  }

  private async getOwnedFolder(
    userId: string,
    folderId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<FolderRow | null> {
    const [row] = await db
      .select()
      .from(folderTable)
      .where(
        and(
          eq(folderTable.id, folderId),
          eq(folderTable.userId, userId),
          options.includeDeleted ? undefined : isNull(folderTable.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  private async assertUsableParent(userId: string, parentId: string): Promise<FolderRow> {
    const parent = await this.getOwnedFolder(userId, parentId);

    if (!parent) throw notFoundError("Parent folder not found", "parent_folder_not_found");
    if (parent.archivedAt !== null) {
      throw badRequestError(
        "Cannot place a folder inside an archived folder",
        "parent_folder_archived",
      );
    }

    return parent;
  }

  /**
   * Direct form counts, keyed by folder id.
   *
   * The previous implementation ran raw SQL against a table named `forms` and
   * wrapped it in a `catch` that returned an empty map — but the table is
   * `form`, so it *always* failed and every folder badge rendered 0. Using the
   * query builder removes both the typo and the error-swallowing catch.
   */
  private async getFormCountsByFolderId(userId: string): Promise<Map<string, number>> {
    const rows = await db
      .select({ folderId: formTable.folderId, count: sql<number>`count(*)::int` })
      .from(formTable)
      .where(eq(formTable.userId, userId))
      .groupBy(formTable.folderId);

    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.folderId !== null) counts.set(row.folderId, row.count);
    }
    return counts;
  }

  /** Highest position in a sibling list, plus one. */
  private async nextSiblingPosition(userId: string, parentId: string | null): Promise<number> {
    const rows = await db
      .select({ position: folderTable.position })
      .from(folderTable)
      .where(
        and(
          eq(folderTable.userId, userId),
          this.parentCondition(parentId),
          isNull(folderTable.deletedAt),
        ),
      );

    return nextPosition(rows.map((row) => row.position));
  }

  private async getFolderIdentityRows(userId: string): Promise<FolderNodeBase[]> {
    return db
      .select({ id: folderTable.id, parentId: folderTable.parentId })
      .from(folderTable)
      .where(eq(folderTable.userId, userId));
  }

  private async getSubtreeIds(
    userId: string,
    folderId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<string[]> {
    const rows = options.includeDeleted
      ? await this.getFolderIdentityRows(userId)
      : await db
          .select({ id: folderTable.id, parentId: folderTable.parentId })
          .from(folderTable)
          .where(and(eq(folderTable.userId, userId), isNull(folderTable.deletedAt)));

    return [folderId, ...collectDescendantIds(rows, folderId)];
  }
}
