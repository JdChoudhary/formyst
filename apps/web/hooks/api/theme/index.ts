import { trpc } from "~/trpc/client";

export const useGetThemes = () => trpc.theme.getAll.useQuery();

export const useGetTheme = (id: string) =>
  trpc.theme.getById.useQuery({ id }, { enabled: !!id });

/**
 * Theme CRUD mutations, each invalidating the theme list on success.
 * Exposes the raw mutation objects so callers can read isPending and call
 * mutateAsync with the same API tRPC used to provide.
 */
export const useThemeMutations = () => {
  const utils = trpc.useUtils();

  const invalidate = async () => {
    await utils.theme.getAll.invalidate();
  };

  const createTheme = trpc.theme.create.useMutation({ onSuccess: invalidate });
  const deleteTheme = trpc.theme.delete.useMutation({ onSuccess: invalidate });
  const duplicateTheme = trpc.theme.duplicate.useMutation({ onSuccess: invalidate });
  const setDefault = trpc.theme.setDefault.useMutation({ onSuccess: invalidate });

  return { createTheme, deleteTheme, duplicateTheme, setDefault };
};

/** Single-theme update that keeps both the list and the open theme fresh. */
export const useUpdateTheme = (themeId: string) => {
  const utils = trpc.useUtils();

  return trpc.theme.update.useMutation({
    onSuccess: async () => {
      await utils.theme.getAll.invalidate();
      await utils.theme.getById.invalidate({ id: themeId });
    },
  });
};