import type { Metadata } from "next";
import { toFormView } from "@repo/shared";
import { buildPublicFormMetadata } from "@/lib/utils/public-form-metadata";
import { api } from "~/trpc/server";
import PublicFormLoader from "../../forms/[id]/components/public-form-loader";

export const dynamicParams = true;

export function generateStaticParams() {
	return [];
}

interface PublicFormPageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Resolve a published form by slug, falling back to a direct id lookup. */
async function resolvePublishedForm(identifier: string) {
	try {
		const dto = await api.form.getBySlug.query({ slug: identifier });
		return dto ? toFormView(dto) : null;
	} catch {
		// Not a slug — fall through and try it as a form id.
	}

	try {
		const dto = await api.form.getPublishedById.query({ id: identifier });
		return dto ? toFormView(dto) : null;
	} catch {
		return null;
	}
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	try {
		const form = await resolvePublishedForm(slug);
		if (!form) return {};

		// const baseUrl = "http://localhost:3000"; // TODO: Use env.BASE_URL when available in Next.js metadata generation.
		// const formUrl = `${baseUrl}/f/${slug}`;
		const formUrl = `http://localhost:3000/f/${slug}`;

		return buildPublicFormMetadata(form.schema, {
			formUrl,
			fallbackDescription: form.description,
		});
	} catch {
		return {};
	}
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
	const { slug } = await params;
	return <PublicFormLoader slug={slug} />;
}