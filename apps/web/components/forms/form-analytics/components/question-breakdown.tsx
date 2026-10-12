"use client";

import { useMemo } from "react";
import { ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { answerToLabels, hasAnswerValue } from "@/lib/forms/answers";
import { cn } from "@/lib/utils";
import type { FormField, FormView, FormSubmissionView } from "@repo/shared";
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

interface WordCount {
	word: string;
	count: number;
}

/** How a question's answers are summarised on the card. */
type Presentation = "options" | "words" | "distribution";

interface Breakdown {
	kind: Presentation;
	ref: string;
	label: string;
	answered: number;
	percentAnswered: number;
	buckets: Bucket[];
	words: WordCount[];
}

/** Questions whose answers are prose — summarised as a word cloud. */
const WORDCLOUD_TYPES = new Set(["short_text", "long_text"]);

/** Questions with a declared option list — summarised per option. */
const OPTION_TYPES = new Set([
	"checkbox",
	"dropdown",
	"legal",
	"matrix",
	"multiple_choice",
	"payment",
	"picture_choice",
	"ranking",
	"yes_no",
]);

/** Fixed-scale numeric questions that read best as a zero-filled distribution. */
const SCALE_TYPES = new Set(["nps", "opinion_scale", "rating"]);

/** Blocks that never collect an answer. */
const CONTENT_BLOCKS = new Set(["banner", "divider", "statement"]);

const STOPWORDS = new Set([
	"the", "and", "for", "are", "but", "not", "you", "your", "with", "that", "this",
	"have", "has", "had", "was", "were", "will", "would", "can", "could", "should",
	"from", "they", "them", "their", "there", "then", "than", "when", "what", "which",
	"who", "how", "why", "all", "any", "some", "very", "just", "too", "also", "into",
	"about", "would", "like", "get", "got", "its", "it's", "our", "out", "one", "two",
	"been", "being", "more", "most", "much", "many", "only", "other", "such", "own",
]);

/** Longest tail of low-count buckets we show for free-form distributions. */
const MAX_FREE_BUCKETS = 10;

/** Longest tail we show for ordered distributions (scales, dates, numbers). */
const MAX_ORDERED_BUCKETS = 12;

function buildWordCloud(answers: string[], limit = 28): WordCount[] {
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

function toBuckets(counts: Map<string, number>, answered: number): Bucket[] {
	return [...counts.entries()].map(([label, count]) => ({
		label,
		count,
		percent: answered > 0 ? Math.round((count / answered) * 100) : 0,
	}));
}

/** The inclusive 1-based range a fixed-scale question can take. */
function scaleBounds(field: FormField): { min: number; max: number } {
	if (field.type === "nps") return { min: 0, max: 10 };
	const steps = field.properties?.steps ?? 5;
	const startAtOne = field.properties?.start_at_one !== false;
	const min = startAtOne ? 1 : 0;
	return { min, max: min + steps - 1 };
}

/**
 * Distribution over a numeric answer, zero-filled across the question's own
 * scale so the chart shows the shape of the answers, not just the values that
 * happened to be picked.
 */
function numericDistribution(
	values: number[],
	field: FormField,
): { counts: Map<string, number>; ordered: boolean } {
	const counts = new Map<string, number>();
	if (SCALE_TYPES.has(field.type)) {
		const { min, max } = scaleBounds(field);
		for (let value = min; value <= max; value++) counts.set(String(value), 0);
	}
	for (const value of values) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
	return { counts, ordered: true };
}

function buildBreakdown(field: FormField, submissions: FormSubmissionView[]): Breakdown | null {
	const ref = field.ref ?? "";
	const label = field.title || ref || "Untitled question";
	if (!ref || CONTENT_BLOCKS.has(field.type)) return null;

	const total = submissions.length;
	const rawAnswers: unknown[] = [];
	for (const submission of submissions) {
		const value = submission.submission_data[ref];
		if (hasAnswerValue(value)) rawAnswers.push(value);
	}

	const answered = rawAnswers.length;
	if (answered === 0) return null;
	const percentAnswered = total > 0 ? Math.round((answered / total) * 100) : 0;

	const answerLabels = rawAnswers.flatMap((value) => answerToLabels(value, field));

	if (WORDCLOUD_TYPES.has(field.type)) {
		const words = buildWordCloud(answerLabels);
		if (words.length === 0) return null;
		return {
			kind: "words",
			ref,
			label,
			answered,
			percentAnswered,
			buckets: [],
			words,
		};
	}

	// Numeric shapes (rating / NPS / opinion scale / number) are plotted in
	// value order; everything else is plotted by frequency.
	let counts: Map<string, number>;
	let ordered = false;

	if (SCALE_TYPES.has(field.type) || field.type === "number") {
		const values = rawAnswers
			.map((value) => Number(Array.isArray(value) ? value[0] : value))
			.filter((value) => Number.isFinite(value));
		if (values.length === 0) return null;
		const distribution = numericDistribution(values, field);
		counts = distribution.counts;
		ordered = distribution.ordered;
	} else if (field.type === "date") {
		counts = new Map<string, number>();
		for (const value of answerLabels) {
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
		ordered = true;
	} else {
		counts = new Map<string, number>();
		for (const value of answerLabels) {
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
	}

	let buckets = toBuckets(counts, answered);

	if (ordered) {
		const numeric = SCALE_TYPES.has(field.type) || field.type === "number";
		buckets = buckets.sort((a, b) =>
			numeric ? Number(a.label) - Number(b.label) : a.label.localeCompare(b.label),
		);
		if (buckets.length > MAX_ORDERED_BUCKETS) {
			const kept = buckets.slice(0, MAX_ORDERED_BUCKETS);
			const rest = buckets.slice(MAX_ORDERED_BUCKETS);
			kept.push({
				label: `${rest.length} more`,
				count: rest.reduce((sum, bucket) => sum + bucket.count, 0),
				percent: rest.reduce((sum, bucket) => sum + bucket.percent, 0),
			});
			buckets = kept;
		}
	} else if (OPTION_TYPES.has(field.type)) {
		// Declared option order first, then any value the form no longer declares.
		const declared = (field.properties?.choices ?? []).map((choice) => choice.label);
		buckets = buckets
			.map((bucket) => ({ bucket, order: declared.indexOf(bucket.label) }))
			.sort((a, b) => {
				const aDeclared = a.order !== -1;
				const bDeclared = b.order !== -1;
				if (aDeclared && bDeclared) return a.order - b.order;
				if (aDeclared) return -1;
				if (bDeclared) return 1;
				return b.bucket.count - a.bucket.count;
			})
			.map(({ bucket }) => bucket);
	} else {
		buckets = buckets.sort((a, b) => b.count - a.count);
		if (buckets.length > MAX_FREE_BUCKETS) {
			const kept = buckets.slice(0, MAX_FREE_BUCKETS);
			const rest = buckets.slice(MAX_FREE_BUCKETS);
			kept.push({
				label: `${rest.length} more`,
				count: rest.reduce((sum, bucket) => sum + bucket.count, 0),
				percent: rest.reduce((sum, bucket) => sum + bucket.percent, 0),
			});
			buckets = kept;
		}
	}

	return {
		kind: OPTION_TYPES.has(field.type) ? "options" : "distribution",
		ref,
		label,
		answered,
		percentAnswered,
		buckets,
		words: [],
	};
}

const DONUT_PALETTE = [
	"hsl(var(--primary))",
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#ef4444",
	"#06b6d4",
];

/** Simple SVG donut, used when a question has few enough options. */
function DonutChart({ buckets }: { buckets: Bucket[] }) {
	const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
	if (total === 0) return null;

	const radius = 42;
	const circumference = 2 * Math.PI * radius;
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
							stroke={DONUT_PALETTE[index % DONUT_PALETTE.length]}
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
							style={{ backgroundColor: DONUT_PALETTE[index % DONUT_PALETTE.length] }}
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

/**
 * Horizontal bar chart — the distribution graph used by most questions.
 * Bars are scaled against the busiest bucket *of this question*, so each card
 * reads on its own instead of against the busiest question in the form.
 */
function BarDistribution({ buckets }: { buckets: Bucket[] }) {
	const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));

	return (
		<div className="flex flex-col gap-1.5">
			{buckets.map((bucket) => (
				<div className="flex items-center gap-2" key={bucket.label}>
					<span className="w-24 shrink-0 truncate text-muted-foreground text-xs" title={bucket.label}>
						{bucket.label}
					</span>
					<div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary/70"
							style={{ width: `${(bucket.count / maxCount) * 100}%` }}
						/>
					</div>
					<span className="w-16 shrink-0 text-right text-xs tabular-nums">
						{bucket.count} · {bucket.percent}%
					</span>
				</div>
			))}
		</div>
	);
}

const PRESENTATION_LABEL: Record<Presentation, string> = {
	options: "By option",
	words: "Word cloud",
	distribution: "Distribution",
};

export function QuestionBreakdown({ form, submissions }: QuestionBreakdownProps) {
	const breakdowns = useMemo<Breakdown[]>(
		() =>
			(form.schema.fields ?? [])
				.map((field) => buildBreakdown(field, submissions))
				.filter((item): item is Breakdown => item !== null),
		[form.schema.fields, submissions],
	);

	if (breakdowns.length === 0) return null;

	const maxWordCount = Math.max(
		1,
		...breakdowns.flatMap((item) => item.words.map((word) => word.count)),
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
							<Badge className="shrink-0 text-[11px]" variant="outline">
								{PRESENTATION_LABEL[item.kind]}
							</Badge>
						</div>

						<div className="flex items-center gap-2 text-muted-foreground text-xs tabular-nums">
							<span>
								{item.answered} answered · {item.percentAnswered}% of submissions
							</span>
						</div>

						{item.kind === "words" ? (
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
						) : (
							<>
								{item.kind === "options" &&
									item.buckets.length > 1 &&
									item.buckets.length <= 6 && <DonutChart buckets={item.buckets} />}
								<BarDistribution buckets={item.buckets} />
							</>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}
