import type { Metadata } from "next";
import { toFormView } from "@repo/shared";
import { buildPublicFormMetadata } from "@/lib/utils/public-form-metadata";
import { api } from "~/trpc/server";
import PublicFormLoader from "./components/public-form-loader";

export const dynamicParams = true;

export function generateStaticParams() {
	return [];
}

interface PublicFormPageProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	try {
		const dto = await api.form.getPublishedById.query({ id });
		const form = dto ? toFormView(dto) : null;
		if (!form) return {};

		const baseUrl = "https://www.ikiform.com";
		const identifier = form.slug || id;
		const formUrl = `${baseUrl}/f/${identifier}`;

		return buildPublicFormMetadata(form.schema, {
			formUrl,
			fallbackDescription: form.description,
		});
	} catch {
		return {};
	}
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
	const { id } = await params;
	return <PublicFormLoader formId={id} />;
}