"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { FormBuilderSkeleton } from "@/components/form-builder/form-builder-skeleton";
import { NewFormDialog } from "@/components/dashboard/forms-management/new-form-dialog";

const FormBuilderClient = dynamic(
  () => import("@/components/form-builder/form-builder-client"),
  {
    ssr: true,
    loading: () => <FormBuilderSkeleton />,
  },
);

/**
 * The "create a new form" dialog. It is skipped when the builder was opened
 * with a generated/imported schema (e.g. "Use this form" in the AI builder), so
 * that form loads straight onto the canvas as an unsaved draft.
 */
function NewFormDialogGate() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get("from") !== "ai-builder");
  return <NewFormDialog open={open} onOpenChange={setOpen} />;
}

export default function NewFormBuilderPage() {
  return (
    <Suspense fallback={<FormBuilderSkeleton />}>
      <NewFormDialogGate />
      <FormBuilderClient />
    </Suspense>
  );
}
