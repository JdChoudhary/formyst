"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { BUILDER_VIEWS as VIEWS } from "./builder-views";
import type { BuilderView } from "../types";

interface BuilderViewTabsProps {
  activeView: BuilderView;
  onViewChange: (view: BuilderView) => void;
  compact?: boolean;
}

export const BuilderViewTabs: React.FC<BuilderViewTabsProps> = ({
  activeView,
  onViewChange,
  compact = false,
}) => {
  return (
    <div
      aria-label="Builder view"
      className={cn(
        "relative flex items-center rounded-lg bg-muted/50 p-0.5",
        compact ? "gap-0" : "gap-0.5",
      )}
      role="tablist"
    >
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const isActive = activeView === view.id;
        return (
          <button
            aria-selected={isActive}
            className={cn(
              "relative z-10 flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              compact ? "px-2.5 py-1.5 text-xs" : "md:px-4",
              !isActive && "text-muted-foreground hover:text-foreground/70",
            )}
            key={view.id}
            onClick={() => onViewChange(view.id)}
            role="tab"
            type="button"
          >
            {isActive && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-border/50"
                layoutId="builder-view-tab"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
            <Icon
              aria-hidden="true"
              className={cn(
                "size-3.5 transition-colors duration-150",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "transition-colors duration-150",
                isActive ? "text-foreground" : "text-muted-foreground",
                compact && "hidden sm:inline",
              )}
            >
              {view.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
