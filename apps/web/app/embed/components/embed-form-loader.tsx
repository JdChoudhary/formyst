"use client";

import { notFound } from "next/navigation";
import { usePublicForm } from "@/hooks/api/form";
import { Loader } from "@/components/ui/loader";
import EmbedCustomizer from "./embed-customizer";

interface EmbedFormLoaderProps {
	formId: string;
}

/**
 * Client-side loader for /embed. Uses the `usePublicForm` hook so the page
 * shell has no direct tRPC calls.
 */
export default function EmbedFormLoader({ formId }: EmbedFormLoaderProps) {
	const { form, loading } = usePublicForm({ formId });

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Loader />
			</div>
		);
	}

	if (!form) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto px-4 py-8">
				<div className="mx-auto">
					<div className="mb-8">
						<div className="text-center">
							<h1 className="mb-2 font-semibold text-3xl text-foreground">
								Embed Your Form
							</h1>
							<p className="mx-auto max-w-2xl text-muted-foreground">
								Customize the appearance and dimensions of your form embed,
								then copy the code to integrate it into your website.
							</p>
						</div>
					</div>

					<EmbedCustomizer form={form} formId={formId} />
				</div>
			</div>
		</div>
	);
}