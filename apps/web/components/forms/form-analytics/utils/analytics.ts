import { isMultiStep } from "@repo/shared";
import type { FormView, FormSubmissionView } from "@repo/shared";
import { calculateQuizScore, getQuizStatistics, isQuizField, isQuizForm } from "@/lib/quiz/scoring";
import type {
	ConversionFunnelStep,
	FieldAnalytics,
	FieldDropoffStat,
	FilterState,
	QuizAnalytics,
} from "../types";

export const generateSessionId = () =>
	`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const formatDate = (dateString: string) =>
	new Date(dateString).toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

/** v2 keeps fields flat; groups reference them by id. */
const getSchemaFields = (form: FormView) => form.schema.fields || [];

const getSchemaBlocks = (form: FormView) => {
	const fields = getSchemaFields(form);
	// `groups` is a UI-only legacy extension — read it loosely; v2 forms just
	// get a single synthesized block.
	const groups = (form.schema as any).groups;
	if (groups?.length) {
		return groups.map((group: any) => ({
			id: group.id,
			title: group.title,
			description: group.description,
			fields: group.fieldIds
				.map((id: string) => fields.find((f) => f.ref === id))
				.filter(Boolean),
		}));
	}
	return fields.length
		? [{ id: "default", title: "Form Fields", description: "", fields }]
		: [];
};

export const getFieldLabel = (form: FormView, fieldId: string) => {
	const field = getSchemaFields(form).find((f) => f.ref === fieldId);
	return field?.title || fieldId;
};

export const getTotalFields = (form: FormView) => getSchemaFields(form).length;

export const getSubmissionCompletionRate = (
	submission: FormSubmissionView,
	totalFields: number
) => {
	if (totalFields === 0) return 0;
	const filledFields = Object.values(submission.submission_data).filter(
		(val) => val !== "" && val !== null && val !== undefined
	).length;
	return (filledFields / totalFields) * 100;
};

export const filterSubmissions = (
	submissions: FormSubmissionView[],
	searchTerm: string,
	filterState: FilterState,
	totalFields: number
) =>
	submissions.filter((submission) => {
		if (searchTerm) {
			const searchString = JSON.stringify(submission).toLowerCase();
			if (!searchString.includes(searchTerm.toLowerCase())) return false;
		}

		const submissionDate = new Date(submission.submitted_at);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (filterState.timeRange !== "all") {
			const startDate = new Date();
			startDate.setHours(0, 0, 0, 0);

			switch (filterState.timeRange) {
				case "today":
					if (submissionDate < today) return false;
					break;
				case "week":
					startDate.setDate(startDate.getDate() - 7);
					if (submissionDate < startDate) return false;
					break;
				case "month":
					startDate.setMonth(startDate.getMonth() - 1);
					if (submissionDate < startDate) return false;
					break;
			}
		}

		if (filterState.completionRate !== "all") {
			const completionRate = getSubmissionCompletionRate(
				submission,
				totalFields
			);
			switch (filterState.completionRate) {
				case "complete":
					if (completionRate < 100) return false;
					break;
				case "partial":
					if (completionRate < 1 || completionRate === 100) return false;
					break;
				case "empty":
					if (completionRate > 0) return false;
					break;
			}
		}

		return true;
	});

export const calculateFieldAnalytics = (
	form: FormView,
	submissions: FormSubmissionView[]
): Record<string, FieldAnalytics> => {
	const analytics: Record<string, FieldAnalytics> = {};
	const allPossibleFields = getSchemaFields(form);

	allPossibleFields.forEach((field) => {
		const responses = submissions
			.map((sub) => sub.submission_data[field.ref ?? ""])
			.filter((val) => val !== "" && val !== null && val !== undefined);

		const valueFrequency: Record<string, number> = {};
		let totalLength = 0;

		responses.forEach((response) => {
			let stringValue: string;

			if (field.type === "file_upload" || field.type === "signature") {
				if (Array.isArray(response)) {
					const fileCount = response.length;
					const fileTypes = response.map((file) => {
						if (typeof file === "object" && file.type) {
							return file.type.split("/")[0];
						}
						return "unknown";
					});
					const uniqueTypes = [...new Set(fileTypes)];
					stringValue = `${fileCount} file${fileCount !== 1 ? "s" : ""} (${uniqueTypes.join(", ")})`;
				} else if (typeof response === "object" && response.type) {
					stringValue = `1 file (${response.type.split("/")[0]})`;
				} else {
					stringValue = "1 file";
				}
			} else if (
				field.type === "opinion_scale" &&
				response &&
				typeof response === "object" &&
				!Array.isArray(response) &&
				typeof (response as { min?: unknown }).min === "number" &&
				typeof (response as { max?: unknown }).max === "number"
			) {
				const sliderResponse = response as { min: number; max: number };
				stringValue = `${sliderResponse.min} - ${sliderResponse.max}`;
			} else {
				stringValue = Array.isArray(response)
					? response.join(", ")
					: String(response);
			}

			valueFrequency[stringValue] = (valueFrequency[stringValue] || 0) + 1;
			totalLength += stringValue.length;
		});

		const mostCommon = Object.entries(valueFrequency).sort(
			([, a], [, b]) => b - a
		)[0];

		analytics[field.ref ?? ""] = {
			label: field.title,
			totalResponses: responses.length,
			completionRate:
				submissions.length > 0
					? Math.round((responses.length / submissions.length) * 100)
					: 0,
			uniqueValues: Object.keys(valueFrequency).length,
			mostCommonValue: mostCommon ? mostCommon[0] : null,
			averageLength:
				responses.length > 0 ? Math.round(totalLength / responses.length) : 0,
		};
	});

	return analytics;
};

export const calculateSubmissionTrends = (
	submissions: FormSubmissionView[]
): Record<string, number> => {
	const trends: Record<string, number> = {};
	const last7Days = new Date();
	last7Days.setDate(last7Days.getDate() - 7);

	for (let i = 6; i >= 0; i--) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		const dateKey = date.toLocaleDateString();
		trends[dateKey] = 0;
	}

	submissions.forEach((sub) => {
		const subDate = new Date(sub.submitted_at);
		if (subDate >= last7Days) {
			const dateKey = subDate.toLocaleDateString();
			if (trends[dateKey] !== undefined) {
				trends[dateKey]++;
			}
		}
	});

	return trends;
};

export const calculateHourlySubmissions = (
	submissions: FormSubmissionView[]
): Record<number, number> => {
	const hours: Record<number, number> = {};

	for (let i = 0; i < 24; i++) {
		hours[i] = 0;
	}

	submissions.forEach((sub) => {
		const hour = new Date(sub.submitted_at).getHours();
		hours[hour]++;
	});

	return hours;
};

const hasValue = (value: unknown): boolean =>
	value !== "" &&
	value !== null &&
	value !== undefined &&
	!(Array.isArray(value) && value.length === 0);

/**
 * Average time spent filling the form (submittedAt - startedAt), in seconds.
 * Only counts responses that were actually submitted and have a time value.
 */
export const calculateAverageTimeToFill = (
	submissions: FormSubmissionView[]
): number | null => {
	const submitted = submissions.filter(
		(sub) => sub.status === "submitted" && sub.time_spent_seconds != null
	);
	if (submitted.length === 0) return null;

	const total = submitted.reduce(
		(sum, sub) => sum + (sub.time_spent_seconds || 0),
		0
	);
	return Math.round((total / submitted.length) * 10) / 10;
};

/**
 * Field-level drop-off: which field do respondents abandon at?
 *
 * - `reached` = responses that answered this field OR any later field
 * - `droppedAt` = non-submitted responses whose last interaction was this field
 */	export const calculateFieldDropoff = (
	form: FormView,
	submissions: FormSubmissionView[]
): FieldDropoffStat[] => {
	const ordered = getSchemaFields(form);

	return ordered.map((field, idx) => {
		const laterFields = ordered.slice(idx + 1);
		let reached = 0;
		let droppedAt = 0;

		submissions.forEach((sub) => {
			const filled = hasValue(sub.submission_data[field.ref ?? ""]);
			const laterFilled = laterFields.some((f) =>
				hasValue(sub.submission_data[f.ref ?? ""])
			);

			if (filled || laterFilled) reached++;

			if (
				sub.last_field_id === field.ref &&
				sub.status !== "submitted"
			) {
				droppedAt++;
			}
		});

		return {
			fieldId: field.ref ?? "",
			label: field.title || field.ref || "",
			reached,
			droppedAt,
			dropoffRate: reached > 0 ? Math.round((droppedAt / reached) * 100) : 0,
		};
	});
};

export const calculateBounceRate = (submissions: FormSubmissionView[]): number => {
	if (submissions.length === 0) return 0;

	const bouncedSubmissions = submissions.filter((sub) => {
		const filledFields = Object.values(sub.submission_data).filter(
			(val) => val !== "" && val !== null && val !== undefined
		).length;
		return filledFields <= 1;
	});

	return Math.round((bouncedSubmissions.length / submissions.length) * 100);
};	export const calculateConversionFunnel = (
	form: FormView,
	submissions: FormSubmissionView[]
): ConversionFunnelStep[] | null => {
	const blocks = getSchemaBlocks(form);
	if (!isMultiStep(form.schema) || blocks.length <= 1) return null;

	const funnel = blocks.map((block: any) => {
		const blockFieldIds: string[] = (block.fields || []).map((f: any) => f.ref);
		const completedCount = submissions.filter((sub) =>
			blockFieldIds.some((fieldId: string) => {
				const value = sub.submission_data[fieldId];
				return value !== "" && value !== null && value !== undefined;
			})
		).length;

		return {
			stepName: block.title,
			completedCount,
			conversionRate:
				submissions.length > 0
					? Math.round((completedCount / submissions.length) * 100)
					: 0,
		};
		(" 12q ");
	});

	return funnel;
};

export const getActiveFilters = (
	searchTerm: string,
	filterState: FilterState
): string[] => {
	const filters: string[] = [];

	if (searchTerm) {
		filters.push(`Search: "${searchTerm}"`);
	}

	if (filterState.timeRange !== "all") {
		const ranges = {
			today: "Today",
			week: "Last 7 Days",
			month: "Last 30 Days",
		};
		filters.push(`Time: ${ranges[filterState.timeRange]}`);
	}

	if (filterState.completionRate !== "all") {
		const rates = {
			complete: "Complete",
			partial: "Partial",
			empty: "Empty",
		};
		filters.push(`Completion: ${rates[filterState.completionRate]}`);
	}

	return filters;
};

export const calculateQuizAnalytics = (
	form: FormView,
	submissions: FormSubmissionView[]
): QuizAnalytics => {
	const hasQuiz = isQuizForm(form.schema as any);

	if (!hasQuiz) {
		return {
			isQuizForm: false,
			totalQuizSubmissions: 0,
			averageScore: 0,
			averagePercentage: 0,
			passRate: 0,
			topPerformers: [],
			questionAnalytics: [],
		};
	}

	const allFields = getSchemaFields(form);
	const quizFields = allFields.filter((field) => {
		if (isQuizField(field)) return true;
		const f = field as any;
		if (f.quiz?.isQuizField) return true;
		if (f.settings?.isQuizField) return true;
		return false;
	});

	if (quizFields.length === 0) {
		return {
			isQuizForm: true,
			totalQuizSubmissions: 0,
			averageScore: 0,
			averagePercentage: 0,
			passRate: 0,
			topPerformers: [],
			questionAnalytics: [],
		};
	}

	const quizResults = submissions
		.map((submission) => {
			const result = calculateQuizScore(
				form.schema,
				submission.submission_data
			);
			return {
				submissionId: submission.id,
				result,
				submission,
			};
		})
		.filter((item) => item.result.answeredQuestions > 0);

	if (quizResults.length === 0) {
		return {
			isQuizForm: true,
			totalQuizSubmissions: 0,
			averageScore: 0,
			averagePercentage: 0,
			passRate: 0,
			topPerformers: [],
			questionAnalytics: [],
		};
	}

	const totalScore = quizResults.reduce(
		(sum, item) => sum + item.result.score,
		0
	);
	const totalPercentage = quizResults.reduce(
		(sum, item) => sum + item.result.percentage,
		0
	);
	const passCount = quizResults.filter((item) => item.result.passed).length;
	const passingScore = (form.schema as any).settings?.quiz?.passingScore || 70;

	const questionAnalytics = quizFields.map((field) => {
		const fieldResults = quizResults.flatMap((item) =>
			item.result.fieldResults.filter((fr) => fr.fieldId === field.ref)
		);

		const correctAnswers = fieldResults.filter((fr) => fr.isCorrect).length;
		const totalAnswers = fieldResults.length;

		return {
			fieldId: field.ref ?? "",
			label: field.title,
			correctAnswers,
			totalAnswers,
			accuracyRate:
				totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
		};
	});

	const topPerformers = quizResults
		.sort((a, b) => b.result.percentage - a.result.percentage)
		.slice(0, 5)
		.map((item) => ({
			submissionId: item.submissionId,
			score: item.result.score,
			percentage: item.result.percentage,
		}));

	return {
		isQuizForm: true,
		totalQuizSubmissions: quizResults.length,
		averageScore: Math.round((totalScore / quizResults.length) * 100) / 100,
		averagePercentage:
			Math.round((totalPercentage / quizResults.length) * 100) / 100,
		passRate: Math.round((passCount / quizResults.length) * 100 * 100) / 100,
		topPerformers,
		questionAnalytics,
	};
};
