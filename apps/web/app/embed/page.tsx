import { ArrowLeft, Code2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EmbedFormLoader from "./components/embed-form-loader";

interface EmbedPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
	title: "Embed Form - IkiForm",
	description:
		"Customize and embed your form with custom dimensions and styling.",
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
	const resolvedSearchParams = await searchParams;
	const formId = resolvedSearchParams.formid as string;

	if (!formId) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<Card className="w-full max-w-md text-center">
					<CardContent className="p-8">
						<div className="gradient-bg mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl">
							<Code2 className="size-8 text-accent-foreground" />
						</div>
						<h1 className="mb-4 font-semibold text-2xl text-foreground">
							Missing Form ID
						</h1>
						<p className="mb-6 text-muted-foreground">
							Please provide a form ID in the URL parameter. Example:
							/embed?formid=your-form-id
						</p>
						<Button
							variant="default"
							render={<Link className="gap-2" href="/dashboard" />}
							nativeButton={false}
						>
							<ArrowLeft className="size-4" />
							Go to Dashboard
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return <EmbedFormLoader formId={formId} />;
}