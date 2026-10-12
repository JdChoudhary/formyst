import { ArrowDownRight, ArrowUpRight, FileText, Inbox, Minus, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getDashboard, requireAdmin, type AdminMetric } from "@/lib/admin/data";
import { ClientAnnouncementForm } from "./client-announcement-form";
import { ActivityChart, TopFormsChart } from "./dashboard-charts";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

/** Signed percentage with an icon, or a neutral "no activity" state. */
function MetricDelta({ metric }: { metric: AdminMetric }) {
  const hasBaseline = metric.last7 > 0 || metric.change !== 0;

  if (!hasBaseline) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <Minus aria-hidden className="size-3" />
        No activity this week
      </span>
    );
  }

  const isUp = metric.change >= 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  const shown = Math.abs(metric.change);

  return (
    <span
      className={cn(
        "flex items-center gap-1 font-medium text-xs tabular-nums",
        isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {isUp ? "+" : "−"}
      {shown >= 100 ? shown.toFixed(0) : shown.toFixed(1)}%
      <span className="font-normal text-muted-foreground">vs last week</span>
    </span>
  );
}

function StatCard({
  label,
  metric,
  icon: Icon,
}: {
  label: string;
  metric: AdminMetric;
  icon: typeof Users;
}) {
  return (
    <Card className="gap-0 p-4 shadow-none md:p-6">
      <CardContent className="flex flex-col gap-3 p-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-muted-foreground text-sm">{label}</span>
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Icon aria-hidden className="size-4 text-muted-foreground" />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-bold text-3xl tabular-nums">{metric.total.toLocaleString("en-US")}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <MetricDelta metric={metric} />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          <span className="font-medium text-foreground tabular-nums">
            {metric.last7.toLocaleString("en-US")}
          </span>{" "}
          in the last 7 days
        </p>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const session = await requireAdmin();
  const dashboard = await getDashboard();

  return (
    <main aria-label="Admin dashboard" className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-3xl tracking-tight">Admin dashboard</h1>
            <Badge variant="secondary">Admin</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Signed in as {session.user.email}
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/admin/ai-builder">Open AI builder</Link>}
          size="sm"
          variant="outline"
        />
      </header>

      <section
        aria-label="Platform statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatCard icon={Users} label="Users" metric={dashboard.metrics.users} />
        <StatCard icon={FileText} label="Forms" metric={dashboard.metrics.forms} />
        <StatCard icon={Inbox} label="Responses" metric={dashboard.metrics.responses} />
      </section>

      <section aria-label="Platform charts" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActivityChart activity={dashboard.activity} />
        <TopFormsChart forms={dashboard.topForms} />
      </section>

      <Card
        aria-label="Announcements management"
        className="p-4 shadow-none md:p-6"
        role="region"
      >
        <CardHeader className="p-0">
          <CardTitle>Send Announcements</CardTitle>
          <p className="text-muted-foreground text-sm">
            Email a message to one or more registered users
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="mt-4">
            <ClientAnnouncementForm />
          </div>
        </CardContent>
      </Card>

      <Card aria-label="Users management" className="p-4 shadow-none md:p-6" role="region">
        <CardHeader className="p-0">
          <CardTitle>User Management</CardTitle>
          <p className="text-muted-foreground text-sm">
            Search, manage roles, ban status, impersonate and revoke sessions
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="mt-4">
            <UsersTable />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
