import { ArrowLeft, BarChart3, Calendar, ExternalLink, FileText, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormDetail, listFormResponses, requireAdmin } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function FormDetailPage({
	params,
}: {
	params: Promise<{ formId: string }>;
}) {
	await requireAdmin();
	const { formId } = await params;

	const form = await getFormDetail(formId);

	if (!form) {
		return (
			<main aria-label="Form not found error" className="mx-auto w-full max-w-7xl p-6">
				<Card className="p-4 shadow-none md:p-6">
					<CardContent className="p-0">
						<div className="text-center">
							<h1 className="font-bold text-2xl">Form Not Found</h1>
							<p className="mt-2 text-muted-foreground">
								The form you're looking for doesn't exist.
							</p>
							<Link href="/admin">
								<Button className="mt-4">
									<ArrowLeft className="size-4" />
									Back to Admin
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</main>
		);
	}

	const responses = await listFormResponses(formId);

	return (
		<main
			aria-label="Form details page"
			className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6"
		>
			<div className="flex items-center justify-between">
				<div className="flex flex-col items-start gap-4">
					<Link href="/admin">
						<Button size="sm" variant="outline">
							<ArrowLeft className="size-4" />
							Back to Admin
						</Button>
					</Link>
					<div>
						<h1 className="font-bold text-3xl">{form.title}</h1>
						<p className="text-muted-foreground">
							{form.description || "No description provided"}
						</p>
					</div>
				</div>
				{form.slug && (
					<Link href={`/f/${form.slug}`} rel="noopener noreferrer" target="_blank">
						<Button size="sm" variant="outline">
							<ExternalLink className="size-4" />
							View Form
						</Button>
					</Link>
				)}
			</div>

			<section
				aria-label="Form statistics"
				className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
			>
				<Card className="p-4 shadow-none md:p-6">
					<CardContent className="p-0">
						<div className="flex items-center gap-2">
							<FileText aria-hidden="true" className="size-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-sm">Status</p>
								<Badge variant={form.isPublished ? "default" : "secondary"}>
									{form.isPublished ? "Published" : "Draft"}
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="p-4 shadow-none md:p-6">
					<CardContent className="p-0">
						<div className="flex items-center gap-2">
							<Users aria-hidden="true" className="size-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-sm">Responses</p>
								<p className="font-bold text-2xl">{responses.length}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="p-4 shadow-none md:p-6">
					<CardContent className="p-0">
						<div className="flex items-center gap-2">
							<Calendar aria-hidden="true" className="size-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-sm">Created</p>
								<p className="text-sm">{form.createdAt.toLocaleDateString()}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="p-4 shadow-none md:p-6">
					<CardContent className="p-0">
						<div className="flex items-center gap-2">
							<BarChart3 aria-hidden="true" className="size-5 text-muted-foreground" />
							<div>
								<p className="font-medium text-sm">API</p>
								<Badge variant={form.apiEnabled ? "default" : "secondary"}>
									{form.apiEnabled ? "Enabled" : "Disabled"}
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>

			<Card className="p-4 shadow-none md:p-6">
				<CardHeader className="p-0">
					<CardTitle className="flex items-center gap-2">
						<FileText className="size-5" />
						Form Details
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label className="font-medium text-muted-foreground text-sm">Form ID</label>
							<p className="font-mono text-sm">{form.id}</p>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Owner</label>
							<p className="text-sm">
								{form.owner ? (
									<Link
										className="text-primary hover:underline"
										href={`/admin/users/${form.owner.id}`}
									>
										{form.owner.name} ({form.owner.email})
									</Link>
								) : (
									"Unknown"
								)}
							</p>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Slug</label>
							<p className="text-sm">{form.slug || "-"}</p>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Revision</label>
							<p className="text-sm">{form.revision}</p>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Last Updated</label>
							<p className="text-sm">{form.updatedAt.toLocaleDateString()}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="p-4 shadow-none md:p-6">
				<CardHeader className="p-0">
					<CardTitle className="flex items-center gap-2">
						<Users className="size-5" />
						Responses ({responses.length})
					</CardTitle>
					<p className="text-muted-foreground text-sm">
						All responses submitted to this form
					</p>
				</CardHeader>
				<CardContent className="p-0">
					{responses.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground" role="status">
							<Users className="mx-auto mb-4 size-12 opacity-50" />
							<p>No responses yet.</p>
						</div>
					) : (
						<div className="flex flex-col gap-4" role="region">
							{responses.map((response, index) => (
								<Card className="p-4 shadow-none md:p-6" key={response.id} role="article">
									<div className="mb-3 flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="font-medium text-sm">
												Response #{responses.length - index}
											</span>
											<Badge variant="outline">
												{response.status}
											</Badge>
										</div>
										<span className="text-muted-foreground text-xs">
											{(response.submittedAt ?? response.createdAt).toLocaleString()}
										</span>
									</div>
									<div className="flex flex-col gap-2">
										{Object.entries(response.data).map(([key, value]) => (
											<div className="grid grid-cols-1 gap-2 md:grid-cols-3" key={key}>
												<div className="font-medium text-sm">{key}:</div>
												<div className="break-words text-sm md:col-span-2">
													{typeof value === "object"
														? JSON.stringify(value)
														: String(value)}
												</div>
											</div>
										))}
									</div>
								</Card>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
