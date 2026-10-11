import {
	Activity,
	Clock,
	FileText,
	Target,
	Timer,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AnalyticsCardsProps, OverviewStatsProps } from "../types";

export const OverviewStats: React.FC<OverviewStatsProps> = ({ data }) => (
	<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-blue-500/10 p-3">
					<Users className="size-6 text-blue-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Total Submissions
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{data.totalSubmissions.toLocaleString()}
				</p>
			</CardContent>
		</Card>

		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-emerald-500/10 p-3">
					<FileText className="size-6 text-emerald-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Form Fields
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{data.totalFields}
				</p>
			</CardContent>
		</Card>

		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-purple-500/10 p-3">
					<TrendingUp className="size-6 text-purple-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Completion Rate
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{data.completionRate}%
				</p>
			</CardContent>
		</Card>

		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-orange-500/10 p-3">
					<Clock className="size-6 text-orange-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Last 30 Days
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{data.recentSubmissions.length}
				</p>
			</CardContent>
		</Card>
	</div>
);

const formatDuration = (seconds: number | null) => {
	if (seconds === null || seconds === undefined) return "N/A";
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const minutes = Math.floor(seconds / 60);
	const rest = Math.round(seconds % 60);
	return `${minutes}m ${rest}s`;
};

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ data }) => (
	<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-green-500/10 p-3">
					<Activity className="size-6 text-green-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Avg. Daily Submissions
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{data.avgSubmissionsPerDay}
				</p>
			</CardContent>
		</Card>

		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-orange-500/10 p-3">
					<Target className="size-6 text-orange-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Bounce Rate
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{data.bounceRate}%
				</p>
			</CardContent>
		</Card>

		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-blue-500/10 p-3">
					<Zap className="size-6 text-blue-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Peak Hour
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{data.peakHour ? `${data.peakHour[0]}:00` : "N/A"}
				</p>
			</CardContent>
		</Card>

		<Card className="h-fit grow gap-4 border-border bg-card p-4 shadow-none md:p-6">
			<CardHeader className="flex flex-row items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-purple-500/10 p-3">
					<Timer className="size-6 text-purple-600" />
				</div>
				<CardTitle className="font-medium text-base text-muted-foreground">
					Avg. Time to Fill
				</CardTitle>
			</CardHeader>
			<CardContent className="px-1 py-0">
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{formatDuration(data.averageTimeToFillSeconds)}
				</p>
			</CardContent>
		</Card>
	</div>
);
