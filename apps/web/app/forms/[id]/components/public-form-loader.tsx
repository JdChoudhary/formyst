"use client";

import { notFound } from "next/navigation";
import { ensureDefaultRateLimitSettings } from "@repo/shared";
import { usePublicForm } from "@/hooks/api/form";
import { Loader } from "@/components/ui/loader";
import PublicFormServerWrapper from "./public-form-server-wrapper";

interface PublicFormLoaderProps {
  /** Published form id (picked up first when both are provided). */
  formId?: string;
  /** Published form slug, falling back to a direct id lookup on miss. */
  slug?: string;
}

/**
 * Client-side loader for the public (non-authenticated) form pages. Uses the
 * `usePublicForm` hook so no direct tRPC calls happen in the page shell.
 */
export default function PublicFormLoader({ formId, slug }: PublicFormLoaderProps) {
  const { form, loading } = usePublicForm({ formId, slug });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!form) {
    notFound();
  }

  return (
    <PublicFormServerWrapper
      formId={form.id}
      schema={ensureDefaultRateLimitSettings(form.schema)}
    />
  );
}