"use client";

import type React from "react";
import { cn } from "@/lib/utils";

interface IPhone15ProProps {
  /** Content rendered inside the phone screen (clipped + scrollable). */
  children?: React.ReactNode;
  className?: string;
  screenClassName?: string;
}

/**
 * iPhone 15 Pro device mockup — realistic rounded body, titanium-ish bezel,
 * Dynamic Island and side buttons. Concept from the shadcn.io iPhone 15 Pro
 * component. The screen content is clipped to the display area.
 */
export function IPhone15Pro({ children, className, screenClassName }: IPhone15ProProps) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19.5] h-auto rounded-[3rem] bg-zinc-950 p-2 shadow-2xl shadow-black/60 ring-1 ring-zinc-800",
        className,
      )}
    >
      {/* Side buttons */}
      <span className="absolute top-24 -left-[2px] h-10 w-[3px] rounded-l-md bg-zinc-700" />
      <span className="absolute top-40 -left-[2px] h-14 w-[3px] rounded-l-md bg-zinc-700" />
      <span className="absolute top-48 -left-[2px] h-12 w-[3px] rounded-l-md bg-zinc-700" />
      <span className="absolute top-32 -right-[2px] h-20 w-[3px] rounded-r-md bg-zinc-700" />

      {/* Screen */}
      <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-white">
        {/* Dynamic Island */}
        <span className="absolute top-2.5 left-1/2 z-20 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-black" />

        {/* Screen content */}
        <div className={cn("h-full w-full overflow-hidden", screenClassName)}>{children}</div>
      </div>
    </div>
  );
}
