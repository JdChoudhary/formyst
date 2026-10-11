"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { FormSubmissions } from "@/components/forms/form-analytics/components/form-submissions";
import { useFormSubmissions } from "@/hooks/api/response";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useDashboardForm } from "@/hooks/api/form";

export default function FormResponsesPage() {
	const params = useParams<{ id: string }>();
	const id = params?.id ?? "";
	const { form, isLoading, isError } = useDashboardForm(id);
	const { submissions, loading: submissionsLoading } = useFormSubmissions(id);

	if (isLoading || submissionsLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<Loader />
			</div>
		);
	}

	if (isError || !form) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
				<div className="font-semibold text-2xl">Form not found</div>
				<p className="max-w-md text-center text-muted-foreground">
					This form does not exist or you do not have access to it.
				</p>
				<Link href="/dashboard">
					<Button size="lg">Back to dashboard</Button>
				</Link>
			</div>
		);
	}

	return <FormSubmissions form={form} submissions={submissions} />;
}
