/**
 * Pure helpers for the folder service.
 *
 * These carry no database dependency so they can be unit tested directly.
 */

/** Minimum shape required to place a row in the folder tree. */
export interface FolderNodeBase {
  id: string;
  parentId: string | null;
}

export type FolderTreeNode<T extends FolderNodeBase> = T & {
  children: FolderTreeNode<T>[];
};

/**
 * Assemble a flat list of folders into a nested tree.
 *
 * Rows whose parent is not in the list are treated as roots rather than being
 * dropped, so a folder is never invisible just because its parent was
 * filtered out (archived, paginated, ...).
 */
export function buildFolderTree<T extends FolderNodeBase>(
  rows: readonly T[],
): FolderTreeNode<T>[] {
  const nodesById = new Map<string, FolderTreeNode<T>>();

  for (const row of rows) {
    nodesById.set(row.id, { ...row, children: [] });
  }

  const roots: FolderTreeNode<T>[] = [];

  for (const node of nodesById.values()) {
    const parent = node.parentId === null ? undefined : nodesById.get(node.parentId);

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Every descendant of `rootId`, in no particular order.
 *
 * `visited` guards against a cycle: before the move-validation fix, a folder
 * could be reparented into its own subtree, and a naive walk would then loop
 * forever and hang the request.
 */
export function collectDescendantIds<T extends FolderNodeBase>(
  rows: readonly T[],
  rootId: string,
): string[] {
  const childIdsByParent = new Map<string, string[]>();

  for (const row of rows) {
    if (row.parentId === null) continue;
    const siblings = childIdsByParent.get(row.parentId);
    if (siblings) {
      siblings.push(row.id);
    } else {
      childIdsByParent.set(row.parentId, [row.id]);
    }
  }

  const descendants: string[] = [];
  const visited = new Set<string>([rootId]);
  const stack = [...(childIdsByParent.get(rootId) ?? [])];

  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (visited.has(id)) continue;

    visited.add(id);
    descendants.push(id);
    stack.push(...(childIdsByParent.get(id) ?? []));
  }

  return descendants;
}

/** True when moving `folderId` under `newParentId` would create a cycle. */
export function wouldCreateCycle<T extends FolderNodeBase>(
  rows: readonly T[],
  folderId: string,
  newParentId: string,
): boolean {
  if (folderId === newParentId) return true;
  return collectDescendantIds(rows, folderId).includes(newParentId);
}

/** Next free ordering position for a sibling list. */
export function nextPosition(positions: readonly number[]): number {
  if (positions.length === 0) return 0;
  return Math.max(...positions) + 1;
}
