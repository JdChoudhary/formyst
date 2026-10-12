"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  FileCheck2,
  FilePen,
  Plus,
  Search,
  Clock,
  ExternalLink,
  BarChart3,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  Command,
  Sparkles,
  Inbox,
  FileUp,
  Palette,
} from "lucide-react";
import { useGetForms } from "@/hooks/api/form";
import { useSession } from "~/lib/auth-client";
import { firstName, formatDate } from "@/lib/workspace";
import { FormActionsMenu } from "@/components/dashboard/forms-management/form-actions-menu";
import { NewFormDialog } from "@/components/dashboard/forms-management/new-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    draft: "bg-muted text-muted-foreground",
    unpublished: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    archived: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? styles.draft,
      )}
    >
      {status}
    </span>
  );
}



// ─── Main Dashboard Page ───────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();
  const { forms = [], isLoading } = useGetForms();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">("updated");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const router = useRouter();

  const user = session?.user;

  const published = forms.filter((f) => f.status === "published").length;
  const drafts = forms.filter((f) => f.status === "draft").length;

  const filteredForms = useMemo(() => {
    let result = [...forms];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.slug?.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((f) => f.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "created")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [forms, searchQuery, statusFilter, sortBy]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // ─── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {getGreeting()}, {firstName(user?.name)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Your workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and organize your forms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 text-muted-foreground sm:flex"
            onClick={() => toast.info("Search coming soon")}
          >
            <Command className="size-3.5" />
            <span className="text-xs">Search</span>
            <kbd className="ml-1 rounded border bg-muted px-1 py-0.5 text-[10px] font-medium">
              /
            </kbd>
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-9 gap-1.5"
          >
            <Plus className="size-4" />
            New form
          </Button>
        </div>
      </div>

      {/* ─── Stats ─────────────────────────────────────────── */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Total forms",
            value: forms.length,
            icon: FileText,
            hint: "in your workspace",
          },
          {
            label: "Published",
            value: published,
            icon: FileCheck2,
            hint: "live and accepting responses",
            accent: true,
          },
          {
            label: "Drafts",
            value: drafts,
            icon: FilePen,
            hint: "still being built",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-background">
                <Icon className={cn("size-5", stat.accent ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Quick Actions ─────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-3.5" />
          New form
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.info("Templates coming soon")}
        >
          <Sparkles className="size-3.5" />
          Templates
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.info("Import coming soon")}
        >
          <FileUp className="size-3.5" />
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          render={<Link href="/dashboard/themes" />}
          nativeButton={false}
        >
          <Palette className="size-3.5" />
          Themes
        </Button>
      </div>

      <Separator className="my-6" />

      {/* ─── My Forms ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My forms</h2>
          {filteredForms.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {filteredForms.length} form{filteredForms.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* ─── Toolbar ────────────────────────────────────── */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5 h-9" />
                }
              >
                <SlidersHorizontal className="size-3.5" />
                <span className="text-xs">{statusFilter === "all" ? "All status" : statusFilter}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5 h-9" />
                }
              >
                <ArrowUpDown className="size-3.5" />
                <span className="text-xs">Sort</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as typeof sortBy)}
                >
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioItem value="updated">Recently updated</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="created">Recently created</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title">Name</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden items-center rounded-lg border bg-background sm:flex">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex size-8 items-center justify-center rounded-l-lg transition-colors",
                  viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="List view"
              >
                <LayoutList className="size-3.5" />
              </button>
              <Separator orientation="vertical" className="h-4" />
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex size-8 items-center justify-center rounded-r-lg transition-colors",
                  viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Form List ──────────────────────────────────── */}
        {filteredForms.length === 0 && !isLoading ? (
          <div className="mt-6 rounded-xl border border-dashed bg-card/40 p-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="size-7 text-muted-foreground" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">
              {searchQuery || statusFilter !== "all" ? "No matching forms" : "No forms yet"}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Create your first form and start collecting responses in minutes."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Create form
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => toast.info("Templates coming soon")}
                >
                  <Sparkles className="size-4" />
                  Browse templates
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="mt-3 space-y-1.5">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/form-builder/${form.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/form-builder/${form.id}`);
                  }
                }}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-background">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{form.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDate(form.updatedAt)}
                    </span>
                  </div>
                </div>
                <StatusBadge status={form.status} />
                <div className="hidden items-center gap-1 sm:flex">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/form-builder/${form.id}`} />}
                    nativeButton={false}
                    aria-label="Edit form"
                    title="Edit form"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FilePen className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/f/${form.slug}`} />}
                    nativeButton={false}
                    aria-label="View form"
                    title="View form"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/dashboard/forms/${form.id}/analytics`} />}
                    nativeButton={false}
                    aria-label="Analytics"
                    title="View analytics"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BarChart3 className="size-4" />
                  </Button>
                </div>
                <FormActionsMenu form={form} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/form-builder/${form.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/form-builder/${form.id}`);
                  }
                }}
                className="group cursor-pointer rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-background">
                    <FileText className="size-4 text-muted-foreground" />
                  </div>
                  <FormActionsMenu form={form} />
                </div>
                <p className="mt-3 truncate text-sm font-medium">{form.title}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={form.status} />
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(form.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <NewFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
