"use client";

import dynamic from "next/dynamic";
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

export default function NewFormBuilderPage() {
  const [open, setOpen] = useState(true);

  return (
    <Suspense fallback={<FormBuilderSkeleton />}>
      <NewFormDialog open={open} onOpenChange={setOpen} />
      <FormBuilderClient />
    </Suspense>
  );
}
