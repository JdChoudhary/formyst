import { useCallback, useMemo, useState } from "react";
import type { FormView, FormSchema } from "@repo/shared";
import { toFormView, toSubmissionView } from "@repo/shared";

import { trpc } from "~/trpc/client";

export const useCreateForm = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.create.useMutation({
    onSuccess: async () => {
      await utils.form.getAll.invalidate();
    },
  });

  return {
    createForm: mutation.mutateAsync,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
  };
};

export const useGetForms = () => {
  const {
    data: forms,
    error,
    isLoading,
    isFetching,
  } = trpc.form.getAll.useQuery();

  return { forms, error, isLoading, isFetching };
};

export const useGetForm = (id: string) => {
  const {
    data: form,
    error,
    isLoading,
    isFetching,
    refetch,
  } = trpc.form.getById.useQuery({ id }, { enabled: !!id });

  return { form, error, isLoading, isFetching, refetch };
};

export const useUpdateForm = () => {
  const utils = trpc.useUtils();

  const saveDraft = trpc.form.saveDraft.useMutation({
    onSuccess: async () => {
      await utils.form.getAll.invalidate();
      await utils.form.getById.invalidate();
    },
  });

  const update = trpc.form.update.useMutation({
    onSuccess: async () => {
      await utils.form.getAll.invalidate();
      await utils.form.getById.invalidate();
    },
  });

  const updateForm = async (
    id: string,
    updates: {
      schema?: FormSchema;
      title?: string;
      description?: string | null;
    },
  ) => {
    if (updates.schema) {
      await saveDraft.mutateAsync({
        id,
        schema: updates.schema,
      });
    }

    if (updates.title !== undefined || updates.description !== undefined) {
      await update.mutateAsync({
        id,
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.description !== undefined
          ? { description: updates.description }
          : {}),
      });
    }
  };

  return {
    updateForm,
    error: saveDraft.error || update.error,
    isError: saveDraft.isError || update.isError,
    isPending: saveDraft.isPending || update.isPending,
    isSuccess: saveDraft.isSuccess || update.isSuccess,
  };
};

export const useTogglePublishForm = () => {
  const utils = trpc.useUtils();

  const publish = trpc.form.publish.useMutation({
    onSuccess: async () => {
      await utils.form.getAll.invalidate();
      await utils.form.getById.invalidate();
    },
  });

  const unpublish = trpc.form.unpublish.useMutation({
    onSuccess: async () => {
      await utils.form.getAll.invalidate();
      await utils.form.getById.invalidate();
    },
  });

  const togglePublish = async (id: string, publishState: boolean, schema?: FormSchema) => {
    if (publishState) {
      await publish.mutateAsync({ id, schema });
    } else {
      await unpublish.mutateAsync({ id });
    }
  };

  return {
    togglePublish,
    error: publish.error || unpublish.error,
    isError: publish.isError || unpublish.isError,
    isPending: publish.isPending || unpublish.isPending,
  };
};

export const useDeleteForm = (options?: { onSuccess?: () => void }) => {
  const utils = trpc.useUtils();

  const mutation = trpc.form.delete.useMutation({
    onSuccess: async () => {
      await utils.form.getAll.invalidate();
      options?.onSuccess?.();
    },
  });

  return {
    deleteForm: mutation.mutateAsync,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
  };
};

export const useDuplicateForm = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.form.duplicate.useMutation({
    onSuccess: async () => {
      await utils.form.getAll.invalidate();
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Fetches a single form's full detail (including schema) for the dashboard
 * form pages and maps it to the analytics-friendly Form shape.
 */
export const useDashboardForm = (formId: string) => {
  const { data, isLoading, isError } = trpc.form.getById.useQuery(
    { id: formId },
    { enabled: !!formId },
  );

  const form = useMemo<FormView | null>(
    () => (data ? toFormView(data) : null),
    [data],
  );

  return { form, isLoading, isError };
};

/**
 * Loads a published form for public pages. Accepts either a form id or a slug.
 * When a slug is provided and the slug lookup fails, falls back to treating it
 * as a form id.
 */
export const usePublicForm = ({
  slug,
  formId,
}: {
  slug?: string;
  formId?: string;
}) => {
  const bySlug = trpc.form.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug && !formId },
  );

  const byId = trpc.form.getPublishedById.useQuery(
    { id: formId ?? slug ?? "" },
    { enabled: !!formId || (!!slug && bySlug.isError) },
  );

  const loading = bySlug.isLoading || byId.isLoading;
  const dto = formId ? byId.data : bySlug.data ?? (bySlug.isError ? byId.data : undefined);

  const form = useMemo<FormView | null>(
    () => (dto ? toFormView(dto) : null),
    [dto],
  );

  return {
    form,
    loading,
    error: !loading && !form,
  };
};

/**
 * Imperatively fetches a form's detail + submissions for CSV/JSON export,
 * mapped to the analytics view shapes.
 */
export const useFormExport = () => {
  const utils = trpc.useUtils();
  const [isExporting, setIsExporting] = useState(false);

  const fetchExportData = useCallback(
    async (formId: string) => {
      setIsExporting(true);
      try {
        const [detail, responses] = await Promise.all([
          utils.form.getById.fetch({ id: formId }),
          utils.response.getAll.fetch({ formId }),
        ]);
        return {
          form: toFormView(detail),
          submissions: responses.responses.map(toSubmissionView),
        };
      } finally {
        setIsExporting(false);
      }
    },
    [utils],
  );

  return { fetchExportData, isExporting };
};

export interface ApiKeyResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}

/**
 * Imperative API-key controls for the form settings UI. The plaintext key is
 * returned once by the server and mirrored into the schema by the caller.
 */
export const useFormApiKeys = () => {
  const generateApiKeyMutation = trpc.form.generateApiKey.useMutation();
  const revokeApiKeyMutation = trpc.form.revokeApiKey.useMutation();
  const setApiEnabledMutation = trpc.form.setApiEnabled.useMutation();

  const generateApiKey = async (formId: string): Promise<ApiKeyResult> => {
    try {
      const result = await generateApiKeyMutation.mutateAsync({ id: formId });
      return { success: true, apiKey: result.apiKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate API key",
      };
    }
  };

  const revokeApiKey = async (formId: string): Promise<ApiKeyResult> => {
    try {
      await revokeApiKeyMutation.mutateAsync({ id: formId });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to revoke API key",
      };
    }
  };

  const toggleApiEnabled = async (
    formId: string,
    enabled: boolean,
  ): Promise<ApiKeyResult> => {
    try {
      await setApiEnabledMutation.mutateAsync({ id: formId, enabled });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update API settings",
      };
    }
  };

  return { generateApiKey, revokeApiKey, toggleApiEnabled };
};