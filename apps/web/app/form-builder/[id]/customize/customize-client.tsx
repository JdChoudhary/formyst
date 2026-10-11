"use client";

import { FormCustomizePage } from "@/components/form-builder/form-customize";
import { Loader } from "@/components/ui/loader";
import { useGetForm } from "@/hooks/api/form";
import { useAuth } from "@/hooks/use-auth";
import { createDefaultFormSchema, ensureDefaultFormSettings } from "@/lib/forms";

export default function CustomizeClient({ id }: { id: string }) {
  const { loading: authLoading } = useAuth();
  const { form, error: loadError, isLoading } = useGetForm(id || "");

  const schema = form
    ? ensureDefaultFormSettings(form.schema ?? createDefaultFormSchema({ title: form.title }))
    : null;

  const error = loadError ? "Failed to load form. Please try again." : null;

  if (authLoading || isLoading || !schema) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {error ? <p className="text-muted-foreground">{error}</p> : <Loader />}
      </div>
    );
  }

  return <FormCustomizePage formId={id} schema={schema} />;
}
