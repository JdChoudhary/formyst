import { ArrowLeft, ExternalLink, Eye, FileText, Inbox, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { countUserResponses, getUser, listFormsByUser, requireAdmin } from "@/lib/admin/data";
import { AdminControls } from "./admin-controls";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
	params,
}: {
	params: Promise<{ userId: string }>;
}) {
	await requireAdmin();
	const { userId } = await params;

	const userData = await getUser(userId);

	if (!userData) {
		return (
			<main className="mx-auto w-full max-w-7xl p-6">
				<Card className="p-4 shadow-none md:p-6">
					<CardContent className="p-0">
						<div className="text-center">
							<h1 className="font-bold text-2xl">User Not Found</h1>
							<p className="mt-2 text-muted-foreground">
								The user you're looking for doesn't exist.
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

	const [forms, responseCount] = await Promise.all([
		listFormsByUser(userId),
		countUserResponses(userId),
	]);

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
			<div className="flex flex-col items-start gap-4">
				<Link href="/admin">
					<Button size="sm" variant="outline">
						<ArrowLeft className="size-4" />
						Back to Admin
					</Button>
				</Link>
				<div>
					<h1 className="font-bold text-3xl">{userData.name}</h1>
					<p className="text-muted-foreground">{userData.email}</p>
				</div>
			</div>

			<Card className="p-4 shadow-none md:p-6">
				<CardHeader className="p-0">
					<CardTitle className="flex items-center gap-2">
						<Users className="size-5" />
						User Information
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div>
							<label className="font-medium text-muted-foreground text-sm">User ID</label>
							<p className="font-mono text-sm">{userData.id}</p>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Role</label>
							<div className="mt-1">
								<Badge variant={(userData.role ?? "user") === "admin" ? "default" : "secondary"}>
									{userData.role ?? "user"}
								</Badge>
							</div>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Status</label>
							<div className="mt-1">
								<Badge variant={userData.banned ? "destructive" : "secondary"}>
									{userData.banned ? "Banned" : "Active"}
								</Badge>
							</div>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Forms</label>
							<p className="text-sm">{userData.formCount}</p>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Responses</label>
							<p className="text-sm">{responseCount}</p>
						</div>
						<div>
							<label className="font-medium text-muted-foreground text-sm">Member Since</label>
							<p className="text-sm">
								{userData.createdAt.toLocaleDateString("en-US", {
									year: "numeric",
									month: "2-digit",
									day: "2-digit",
								})}
							</p>
						</div>
						{userData.banned && userData.banReason && (
							<div className="md:col-span-2 lg:col-span-3">
								<label className="font-medium text-muted-foreground text-sm">
									Ban Reason
								</label>
								<p className="text-sm">{userData.banReason}</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<AdminControls
				banned={userData.banned}
				role={userData.role}
				userId={userData.id}
				userName={userData.name}
			/>

			<Card className="p-4 shadow-none md:p-6">
				<CardHeader className="p-0">
					<CardTitle className="flex items-center gap-2">
						<FileText className="size-5" />
						Forms ({forms.length})
					</CardTitle>
					<p className="text-muted-foreground text-sm">All forms created by this user</p>
				</CardHeader>
				<CardContent className="p-0">
					{forms.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							<FileText className="mx-auto mb-4 size-12 opacity-50" />
							<p>This user hasn't created any forms yet.</p>
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Form Title</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Responses</TableHead>
										<TableHead>Created</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{forms.map((form) => (
										<TableRow className="hover:bg-muted/50" key={form.id}>
											<TableCell className="font-medium">
												<Link
													className="flex items-center gap-2 hover:text-primary"
													href={`/admin/forms/${form.id}`}
												>
													{form.title}
													<ExternalLink className="size-3 opacity-50" />
												</Link>
											</TableCell>
											<TableCell>
												<Badge variant={form.isPublished ? "default" : "secondary"}>
													{form.isPublished ? "Published" : "Draft"}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Inbox className="size-3" />
													{form.responseCount}
												</div>
											</TableCell>
											<TableCell>
												{form.createdAt.toLocaleDateString("en-US", {
													year: "numeric",
													month: "2-digit",
													day: "2-digit",
												})}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Link
														href={`/f/${form.slug}`}
														rel="noopener noreferrer"
														target="_blank"
													>
														<Button size="sm" variant="outline">
															<ExternalLink className="size-3" />
															View
														</Button>
													</Link>
													<Link href={`/admin/forms/${form.id}`}>
														<Button size="sm" variant="outline">
															<Eye className="size-3" />
															Details
														</Button>
													</Link>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
