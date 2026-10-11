"use client";

import { useMemo, useState } from "react";

import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminActivityPoint, AdminTopForm } from "@/lib/admin/data";

/** Plain object types (not interfaces) so they satisfy the charts' `Record<string, unknown>` data constraint. */
type ActivityDatum = {
  date: string;
  users: number;
  forms: number;
  responses: number;
};

type TopFormDatum = {
  title: string;
  responses: number;
};

const ACTIVITY_CONFIG = {
  users: { label: "New users", colors: { light: ["#7c3aed"], dark: ["#a78bfa"] } },
  forms: { label: "Forms created", colors: { light: ["#0891b2"], dark: ["#22d3ee"] } },
  responses: { label: "Responses", colors: { light: ["#059669"], dark: ["#34d399"] } },
} satisfies ChartConfig;

const TOP_FORMS_CONFIG = {
  responses: { label: "Responses", colors: { light: ["#18181b"], dark: ["#fafafa"] } },
} satisfies ChartConfig;

/** Selectable chart ranges, in days. The server always sends the 90-day series. */
const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

/** `YYYY-MM-DD` → `Oct 1` for compact axis ticks. */
function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function truncate(value: string, max = 18): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Daily platform activity (new users, forms and responses) as a multi-series
 * area chart. Each series is clickable, so a chart with three overlapping
 * gradients can still be read one line at a time.
 */
export function ActivityChart({ activity }: { activity: AdminActivityPoint[] }) {
  const [range, setRange] = useState<Range>(30);

  // The server sends the longest window; shorter ranges are just a slice, so
  // switching is instant and needs no extra request.
  const visible = useMemo(
    () => (activity.length > range ? activity.slice(-range) : activity),
    [activity, range],
  );

  const data: ActivityDatum[] = useMemo(
    () =>
      visible.map((point) => ({
        date: point.date,
        users: point.users,
        forms: point.forms,
        responses: point.responses,
      })),
    [visible],
  );

  const totals = useMemo(
    () =>
      visible.reduce(
        (sum, point) => ({
          users: sum.users + point.users,
          forms: sum.forms + point.forms,
          responses: sum.responses + point.responses,
        }),
        { users: 0, forms: 0, responses: 0 },
      ),
    [visible],
  );

  return (
    <Card className="col-span-1 shadow-none lg:col-span-2">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Platform activity</CardTitle>
          <p className="text-muted-foreground text-sm">
            New users, forms and responses over the last {visible.length} days
          </p>
          <p className="text-muted-foreground text-xs">
            <span className="font-semibold text-foreground tabular-nums">
              {totals.responses.toLocaleString("en-US")}
            </span>{" "}
            responses in this period
          </p>
        </div>
        <div
          aria-label="Activity range"
          className="flex shrink-0 items-center gap-1 rounded-lg border p-0.5"
          role="group"
        >
          {RANGES.map((option) => (
            <Button
              aria-pressed={range === option}
              key={option}
              onClick={() => setRange(option)}
              size="xs"
              type="button"
              variant={range === option ? "secondary" : "ghost"}
            >
              {option}d
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[300px] w-full">
          <EvilAreaChart
            className="h-full w-full"
            config={ACTIVITY_CONFIG}
            curveType="monotone"
            data={data}
            xDataKey="date"
          >
            <EvilAreaChart.Grid />
            <EvilAreaChart.XAxis
              dataKey="date"
              minTickGap={24}
              tickFormatter={formatDay}
            />
            <EvilAreaChart.YAxis />
            <EvilAreaChart.Tooltip />
            <EvilAreaChart.Legend isClickable />
            <EvilAreaChart.Area dataKey="users" isClickable strokeVariant="solid" variant="gradient" />
            <EvilAreaChart.Area dataKey="forms" isClickable strokeVariant="solid" variant="gradient" />
            <EvilAreaChart.Area
              dataKey="responses"
              isClickable
              strokeVariant="solid"
              variant="gradient"
            />
          </EvilAreaChart>
        </div>
      </CardContent>
    </Card>
  );
}

/** The forms collecting the most responses, as a horizontal leaderboard. */
export function TopFormsChart({ forms }: { forms: AdminTopForm[] }) {
  const data: TopFormDatum[] = forms.map((form) => ({
    title: form.title?.trim() || "Untitled form",
    responses: form.responses,
  }));

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Top forms</CardTitle>
        <p className="text-muted-foreground text-sm">Ranked by total responses</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[300px] w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No responses yet
            </div>
          ) : (
            <EvilBarChart
              barCategoryGap={12}
              className="h-full w-full"
              config={TOP_FORMS_CONFIG}
              data={data}
              layout="horizontal"
              xDataKey="title"
            >
              <EvilBarChart.Grid />
              <EvilBarChart.XAxis allowDecimals={false} />
              <EvilBarChart.YAxis dataKey="title" tickFormatter={(value) => truncate(value)} width={140} />
              <EvilBarChart.Tooltip />
              <EvilBarChart.Bar dataKey="responses" radius={6} />
            </EvilBarChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
