import { useCallback } from "react";

import { trpc } from "~/trpc/client";

export const useGetFolders = () => trpc.folder.getAll.useQuery();

/**
 * Folder CRUD mutations, each invalidating the folder tree on success so the
 * sidebar stays in sync.
 */
export const useFolderMutations = () => {
  const utils = trpc.useUtils();

  const invalidate = useCallback(() => {
    void utils.folder.getAll.invalidate();
  }, [utils]);

  const createFolder = trpc.folder.create.useMutation({ onSuccess: invalidate });
  const renameFolder = trpc.folder.rename.useMutation({ onSuccess: invalidate });
  const moveFolder = trpc.folder.move.useMutation({ onSuccess: invalidate });
  const reorderFolders = trpc.folder.reorder.useMutation({ onSuccess: invalidate });
  const archiveFolder = trpc.folder.archive.useMutation({ onSuccess: invalidate });
  const restoreFolder = trpc.folder.restore.useMutation({ onSuccess: invalidate });
  const deleteFolder = trpc.folder.delete.useMutation({ onSuccess: invalidate });

  return {
    createFolder: createFolder.mutateAsync,
    renameFolder: renameFolder.mutateAsync,
    moveFolder: moveFolder.mutateAsync,
    reorderFolders: reorderFolders.mutateAsync,
    archiveFolder: archiveFolder.mutateAsync,
    restoreFolder: restoreFolder.mutateAsync,
    deleteFolder: deleteFolder.mutateAsync,
  };
};