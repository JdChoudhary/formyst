"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { CSSPropertiesProvider } from "./css-properties-provider";
import { FormSkeleton } from "./form-skeletons";

const SingleStepForm = dynamic(
  () =>
    import("@/components/forms/form-renderer/single-step/components").then(
      (mod) => ({ default: mod.SingleStepForm }),
    ),
  {
    loading: () => <FormSkeleton variant="single-step" />,
  },
);

const ConversationalForm = dynamic(
  () =>
    import("@/components/forms/form-renderer/conversational/conversational-form").then(
      (mod) => ({ default: mod.ConversationalForm }),
    ),
  {
    loading: () => <FormSkeleton showProgress={true} variant="multi-step" />,
  },
);

interface PublicFormContentProps {
  formId: string;
  schema: any;
}

export default function PublicFormContent({ formId, schema }: PublicFormContentProps) {
  const isConversational = schema.mode === "conversational";

  return (
    <CSSPropertiesProvider schema={schema}>
      <div className="light">
        <Suspense
          fallback={
            <FormSkeleton
              showProgress={isConversational}
              variant={isConversational ? "multi-step" : "single-step"}
            />
          }
        >
          {isConversational ? (
            <ConversationalForm dir="ltr" formId={formId} schema={schema} />
          ) : (
            <SingleStepForm dir="ltr" formId={formId} schema={schema} />
          )}
        </Suspense>
      </div>
    </CSSPropertiesProvider>
  );
}
