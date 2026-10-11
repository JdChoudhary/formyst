import { redirect } from "next/navigation";

export const dynamicParams = true;

export function generateStaticParams() {
	return [];
}

export default async function FormDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	redirect(`/dashboard/forms/${id}/analytics`);
}
