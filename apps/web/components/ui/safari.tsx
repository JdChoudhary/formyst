"use client";

import type React from "react";
import { ArrowLeft, ArrowRight, Lock, RefreshCw, Share } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafariProps {
  /** URL shown in the address bar. */
  url?: string;
  /** Content rendered inside the browser viewport (clipped + scrollable). */
  children?: React.ReactNode;
  className?: string;
  /** Height of the browser viewport. */
  contentClassName?: string;
}

/**
 * Safari browser mockup — macOS chrome with traffic-light buttons,
 * back/forward controls, an address bar and a clipped viewport. Concept from
 * the shadcn.io Safari component; the controls are decorative only.
 */
export function Safari({
  url = "https://formyst.app",
  children,
  className,
  contentClassName,
}: SafariProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-2xl shadow-black/40",
        className,
      )}
    >
      {/* Browser chrome */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-2.5">
        {/* Traffic lights */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>

        {/* Back / forward */}
        <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
          <span className="grid size-7 cursor-default place-items-center rounded-md text-zinc-400">
            <ArrowLeft className="size-3.5" />
          </span>
          <span className="grid size-7 cursor-default place-items-center rounded-md text-zinc-400">
            <ArrowRight className="size-3.5" />
          </span>
        </div>

        {/* Address bar */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-zinc-200">
          <Lock className="size-3 shrink-0 text-zinc-400" />
          <span className="truncate font-mono text-xs text-zinc-600">{url}</span>
        </div>

        {/* Refresh + share */}
        <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
          <span className="grid size-7 cursor-default place-items-center rounded-md text-zinc-500 hover:bg-zinc-200">
            <RefreshCw className="size-3.5" />
          </span>
          <span className="grid size-7 cursor-default place-items-center rounded-md text-zinc-500 hover:bg-zinc-200">
            <Share className="size-3.5" />
          </span>
        </div>
      </div>

      {/* Browser viewport */}
      <div className={cn("relative min-h-0 flex-1 overflow-hidden bg-white", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
