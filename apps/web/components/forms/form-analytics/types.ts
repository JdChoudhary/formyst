import type { FormView, FormSubmissionView } from "@repo/shared";

export interface FormAnalyticsProps {
	form: FormView;
}

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

export interface ChatInterfaceProps {
	chatMessages: ChatMessage[];
	chatStreaming: boolean;
	streamedContent: string;
	chatLoading: boolean;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
	chatSuggestions: string[];
	setChatInput: (value: string) => void;
	handleChatSend: (e: React.FormEvent) => void;
	chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
	chatInput: string;
	abortController: AbortController | null;
	handleStopGeneration: () => void;
}

export interface FilterState {
	timeRange: "all" | "today" | "week" | "month";
	completionRate: "all" | "complete" | "partial" | "empty";
}

export interface FieldAnalytics {
	label: string;
	totalResponses: number;
	completionRate: number;
	uniqueValues: number;
	mostCommonValue: string | null;
	averageLength?: number;
}

export interface ConversionFunnelStep {
	stepName: string;
	completedCount: number;
	conversionRate: number;
}

export interface FieldDropoffStat {
	fieldId: string;
	label: string;
	reached: number;
	droppedAt: number;
	dropoffRate: number;
}

export interface QuizAnalytics {
	isQuizForm: boolean;
	totalQuizSubmissions: number;
	averageScore: number;
	averagePercentage: number;
	passRate: number;
	topPerformers: Array<{
		submissionId: string;
		score: number;
		percentage: number;
	}>;
	questionAnalytics: Array<{
		fieldId: string;
		label: string;
		correctAnswers: number;
		totalAnswers: number;
		accuracyRate: number;
	}>;
}

export interface AnalyticsData {
	totalSubmissions: number;
	completionRate: number;
	recentSubmissions: FormSubmissionView[];
	mostActiveDay: [string, number] | undefined;
	lastSubmission: FormSubmissionView | null;
	avgSubmissionsPerDay: number;
	bounceRate: number;
	peakHour: [string, number] | undefined;
	fieldAnalytics: Record<string, FieldAnalytics>;
	topFields: [string, FieldAnalytics][];
	worstFields: [string, FieldAnalytics][];
	submissionTrends: Record<string, number>;
	conversionFunnel: ConversionFunnelStep[] | null;
	hourlySubmissions: Record<number, number>;
	totalFields: number;
	quizAnalytics: QuizAnalytics;
	averageTimeToFillSeconds: number | null;
	fieldDropoff: FieldDropoffStat[];
}

export interface SubmissionDetailsModalProps {
	submission: FormSubmissionView | null;
	isOpen: boolean;
	onClose: () => void;
	getFieldLabel: (fieldId: string) => string;
	formatDate: (dateString: string) => string;
	onExport?: (submission: FormSubmissionView) => void;
	form?: FormView;
}

export interface OverviewStatsProps {
	data: AnalyticsData;
}

export interface AnalyticsCardsProps {
	data: AnalyticsData;
}

export interface InfoCardsProps {
	form: FormView;
	data: AnalyticsData;
	formatDate: (dateString: string) => string;
}

export interface SubmissionsListProps {
	form: FormView;
	submissions: FormSubmissionView[];
	loading: boolean;
	refreshing: boolean;
	onRefresh: () => void;
	onExportCSV: () => void;
	onExportJSON: () => void;
	onViewSubmission: (submission: FormSubmissionView) => void;
	getFieldLabel: (fieldId: string) => string;
	formatDate: (dateString: string) => string;
}

export interface FloatingChatButtonProps {
	onClick: () => void;
}

export interface ChatModalProps {
	isOpen: boolean;
	onClose: () => void;
	isMobile: boolean;
	chatMessages: ChatMessage[];
	chatStreaming: boolean;
	streamedContent: string;
	chatLoading: boolean;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
	chatSuggestions: string[];
	setChatInput: (value: string) => void;
	handleChatSend: (e: React.FormEvent) => void;
	chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
	chatInput: string;
	abortController: AbortController | null;
	handleStopGeneration: () => void;
}
