import { useCallback, useMemo } from "react";
import type { FormSubmissionView } from "@repo/shared";
import { toSubmissionView } from "@repo/shared";

import { useAuth } from "@/hooks/use-auth";
import { trpc } from "~/trpc/client";

/**
 * All responses + answers for a form's analytics UI, mapped to the
 * analytics SubmissionView shape.
 */
export const useFormSubmissions = (formId: string) => {
  const { user } = useAuth();

  const { data, isLoading, isFetching, refetch } = trpc.response.getAll.useQuery(
    { formId },
    { enabled: !!user && !!formId },
  );

  const submissions = useMemo<FormSubmissionView[]>(
    () => (data?.responses ?? []).map(toSubmissionView),
    [data],
  );

  const refreshData = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    submissions,
    loading: isLoading,
    refreshing: isFetching,
    refreshData,
  };
};