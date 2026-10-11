import { Suspense } from "react";
import { isMultiStep as isMultiStepForm } from "@repo/shared";
import { ensureDefaultRateLimitSettings } from "@/lib/forms/form-defaults";
import PublicFormClient from "../public-form-client";
import { FormSkeleton } from "./form-skeletons";

interface PublicFormServerWrapperProps {
	formId: string;
	schema: any;
}

export default function PublicFormServerWrapper({
	formId,
	schema,
}: PublicFormServerWrapperProps) {
	const normalizedSchema = ensureDefaultRateLimitSettings(schema);
	const isMultiStep = isMultiStepForm(normalizedSchema);

	return (
		<Suspense
			fallback={
				<FormSkeleton
					showProgress={isMultiStep}
					variant={isMultiStep ? "multi-step" : "single-step"}
				/>
			}
		>
			<PublicFormClient formId={formId} schema={normalizedSchema} />
		</Suspense>
	);
}
