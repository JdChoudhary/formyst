"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { BUILDER_VIEWS } from "./builder-views";
import type { BuilderView } from "../types";

interface BuilderBottomNavProps {
  activeView: BuilderView;
  onViewChange: (view: BuilderView) => void;
}

/**
 * Mobile navigation for the builder. Mirrors the desktop header tabs
 * (Build / Design / Logic / Settings) as a native-style bottom tab bar so the
 * header can stay uncluttered on small screens.
 */
export const BuilderBottomNav: React.FC<BuilderBottomNavProps> = ({ activeView, onViewChange }) => {
  return (
    <nav
      aria-label="Builder sections"
      className="flex shrink-0 items-stretch border-border border-t bg-card"
    >
      {BUILDER_VIEWS.map((view) => {
        const Icon = view.icon;
        const isActive = activeView === view.id;
        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 outline-none transition-colors focus-visible:bg-muted/60",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
            key={view.id}
            onClick={() => onViewChange(view.id)}
            type="button"
          >
            {isActive && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary"
                layoutId="builder-bottom-nav-indicator"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
            <Icon className="size-5" />
            <span className="text-[11px] font-medium leading-none">{view.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
};
