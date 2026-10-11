"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  Code,
  Eye,
  Globe,
  MoreHorizontal,
  Pencil,
  Save,
  Settings as SettingsIcon,
  Share,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BuilderViewTabs } from "./builder-view-tabs";
import type { FormBuilderHeaderProps } from "../types";

/**
 * Primary header: back + inline-editable form name | Build/Design/Logic/Settings
 * tabs | Preview / Share / Publish / Save. Save state is a subtle inline status.
 */
export const FormBuilderHeader: React.FC<FormBuilderHeaderProps> = ({
  formSchema,
  autoSaving,
  saving,
  publishing,
  isPublished,
  formId,
  builderView,
  hasUnsavedChanges,
  onViewChange,
  onTitleChange,
  onJsonView,
  onAnalytics,
  onShare,
  onSettings,
  onPublish,
  onSave,
  onPreview,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(formSchema.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const commitTitle = () => {
    setEditingTitle(false);
    const next = draftTitle.trim();
    if (next && next !== formSchema.title) {
      onTitleChange(next);
    } else {
      setDraftTitle(formSchema.title);
    }
  };

  const saveState = autoSaving || saving ? "saving" : hasUnsavedChanges ? "unsaved" : "saved";

  return (
    <header className="z-20 flex-shrink-0 border-border border-b bg-card">
      {/* ── Primary row: Back + Title | Tabs | Actions ── */}
      <div className="flex h-12 items-center gap-2 px-3 md:h-14 md:px-4">
        {/* Left: Back + Form info. Takes the free space on mobile (where the
            tabs are in the bottom nav) and stays auto-width on desktop so the
            centred tabs remain centred. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 lg:flex-none">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="Back to dashboard" asChild size="icon-xs" variant="ghost">
                  <Link href="/dashboard">
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              }
            >
              <TooltipContent side="bottom">Dashboard</TooltipContent>
            </TooltipTrigger>
          </Tooltip>

          <Separator className="hidden h-5 md:block" orientation="vertical" />

          {/* Inline-editable form name — visible on mobile (the view tabs
              live in the bottom nav there) and on desktop. */}
          <div className="flex min-w-0 items-center gap-2">
            {editingTitle ? (
              <input
                autoFocus
                className="h-7 w-40 max-w-[44vw] rounded-md border border-border bg-background px-2 text-sm font-medium text-foreground outline-none ring-2 ring-primary/30 sm:w-56 sm:max-w-[36vw]"
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  }
                  if (e.key === "Escape") {
                    setDraftTitle(formSchema.title);
                    commitTitle();
                  }
                }}
                ref={titleInputRef}
                value={draftTitle}
              />
            ) : (
              <button
                className="group flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => {
                  setDraftTitle(formSchema.title);
                  setEditingTitle(true);
                  requestAnimationFrame(() => titleInputRef.current?.focus());
                }}
                title="Click to rename"
                type="button"
              >
                <span className="max-w-[220px] truncate text-sm font-medium text-foreground">
                  {formSchema.title || "Untitled form"}
                </span>
                <Pencil className="size-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
              </button>
            )}

            {/* Subtle save status */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                aria-live="polite"
                className={cn(
                  "hidden shrink-0 items-center gap-1 text-xs transition-colors sm:flex",
                  saveState === "saving" && "text-muted-foreground",
                  saveState === "saved" && "text-emerald-500/90",
                  saveState === "unsaved" && "text-amber-500/90",
                )}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                key={saveState}
                role="status"
              >
                {saveState === "saving" && (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    <span className="whitespace-nowrap">Saving...</span>
                  </>
                )}
                {saveState === "saved" && (
                  <>
                    <Check className="size-3" />
                    <span className="whitespace-nowrap">Saved</span>
                  </>
                )}
                {saveState === "unsaved" && (
                  <span className="whitespace-nowrap">Unsaved changes</span>
                )}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Builder view tabs. Hidden below `lg` (the mobile layout at
            ≤1024px shows these in the bottom nav instead). */}
        <div className="hidden min-w-0 flex-1 justify-center overflow-hidden lg:flex">
          <BuilderViewTabs activeView={builderView} onViewChange={onViewChange} />
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {/* Overflow menu — settings, analytics, share, etc */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button aria-label="More options" size="icon-xs" variant="ghost">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52" sideOffset={5}>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onJsonView}>
                  <Code className="size-4" />
                  <span>View JSON</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!formId} onClick={onAnalytics}>
                  <BarChart3 className="size-4" />
                  <span>Analytics</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!formId} onClick={onShare}>
                  <Share className="size-4" />
                  <span>Share</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onSettings}>
                  <SettingsIcon className="size-4" />
                  <span>Form settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem render={<Link href="/ai-builder" />}>
                <Sparkles className="size-4" />
                <span>Use Kiko AI</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Preview — opens the device preview dialog */}
          {onPreview && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="Preview form"
                    onClick={onPreview}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Eye className="size-4" />
                  </Button>
                }
              >
                <TooltipContent side="bottom">Preview</TooltipContent>
              </TooltipTrigger>
            </Tooltip>
          )}

          {/* Share */}
          <Button onClick={onShare} size="sm" variant="outline" className="hidden sm:inline-flex">
            <Share className="size-3.5" />
            <span>Share</span>
          </Button>

          {/* Save split button — main action saves, the menu holds the rest */}
          <div className="flex items-center">
            <Button
              className="gap-1.5 rounded-r-none"
              disabled={saving}
              loading={saving}
              onClick={onSave}
              size="sm"
              variant={saving ? "secondary" : "default"}
            >
              {!saving && <Save className="size-3.5" />}
              <span>Save</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Save and publish options"
                    className="rounded-l-none px-2"
                    disabled={publishing}
                    size="sm"
                    variant={saving ? "secondary" : "default"}
                  />
                }
              >
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" sideOffset={6}>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={onSave}>
                    <Save className="size-4" />
                    <span>Save</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!formId || publishing} onClick={onPublish}>
                    <Globe className="size-4" />
                    <span>{isPublished ? "Unpublish" : "Publish"}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem disabled={!formId} onClick={onShare}>
                    <Share className="size-4" />
                    <span>Share</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onJsonView}>
                    <Code className="size-4" />
                    <span>View JSON</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSettings}>
                    <SettingsIcon className="size-4" />
                    <span>Form settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
