"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useGetForms } from "@/hooks/api/form";
import { useFolderMutations, useGetFolders } from "@/hooks/api/folder";
import { Button } from "@/components/ui/button";
import {
  FolderTree,
  InlineInput,
  type CreatingState,
  type DropTarget,
  type FolderNode,
  type SidebarForm,
} from "@/components/workspace/folder-tree";

export function FolderSidebar() {
  const { data: folders, isLoading, error } = useGetFolders();
  const { forms = [] } = useGetForms();

  const formsByFolder = useMemo(() => {
    const map = new Map<string | null, SidebarForm[]>();
    for (const form of forms) {
      const key = form.folderId ?? null;
      const arr = map.get(key) ?? [];
      arr.push({
        id: form.id,
        title: form.title,
        status: form.status,
        slug: form.slug,
        updatedAt: form.updatedAt,
      });
      map.set(key, arr);
    }
    // Sort each group by updatedAt descending
    for (const [key, arr] of map) {
      map.set(
        key,
        arr.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    }
    return map;
  }, [forms]);

  const {
    createFolder,
    renameFolder,
    moveFolder,
    reorderFolders,
    archiveFolder,
    restoreFolder,
    deleteFolder,
  } = useFolderMutations();

  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<CreatingState>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const flat = useMemo(() => {
    const list: Array<{ id: string; parentId: string | null }> = [];
    const walk = (nodes: FolderNode[], parentId: string | null) => {
      for (const node of nodes) {
        list.push({ id: node.id, parentId });
        walk(node.children, node.id);
      }
    };
    walk(folders ?? [], null);
    return list;
  }, [folders]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, string[]>();
    for (const f of flat) {
      const arr = map.get(f.parentId) ?? [];
      arr.push(f.id);
      map.set(f.parentId, arr);
    }
    return map;
  }, [flat]);

  const parentOf = useMemo(() => new Map(flat.map((f) => [f.id, f.parentId])), [flat]);
  const allIds = useMemo(() => flat.map((f) => f.id), [flat]);

  const getDescendants = useCallback(
    (id: string): Set<string> => {
      const out = new Set<string>();
      const stack = [...(childrenOf.get(id) ?? [])];
      while (stack.length) {
        const cur = stack.pop()!;
        out.add(cur);
        stack.push(...(childrenOf.get(cur) ?? []));
      }
      return out;
    },
    [childrenOf],
  );

  const canDropOn = useCallback(
    (fromId: string, targetId: string) => {
      if (fromId === targetId) return false;
      return !getDescendants(fromId).has(targetId);
    },
    [getDescendants],
  );

  const run = useCallback(
    async (id: string | null, fn: () => Promise<unknown>, successMsg?: string) => {
      if (id) setPendingId(id);
      try {
        await fn();
        if (successMsg) toast.success(successMsg);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [],
  );

  const handleDropOnFolder = useCallback(
    (fromId: string, targetId: string) => {
      const currentParent = parentOf.get(fromId) ?? null;
      void run(
        fromId,
        async () => {
          if (currentParent !== targetId) {
            await moveFolder({ id: fromId, newParentId: targetId });
          }
          const targetChildren = (childrenOf.get(targetId) ?? []).filter((id) => id !== fromId);
          await reorderFolders({ orderedFolderIds: [...targetChildren, fromId] });
        },
        "Folder moved",
      );
    },
    [run, moveFolder, reorderFolders, parentOf, childrenOf],
  );

  const handleDropInGap = useCallback(
    (fromId: string, parentId: string | null, index: number) => {
      const currentParent = parentOf.get(fromId) ?? null;
      const siblings = childrenOf.get(parentId) ?? [];
      let insertAt = index;
      if (currentParent === parentId) {
        const fromIdx = siblings.indexOf(fromId);
        if (fromIdx !== -1 && fromIdx < insertAt) insertAt -= 1;
      }
      const next = siblings.filter((id) => id !== fromId);
      next.splice(insertAt, 0, fromId);

      void run(
        fromId,
        async () => {
          if (currentParent !== parentId) {
            await moveFolder({ id: fromId, newParentId: parentId });
          }
          await reorderFolders({ orderedFolderIds: next });
        },
        "Folder reordered",
      );
    },
    [run, moveFolder, reorderFolders, parentOf, childrenOf],
  );

  const handleCreate = useCallback(
    async (parentId: string | null, name: string) => {
      if (!name.trim()) {
        setCreating(null);
        return;
      }
      const ok = await run(null, async () => {
        await createFolder({ name: name.trim(), parentId: parentId ?? undefined });
      }, "Folder created");
      if (ok) setCreating(null);
    },
    [run, createFolder],
  );

  const handleRename = useCallback(
    async (id: string, name: string) => {
      if (!name.trim()) {
        setRenamingId(null);
        return;
      }
      const ok = await run(id, async () => {
        await renameFolder({ id, name: name.trim() });
      }, "Folder renamed");
      if (ok) setRenamingId(null);
    },
    [run, renameFolder],
  );

  const handleArchive = useCallback(
    (id: string) => {
      void run(id, async () => {
        await archiveFolder({ id });
      }, "Folder archived");
    },
    [run, archiveFolder],
  );

  const handleRestore = useCallback(
    (id: string) => {
      void run(id, async () => {
        await restoreFolder({ id });
      }, "Folder restored");
    },
    [run, restoreFolder],
  );

  const handleDelete = useCallback(
    (id: string) => {
      toast("Delete this folder?", {
        description: "All nested folders go to trash with it.",
        action: {
          label: "Delete",
          onClick: () => {
            void run(id, async () => {
              await deleteFolder({ id });
            }, "Folder deleted");
          },
        },
      });
    },
    [run, deleteFolder],
  );

  const handleToggle = useCallback(
    (id: string) => {
      setExpanded((prev) => {
        if (prev === null) {
          const next = new Set(allIds);
          next.delete(id);
          return next;
        }
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [allIds],
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTarget(null);
  }, []);

  const isRootCreating = creating?.parentId === null;

  // Total form count for root level (forms not in any folder)
  const rootForms = formsByFolder.get(null) ?? [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between pb-1 pl-3 pr-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {
            setRenamingId(null);
            setCreating(isRootCreating ? null : { parentId: null });
          }}
          title="New folder"
          aria-label="New folder"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {isRootCreating && (
        <div className="px-1 pb-1">
          <InlineInput
            autoFocus
            placeholder="Folder name"
            onCommit={(v) => handleCreate(null, v)}
            onCancel={() => setCreating(null)}
            className="h-7"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1 px-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      ) : error ? (
        <p className="px-3 text-xs text-muted-foreground">Couldn&apos;t load folders.</p>
      ) : !folders || (folders.length === 0 && rootForms.length === 0) ? (
        <p className="px-3 text-xs text-muted-foreground">No folders yet.</p>
      ) : (
        <FolderTree
          folders={folders ?? []}
          formsByFolder={formsByFolder}
          selectedId={selectedId}
          expanded={expanded}
          creating={creating}
          renamingId={renamingId}
          pendingId={pendingId}
          dragId={dragId}
          dropTarget={dropTarget}
          canDropOn={canDropOn}
          onToggle={handleToggle}
          onSelect={setSelectedId}
          onDragStart={setDragId}
          onDragEnd={handleDragEnd}
          onDropTarget={setDropTarget}
          onDropOnFolder={handleDropOnFolder}
          onDropInGap={handleDropInGap}
          onStartCreate={(parentId) => {
            setRenamingId(null);
            setCreating({ parentId });
          }}
          onCancelCreate={() => setCreating(null)}
          onSubmitCreate={handleCreate}
          onStartRename={(id) => {
            setCreating(null);
            setRenamingId(id);
          }}
          onCancelRename={() => setRenamingId(null)}
          onSubmitRename={handleRename}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
