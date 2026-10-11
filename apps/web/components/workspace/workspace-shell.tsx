"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, LayoutDashboard, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/workspace/user-menu";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Themes", href: "/dashboard/themes", icon: Palette, exact: true },
];

function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Workspace" className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Workspace chrome: a slim top bar with brand, section links and the user menu.
 *
 * The previous left sidebar was retired — its folders tree, recent forms and
 * themes link now live on the dashboard itself. The folder tRPC routes and the
 * `folder-tree` components are untouched and still back the dashboard section.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur-xl sm:px-4">
        <Link className="flex items-center gap-2" href="/dashboard">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <Layers className="size-4" />
          </span>
          <span className="hidden text-base font-bold tracking-tight sm:inline">Formyst</span>
        </Link>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <WorkspaceNav />

        <div className="ml-auto flex items-center gap-2">
          <UserMenu compact />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
