"use client";

import { CornerDownRight } from "lucide-react";
import { Fragment, useMemo } from "react";

import { cn } from "@/lib/utils";
import { answerToLabels, formatAnswer, hasAnswerValue } from "@/lib/forms/answers";
import type { FormField, FormSchema } from "@repo/shared";

/* -------------------------------------------------------------------------- */
/* Answer formatting                                                          */
/* -------------------------------------------------------------------------- */

// Stored answers are resolved against their field (choice refs → labels,
// contact objects → readable text) in `@/lib/forms/answers`, which is unit
// tested without a DOM. Re-exported here for the analytics components.
export { answerToLabels, formatAnswer, hasAnswerValue };

/* -------------------------------------------------------------------------- */
/* Recall token parsing                                                       */
/* -------------------------------------------------------------------------- */

const TOKEN_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

const KNOWN_TYPES = new Set([
	"field",
	"variable",
	"var",
	"url_param",
	"url",
	"score",
	"price",
]);

interface ParsedReference {
	type: string;
	key?: string;
}

function parseToken(inner: string): ParsedReference | null {
	const separator = inner.indexOf(":");
	if (separator === -1) {
		const value = inner.trim().toLowerCase();
		if (!value) return null;
		// `{{score}}` / `{{price}}` are keyless system references.
		if (value === "score" || value === "price") {
			return { type: value };
		}
		// Bare `{{ref}}` — treat as a field reference.
		return { type: "field", key: inner.trim() };
	}

	const type = inner.slice(0, separator).trim().toLowerCase();
	const key = inner.slice(separator + 1).trim();
	if (!KNOWN_TYPES.has(type)) return null;
	return { type, key: key || undefined };
}

interface ResolvedReference {
	/** Human label for the recalled source (usually the referenced question). */
	question: string;
	/** The referenced answer, already formatted for display. */
	answer: string;
	/** True when the referenced source has no usable answer. */
	empty: boolean;
}

function resolveReference(
	reference: ParsedReference,
	schema: FormSchema | null | undefined,
	answers: Record<string, unknown> | null | undefined,
): ResolvedReference {
	const resolveAnswer = (key: string | undefined) => {
		const value = key ? answers?.[key] : undefined;
		return {
			answer: formatAnswer(value),
			empty: !hasAnswerValue(value),
		};
	};

	switch (reference.type) {
		case "field": {
			const field = schema?.fields?.find((item) => item.ref === reference.key);
			const value = reference.key ? answers?.[reference.key] : undefined;
			return {
				question: field?.title || reference.key || "Untitled question",
				answer: formatAnswer(value, field),
				empty: !hasAnswerValue(value),
			};
		}
		case "variable":
		case "var": {
			const { answer, empty } = resolveAnswer(reference.key);
			return { question: reference.key || "Variable", answer, empty };
		}
		case "url_param":
		case "url": {
			const { answer, empty } = resolveAnswer(reference.key);
			return { question: reference.key || "URL parameter", answer, empty };
		}
		case "score": {
			const { answer, empty } = resolveAnswer("score");
			return { question: "Score", answer, empty };
		}
		case "price": {
			const { answer, empty } = resolveAnswer("price");
			return { question: "Price", answer, empty };
		}
		default:
			return { question: reference.key || "Reference", answer: "—", empty: true };
	}
}

type Segment =
	| { type: "text"; value: string }
	| ({ type: "recall"; raw: string } & ResolvedReference);

function parseSegments(
	text: string,
	schema: FormSchema | null | undefined,
	answers: Record<string, unknown> | null | undefined,
): Segment[] {
	if (!text) return [];

	const segments: Segment[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	TOKEN_REGEX.lastIndex = 0;

	while ((match = TOKEN_REGEX.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
		}

		const reference = parseToken(match[1] ?? "");
		if (reference) {
			segments.push({
				type: "recall",
				raw: match[0],
				...resolveReference(reference, schema, answers),
			});
		} else {
			// Unknown token — leave it as literal text.
			segments.push({ type: "text", value: match[0] });
		}

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		segments.push({ type: "text", value: text.slice(lastIndex) });
	}

	return segments;
}

function containsRecallToken(text: string): boolean {
	TOKEN_REGEX.lastIndex = 0;
	return TOKEN_REGEX.test(text);
}

/* -------------------------------------------------------------------------- */
/* Recall pill                                                                */
/* -------------------------------------------------------------------------- */

interface RecallPillProps {
	question: string;
	answer: string;
	empty?: boolean;
	/** When false only the referenced question is shown (aggregate views). */
	showAnswer?: boolean;
}

export function RecallPill({
	question,
	answer,
	empty,
	showAnswer = true,
}: RecallPillProps) {
	return (
		<span
			className={cn(
				"mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 align-middle text-xs leading-tight",
			)}
			title={showAnswer ? `${question}: ${answer}` : question}
		>
			<CornerDownRight
				aria-hidden="true"
				className="size-3 shrink-0 text-primary/60"
			/>
			<span className="max-w-[16rem] truncate font-medium text-foreground">
				{question}
			</span>
			{showAnswer && (
				<>
					<span className="text-muted-foreground">:</span>
					<span
						className={cn(
							"max-w-[16rem] truncate",
							empty ? "italic text-muted-foreground" : "text-foreground",
						)}
					>
						{empty ? "Not answered" : answer}
					</span>
				</>
			)}
		</span>
	);
}

/* -------------------------------------------------------------------------- */
/* Recall-aware text                                                          */
/* -------------------------------------------------------------------------- */

interface RecallTextProps {
	text: string;
	schema?: FormSchema | null;
	answers?: Record<string, unknown> | null;
	className?: string;
	/** Show the referenced answer inside the pill (default) or label only. */
	showAnswer?: boolean;
}

/**
 * Renders text that may contain recall tokens (`{{field:ref}}`).
 * Field tokens become a pill that shows the referenced question and its answer.
 */
export function RecallText({
	text,
	schema,
	answers,
	className,
	showAnswer = true,
}: RecallTextProps) {
	const segments = useMemo(
		() => parseSegments(text, schema, answers),
		[text, schema, answers],
	);

	const hasRecall = segments.some((segment) => segment.type === "recall");

	if (!hasRecall) {
		return <span className={className}>{text}</span>;
	}

	return (
		<span className={className}>
			{segments.map((segment, index) =>
				segment.type === "text" ? (
					<Fragment key={index}>{segment.value}</Fragment>
				) : (
					<RecallPill
						answer={segment.answer}
						empty={segment.empty}
						key={index}
						question={segment.question}
						showAnswer={showAnswer}
					/>
				),
			)}
		</span>
	);
}

/* -------------------------------------------------------------------------- */
/* Answer value                                                               */
/* -------------------------------------------------------------------------- */

interface AnswerValueProps {
	value: unknown;
	/** The question this value belongs to — used to resolve choice refs. */
	field?: FormField | null;
	schema?: FormSchema | null;
	answers?: Record<string, unknown> | null;
	className?: string;
}

/**
 * Renders a stored answer in a readable way:
 * - strings that contain recall tokens render pills,
 * - multi-value answers render as chips,
 * - everything else renders as readable text.
 */
export function AnswerValue({
	value,
	field,
	schema,
	answers,
	className,
}: AnswerValueProps) {
	if (!hasAnswerValue(value)) {
		return (
			<span className="text-muted-foreground text-sm italic">Not answered</span>
		);
	}

	if (typeof value === "string" && containsRecallToken(value)) {
		return (
			<RecallText
				answers={answers}
				className={cn("whitespace-pre-wrap", className)}
				schema={schema}
				text={value}
			/>
		);
	}

	if (Array.isArray(value)) {
		const flat = value.flat(2);
		const simple = flat.every(
			(item) =>
				typeof item === "string" ||
				typeof item === "number" ||
				typeof item === "boolean",
		);

		if (simple) {
			return (
				<span className={cn("flex flex-wrap items-center gap-1.5", className)}>
					{flat.map((item, index) => (
						<span
							className="inline-flex max-w-full items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs"
							key={index}
						>
							<span className="truncate">{formatAnswer(item, field)}</span>
						</span>
					))}
				</span>
			);
		}
	}

	if (typeof value === "string") {
		return (
			<span className={cn("whitespace-pre-wrap", className)}>
				{formatAnswer(value, field)}
			</span>
		);
	}

	return <span className={className}>{formatAnswer(value, field)}</span>;
}
