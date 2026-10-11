"use client";

import {
	Calendar,
	Clock,
	Copy,
	Download,
	Globe,
	Hash,
	Percent,
	User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { copyWithToast } from "@/lib/utils/clipboard";
import type { FormView, FormSubmissionView } from "@repo/shared";
import { AnswerValue, hasAnswerValue, RecallText } from "./answer-view";

interface SubmissionDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	submission: FormSubmissionView | null;
	form: FormView;
}

const STATUS_LABELS: Record<string, string> = {
	draft: "Draft",
	submitted: "Submitted",
	partial: "Partial",
	abandoned: "Abandoned",
	spam: "Spam",
	deleted: "Deleted",
};

const formatDuration = (seconds: number | null | undefined): string | null => {
	if (seconds === null || seconds === undefined) return null;
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const minutes = Math.floor(seconds / 60);
	const rest = Math.round(seconds % 60);
	if (minutes < 60) return `${minutes}m ${rest}s`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m`;
};

export function SubmissionDetailsModal({
	isOpen,
	onClose,
	submission,
	form,
}: SubmissionDetailsModalProps) {
	if (!submission) return null;

	const fields = form.schema.fields ?? [];
	const knownRefs = new Set(fields.map((field) => field.ref ?? ""));
	const answers = submission.submission_data ?? {};

	// Answer rows in the form's own question order.
	const rows = fields
		.map((field) => ({
			ref: field.ref ?? "",
			question: field.title || field.ref || "Untitled question",
			answer: answers[field.ref ?? ""],
		}))
		.filter((row) => row.ref);

	// Any stored value that no longer maps to a question.
	const orphanRows = Object.entries(answers)
		.filter(([key]) => !knownRefs.has(key))
		.map(([key, value]) => ({ ref: key, question: key, answer: value }));

	const allRows = [...rows, ...orphanRows];
	const answeredCount = allRows.filter((row) => hasAnswerValue(row.answer)).length;
	const duration = formatDuration(submission.time_spent_seconds);
	const completion = Math.round(submission.completion_percentage ?? 0);
	const statusLabel = STATUS_LABELS[submission.status] ?? submission.status;

	const handleCopyJson = () => {
		copyWithToast(
			JSON.stringify(
				{
					id: submission.id,
					submitted_at: submission.submitted_at,
					data: answers,
				},
				null,
				2,
			),
			"Submission copied as JSON",
		);
	};

	const handleDownloadJson = () => {
		const dataStr = JSON.stringify(
			{
				id: submission.id,
				submitted_at: submission.submitted_at,
				data: answers,
			},
			null,
			2,
		);
		const blob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `submission_${submission.id.slice(-8)}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Dialog onOpenChange={onClose} open={isOpen}>
			<DialogContent className="flex max-h-[88vh] max-w-3xl flex-col gap-4 overflow-hidden">
				<DialogHeader className="gap-3 pr-8">
					<DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
						<span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Hash className="size-4" />
						</span>
						Submission
						<span className="font-mono text-muted-foreground text-sm">
							#{submission.id.slice(-8)}
						</span>
						{statusLabel && (
							<Badge
								variant={submission.status === "submitted" ? "default" : "secondary"}
							>
								{statusLabel}
							</Badge>
						)}
						<Badge className="ml-auto" variant="outline">
							{answeredCount} of {allRows.length} answered
						</Badge>
					</DialogTitle>
					<DialogDescription className="sr-only">
						Answers submitted for {form.title}
					</DialogDescription>

					{/* Meta */}
					<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground text-xs">
						<span className="flex items-center gap-1.5">
							<Calendar className="size-3.5" />
							{new Date(submission.submitted_at).toLocaleString("en-US", {
								year: "numeric",
								month: "short",
								day: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
						{duration && (
							<span className="flex items-center gap-1.5">
								<Clock className="size-3.5" />
								{duration}
							</span>
						)}
						<span className="flex items-center gap-1.5">
							<Percent className="size-3.5" />
							{completion}% complete
						</span>
						{submission.ip_address && (
							<span className="flex items-center gap-1.5 font-mono">
								<Globe className="size-3.5" />
								{submission.ip_address}
							</span>
						)}
					</div>
				</DialogHeader>

				<Separator />

				{/* Question → answer */}
				<div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
					{allRows.length === 0 ? (
						<div className="flex flex-col items-center gap-2 py-10 text-center">
							<User className="size-8 text-muted-foreground" />
							<p className="text-muted-foreground text-sm">
								This submission has no answers.
							</p>
						</div>
					) : (
						<ol className="flex flex-col gap-2.5 pb-1">
							{allRows.map((row, index) => {
								const answered = hasAnswerValue(row.answer);
								return (
									<li
										className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/50 p-3 transition-colors hover:border-border"
										key={row.ref}
									>
										<div className="flex items-start gap-2.5">
											<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted font-semibold text-[11px] text-muted-foreground tabular-nums">
												{index + 1}
											</span>
											<RecallText
												answers={answers}
												className="font-medium text-foreground text-sm leading-snug"
												schema={form.schema}
												text={row.question}
											/>
										</div>
										<div className="min-w-0 pl-7 text-sm">
											{answered ? (
												<AnswerValue
													answers={answers}
													schema={form.schema}
													value={row.answer}
												/>
											) : (
												<span className="text-muted-foreground italic">
													Not answered
												</span>
											)}
										</div>
									</li>
								);
							})}
						</ol>
					)}
				</div>

				<Separator />

				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground text-xs">
						{form.title}
					</span>
					<div className="flex items-center gap-2">
						<Button onClick={handleCopyJson} size="sm" variant="outline">
							<Copy className="size-3.5" />
							Copy JSON
						</Button>
						<Button onClick={handleDownloadJson} size="sm" variant="outline">
							<Download className="size-3.5" />
							Export
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
