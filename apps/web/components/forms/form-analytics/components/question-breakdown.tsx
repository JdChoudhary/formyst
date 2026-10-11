"use client";

import { useMemo } from "react";
import { ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FormView, FormSubmissionView } from "@repo/shared";
import { RecallText } from "./answer-view";

interface QuestionBreakdownProps {
	form: FormView;
	submissions: FormSubmissionView[];
}

interface Bucket {
	label: string;
	count: number;
	percent: number;
}

interface ChoiceBreakdown {
	kind: "choice";
	ref: string;
	label: string;
	answered: number;
	buckets: Bucket[];
}

interface TextBreakdown {
	kind: "text";
	ref: string;
	label: string;
	answered: number;
	words: { word: string; count: number }[];
}

type Breakdown = ChoiceBreakdown | TextBreakdown;

const TEXT_TYPES = new Set(["short_text", "long_text"]);

const STOPWORDS = new Set([
	"the", "and", "for", "are", "but", "not", "you", "your", "with", "that", "this",
	"have", "has", "had", "was", "were", "will", "would", "can", "could", "should",
	"from", "they", "them", "their", "there", "then", "than", "when", "what", "which",
	"who", "how", "why", "all", "any", "some", "very", "just", "too", "also", "into",
	"about", "would", "like", "get", "got", "its", "it's", "our", "out", "one", "two",
	"been", "being", "more", "most", "much", "many", "only", "other", "such", "own",
]);

const hasValue = (value: unknown): boolean =>
	value !== "" &&
	value !== null &&
	value !== undefined &&
	!(Array.isArray(value) && value.length === 0);

const toLabels = (value: unknown): string[] => {
	if (Array.isArray(value)) return value.flatMap((v) => toLabels(v));
	if (typeof value === "boolean") return [value ? "Yes" : "No"];
	if (value === null || value === undefined || value === "") return [];
	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		if (typeof obj.label === "string") return [obj.label];
		if (typeof obj.value !== "undefined") return toLabels(obj.value);
		return [JSON.stringify(value)];
	}
	return [String(value)];
};

function buildWordCloud(answers: string[], limit = 28) {
	const counts = new Map<string, number>();
	for (const answer of answers) {
		const cleaned = String(answer)
			.toLowerCase()
			.replace(/[^a-z0-9'\s-]/g, " ")
			.split(/\s+/);
		for (const raw of cleaned) {
			const word = raw.replace(/^['-]+|['-]+$/g, "").trim();
			if (word.length < 3 || STOPWORDS.has(word)) continue;
			counts.set(word, (counts.get(word) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([word, count]) => ({ word, count }));
}

/** Simple SVG donut for a single-select question. */
function DonutChart({ buckets }: { buckets: Bucket[] }) {
	const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
	if (total === 0) return null;

	const radius = 42;
	const circumference = 2 * Math.PI * radius;
	const palette = [
		"hsl(var(--primary))",
		"#10b981",
		"#f59e0b",
		"#8b5cf6",
		"#ef4444",
		"#06b6d4",
	];
	// Pre-compute each arc's start offset so we never mutate during render.
	const offsets = buckets.map((_, index) =>
		buckets
			.slice(0, index)
			.reduce((sum, bucket) => sum + (bucket.count / total) * circumference, 0),
	);

	return (
		<div className="flex items-center gap-4">
			<svg aria-hidden className="size-28 shrink-0 -rotate-90" viewBox="0 0 100 100">
				<circle
					cx="50"
					cy="50"
					fill="none"
					r={radius}
					stroke="hsl(var(--muted))"
					strokeWidth="14"
				/>
				{buckets.map((bucket, index) => {
					const fraction = bucket.count / total;
					const dash = fraction * circumference;
					return (
						<circle
							cx="50"
							cy="50"
							fill="none"
							key={bucket.label}
							r={radius}
							stroke={palette[index % palette.length]}
							strokeDasharray={`${dash} ${circumference - dash}`}
							strokeDashoffset={-(offsets[index] ?? 0)}
							strokeWidth="14"
						/>
					);
				})}
			</svg>
			<ul className="flex min-w-0 flex-col gap-1">
				{buckets.map((bucket, index) => (
					<li className="flex items-center gap-2 text-xs" key={bucket.label}>
						<span
							className="size-2.5 shrink-0 rounded-full"
							style={{ backgroundColor: palette[index % palette.length] }}
						/>
						<span className="truncate">{bucket.label}</span>
						<span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
							{bucket.percent}%
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export function QuestionBreakdown({ form, submissions }: QuestionBreakdownProps) {
	const breakdowns = useMemo<Breakdown[]>(() => {
		const fields = form.schema.fields ?? [];

		return fields
			.map((field): Breakdown | null => {
				const ref = field.ref ?? "";
				const label = field.title || ref || "Untitled question";

				if (TEXT_TYPES.has(field.type)) {
					const answers: string[] = [];
					for (const submission of submissions) {
						const value = submission.submission_data[ref];
						if (hasValue(value)) answers.push(...toLabels(value));
					}
					if (answers.length === 0) return null;
					const words = buildWordCloud(answers);
					if (words.length === 0) return null;
					return { kind: "text", ref, label, answered: answers.length, words };
				}

				const counts = new Map<string, number>();
				let answered = 0;
				for (const submission of submissions) {
					const value = submission.submission_data[ref];
					if (!hasValue(value)) continue;
					answered++;
					for (const bucket of toLabels(value)) {
						counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
					}
				}
				if (answered === 0) return null;

				// Declared choice order first, then observed values by frequency.
				const declared = (field.properties?.choices ?? [])
					.map((choice) => choice.label)
					.filter((choiceLabel) => counts.has(choiceLabel));
				const observed = [...counts.keys()].filter((key) => !declared.includes(key));

				const buckets: Bucket[] = [...declared, ...observed]
					.map((bucketLabel) => ({
						label: bucketLabel,
						count: counts.get(bucketLabel) ?? 0,
						percent: Math.round(((counts.get(bucketLabel) ?? 0) / answered) * 100),
					}))
					.sort((a, b) => (declared.length ? 0 : b.count - a.count))
					.slice(0, 8);

				return {
					kind: "choice",
					ref,
					label,
					answered,
					buckets,
				};
			})
			.filter((item): item is Breakdown => item !== null);
	}, [form.schema.fields, submissions]);

	if (breakdowns.length === 0) return null;

	const maxWordCount = Math.max(
		1,
		...breakdowns.flatMap((b) => (b.kind === "text" ? b.words.map((w) => w.count) : [])),
	);

	return (
		<Card className="p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2">
					<ListChecks className="size-5" />
					Question Breakdown
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4 p-0 pt-4 lg:grid-cols-2">
				{breakdowns.map((item) => (
					<div className="flex flex-col gap-3 rounded-lg border p-3" key={item.ref}>
						<div className="flex items-start justify-between gap-2">
							<p className="line-clamp-2 font-medium text-sm">
								<RecallText
									answers={{}}
									showAnswer={false}
									schema={form.schema}
									text={item.label}
								/>
							</p>
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{item.answered} answered
							</span>
						</div>

						{item.kind === "choice" ? (
							<>
								{item.buckets.length > 1 && item.buckets.length <= 6 && (
									<DonutChart buckets={item.buckets} />
								)}
								<div className="flex flex-col gap-1.5">
									{item.buckets.map((bucket) => (
										<div className="flex items-center gap-2" key={bucket.label}>
											<span className="w-24 shrink-0 truncate text-muted-foreground text-xs">
												{bucket.label}
											</span>
											<div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary/70"
													style={{ width: `${bucket.percent}%` }}
												/>
											</div>
											<span className="w-12 shrink-0 text-right text-xs tabular-nums">
												{bucket.count} · {bucket.percent}%
											</span>
										</div>
									))}
								</div>
							</>
						) : (
							<div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2">
								{item.words.map((word) => {
									const scale = word.count / maxWordCount;
									return (
										<span
											className={cn(
												"leading-none",
												scale > 0.66
													? "font-bold text-primary"
													: scale > 0.33
														? "font-semibold text-foreground"
														: "text-muted-foreground",
											)}
											key={word.word}
											style={{ fontSize: `${0.8 + scale * 1.1}rem` }}
											title={`${word.count} mention${word.count === 1 ? "" : "s"}`}
										>
											{word.word}
										</span>
									);
								})}
							</div>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}
