import type { Metadata } from "next";
import { Suspense } from "react";
import { FormBuilder } from "@/components/form-builder/form-builder";
import { Loader } from "@/components/ui/loader";

export const dynamicParams = true;

export function generateStaticParams() {
	return [];
}

interface FormBuilderPageProps {
	params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
	title: "Form Editor",
	description: "Build, edit, and manage your forms with the form builder.",
};

export default async function FormBuilderPage({
	params,
}: FormBuilderPageProps) {
	const { id } = await params;

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<Loader />
				</div>
			}
		>
			<FormBuilder formId={id} />
		</Suspense>
	);
}
