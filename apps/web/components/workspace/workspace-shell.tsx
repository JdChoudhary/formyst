"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { UserMenu } from "@/components/workspace/user-menu";

/**
 * Workspace chrome: a slim top bar with the brand and the user menu.
 *
 * Section links (Dashboard / Themes) were removed from the header — navigation
 * now lives on the dashboard itself.
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

        <div className="ml-auto flex items-center gap-2">
          <UserMenu compact />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
