"use client";

import type React from "react";
import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Clock3, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FormSubmissionView } from "@repo/shared";

interface DetailedInsightsProps {
  submissions: FormSubmissionView[];
  hourlySubmissions: Record<number, number>;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_META: Record<FormSubmissionView["status"], { label: string; dot: string; bar: string }> = {
  submitted: { label: "Completed", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  partial: { label: "Partial", dot: "bg-amber-500", bar: "bg-amber-500" },
  draft: { label: "Draft", dot: "bg-sky-500", bar: "bg-sky-500" },
  abandoned: { label: "Abandoned", dot: "bg-zinc-400", bar: "bg-zinc-400" },
  spam: { label: "Spam", dot: "bg-rose-500", bar: "bg-rose-500" },
  deleted: { label: "Deleted", dot: "bg-muted-foreground", bar: "bg-muted-foreground" },
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
};

/**
 * Richer per-form analytics: response-status mix, weekday/hour activity
 * distribution, completion quality, and a week-over-week trend. Complements
 * the summary cards and the 7-day area chart.
 */
export const DetailedInsights: React.FC<DetailedInsightsProps> = ({
  submissions,
  hourlySubmissions,
}) => {
  const {
    statusBreakdown,
    weekdayData,
    hourData,
    peakWeekday,
    peakHour,
    avgCompletion,
    avgFieldsFilled,
    avgTimeToFill,
    thisWeek,
    lastWeek,
    weekDelta,
  } = useMemo(() => {
    const total = submissions.length;
    const now = Date.now();

    // ── Status mix ─────────────────────────────────────────────
    const statusCounts = new Map<FormSubmissionView["status"], number>();
    for (const sub of submissions) {
      statusCounts.set(sub.status, (statusCounts.get(sub.status) ?? 0) + 1);
    }
    const statusBreakdown = (Object.keys(STATUS_META) as FormSubmissionView["status"][])
      .map((status) => ({
        status,
        meta: STATUS_META[status],
        count: statusCounts.get(status) ?? 0,
        percentage: total > 0 ? Math.round(((statusCounts.get(status) ?? 0) / total) * 100) : 0,
      }))
      .filter((row) => row.count > 0);

    // ── Weekday distribution ───────────────────────────────────
    const weekdayCounts = new Array(7).fill(0) as number[];
    for (const sub of submissions) {
      const day = new Date(sub.submitted_at).getDay();
      if (day >= 0 && day < 7) weekdayCounts[day] += 1;
    }
    const weekdayData = WEEKDAYS.map((label, index) => ({
      label,
      value: weekdayCounts[index],
    }));
    const peakWeekday = weekdayData.reduce<(typeof weekdayData)[number] | null>(
      (best, cur) => (cur.value > (best?.value ?? -1) ? cur : best),
      null,
    );

    // ── Hour-of-day distribution ───────────────────────────────
    const hourData = Array.from({ length: 24 }, (_, hour) => ({
      label: `${hour}`,
      value: hourlySubmissions[hour] ?? 0,
    }));
    const peakHour = hourData.reduce<(typeof hourData)[number] | null>(
      (best, cur) => (cur.value > (best?.value ?? -1) ? cur : best),
      null,
    );

    // ── Response quality ───────────────────────────────────────
    const withCompletion = submissions.filter((s) => s.completion_percentage != null);
    const avgCompletion =
      withCompletion.length > 0
        ? Math.round(
            withCompletion.reduce((sum, s) => sum + (s.completion_percentage ?? 0), 0) /
              withCompletion.length,
          )
        : 0;

    const avgFieldsFilled =
      total > 0
        ? Math.round(
            (submissions.reduce((sum, s) => sum + (s.completed_fields ?? 0), 0) / total) * 10,
          ) / 10
        : 0;

    const timedSubmissions = submissions.filter((s) => s.time_spent_seconds != null);
    const avgTimeToFill =
      timedSubmissions.length > 0
        ? Math.round(
            (timedSubmissions.reduce((sum, s) => sum + (s.time_spent_seconds ?? 0), 0) /
              timedSubmissions.length) *
              10,
          ) / 10
        : null;

    // ── Week over week ─────────────────────────────────────────
    let thisWeek = 0;
    let lastWeek = 0;
    for (const sub of submissions) {
      const age = now - new Date(sub.submitted_at).getTime();
      if (age <= WEEK_MS) thisWeek += 1;
      else if (age <= 2 * WEEK_MS) lastWeek += 1;
    }
    const weekDelta =
      lastWeek === 0
        ? thisWeek > 0
          ? 100
          : 0
        : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    return {
      statusBreakdown,
      weekdayData,
      hourData,
      peakWeekday,
      peakHour,
      avgCompletion,
      avgFieldsFilled,
      avgTimeToFill,
      thisWeek,
      lastWeek,
      weekDelta,
    };
  }, [submissions, hourlySubmissions]);

  const hasData = submissions.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Response status mix */}
        <Card className="p-4 shadow-none md:p-6">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Gauge className="size-4 text-muted-foreground" />
              Response status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {!hasData ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No responses yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {statusBreakdown.map((row) => (
                  <div className="flex items-center gap-3" key={row.status}>
                    <span className={cn("size-2.5 shrink-0 rounded-full", row.meta.dot)} />
                    <span className="w-24 shrink-0 text-sm">{row.meta.label}</span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", row.meta.bar)}
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {row.count} · {row.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion quality */}
        <Card className="p-4 shadow-none md:p-6">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="size-4 text-muted-foreground" />
              Completion quality
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 p-0 pt-5">
            <div>
              <p className="text-2xl font-bold tabular-nums">{avgCompletion}%</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Avg. completion</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{avgFieldsFilled}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Fields / response</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{formatDuration(avgTimeToFill)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Avg. time to fill</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Weekday activity */}
        <Card className="p-4 shadow-none md:p-6">
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="size-4 text-muted-foreground" />
              Activity by weekday
            </CardTitle>
            {peakWeekday && peakWeekday.value > 0 && (
              <span className="text-xs text-muted-foreground">
                Busiest: <span className="font-medium text-foreground">{peakWeekday.label}</span>
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="h-56 w-full">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={weekdayData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    content={<SimpleTooltip suffix="responses" />}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {weekdayData.map((entry) => (
                      <Cell
                        fill={
                          peakWeekday && entry.label === peakWeekday.label && entry.value > 0
                            ? "var(--primary)"
                            : "var(--primary)"
                        }
                        fillOpacity={
                          peakWeekday && entry.label === peakWeekday.label && entry.value > 0
                            ? 1
                            : 0.55
                        }
                        key={entry.label}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly activity */}
        <Card className="p-4 shadow-none md:p-6">
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock3 className="size-4 text-muted-foreground" />
              Activity by hour
            </CardTitle>
            {peakHour && peakHour.value > 0 && (
              <span className="text-xs text-muted-foreground">
                Peak: <span className="font-medium text-foreground">{peakHour.label}:00</span>
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="h-56 w-full">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={hourData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    interval={3}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    content={<SimpleTooltip suffix="responses" />}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {hourData.map((entry) => (
                      <Cell
                        fill="var(--primary)"
                        fillOpacity={
                          peakHour && entry.label === peakHour.label && entry.value > 0 ? 1 : 0.45
                        }
                        key={entry.label}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week over week */}
      <Card className="flex flex-col gap-4 p-4 shadow-none sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              weekDelta >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
            )}
          >
            {weekDelta >= 0 ? (
              <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="size-5 text-rose-600 dark:text-rose-400" />
            )}
          </span>
          <div>
            <p className="text-sm font-medium">Last 7 days</p>
            <p className="text-xs text-muted-foreground">
              Compared with the previous 7 days ({lastWeek} then, {thisWeek} now)
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{thisWeek}</p>
          <p
            className={cn(
              "text-xs font-medium",
              weekDelta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {weekDelta >= 0 ? "+" : ""}
            {weekDelta}% vs last week
          </p>
        </div>
      </Card>
    </div>
  );
};

const SimpleTooltip = ({ active, payload, label, suffix }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {payload[0].value} {suffix}
      </p>
    </div>
  );
};
