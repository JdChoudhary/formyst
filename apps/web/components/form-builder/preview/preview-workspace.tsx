"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, RotateCcw, Smartphone, Tablet, X } from "lucide-react";
import type { FormSchema } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { IPhone15Pro } from "@/components/ui/iphone-15-pro";
import { Safari } from "@/components/ui/safari";
import type { PreviewDevice } from "@/components/form-builder/form-builder/components/builder-toolbar";
import { CSSPropertiesProvider } from "@/app/forms/[id]/components/css-properties-provider";
import { FormRuntimePreview } from "./form-runtime-preview";

interface PreviewWorkspaceProps {
  open: boolean;
  onClose: () => void;
  formSchema: FormSchema;
  formId?: string;
  slug?: string | null;
  /** Controlled device (wired from the builder toolbar). Falls back to internal state. */
  device?: PreviewDevice;
  onDeviceChange?: (device: PreviewDevice) => void;
  /** Skip welcome screen in preview. */
  skipWelcome?: boolean;
  /** Highlight the currently selected field in the builder. */
  selectedFieldRef?: string | null;
}

const DEVICE_OPTIONS: {
  id: PreviewDevice;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

/**
 * Premium device-framed preview workspace. The respondent experience runs
 * inside a realistic device/browser mockup (Safari frame for desktop, a
 * tablet frame, and an iPhone 15 Pro frame for mobile) with fully isolated
 * local state — previewing never creates real submissions.
 */
export function PreviewWorkspace({
  open,
  onClose,
  formSchema,
  formId,
  slug,
  device,
  onDeviceChange,
  // Show the configured start page in the preview so branding/description there
  // can be reviewed; callers that want to jump straight to the fields pass true.
  skipWelcome = false,
  selectedFieldRef = null,
}: PreviewWorkspaceProps) {
  const [resetKey, setResetKey] = useState(0);
  const [internalDevice, setInternalDevice] = useState<PreviewDevice>("desktop");
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const activeDevice = device ?? internalDevice;
  const setActiveDevice = (next: PreviewDevice) => {
    onDeviceChange?.(next);
    setInternalDevice(next);
  };

  // FormRuntimePreview unmounts whenever the workspace closes (we return null
  // below), so every open starts with fresh local preview state. resetKey is
  // only bumped by the Restart button while the workspace is open.

  // Remember where focus was when opening, restore it on close.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const contextLabel = useMemo(() => {
    const groups = formSchema.groups ?? [];
    return groups.length > 1
      ? "Classical · Multi-Step · Preview"
      : "Classical · Single Page · Preview";
  }, [formSchema.mode, formSchema.groups]);

  const url = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://formyst.app";
    return `${origin}/f/${slug || "preview"}`;
  }, [slug]);

  if (!open) return null;

  const runtime = (
    <CSSPropertiesProvider schema={formSchema}>
      <div className="light h-full w-full">
        <FormRuntimePreview
          formId={formId}
          key={resetKey}
          onPreviewRestart={() => setResetKey((k) => k + 1)}
          schema={formSchema}
          publicExperience
          selectedFieldRef={selectedFieldRef}
          skipWelcome={skipWelcome}
        />
      </div>
    </CSSPropertiesProvider>
  );

  const frameHeightClass = "h-[min(720px,calc(100vh-150px))]";

  return (
    <div
      aria-label="Form preview workspace"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-sm"
      role="dialog"
    >
      {/* ── Toolbar ── */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-sm font-semibold text-zinc-100">Preview</span>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 sm:inline-block">
            {contextLabel}
          </span>
        </div>

        {/* Device tabs */}
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="flex items-center gap-0.5 rounded-lg bg-white/6 p-0.5 ring-1 ring-white/10">
            {" "}
            {DEVICE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = activeDevice === option.id;
              return (
                <button
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800 text-zinc-50 shadow-sm ring-1 ring-white/10"
                      : "text-zinc-400 hover:text-zinc-200",
                  )}
                  key={option.id}
                  onClick={() => setActiveDevice(option.id)}
                  type="button"
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            className="gap-1.5 text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
            onClick={() => setResetKey((k) => k + 1)}
            size="sm"
            variant="ghost"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </Button>
          <Button
            aria-label="Close preview"
            className="text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Device area ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full items-center justify-center p-4 md:p-8">
          {activeDevice === "desktop" && (
            <Safari className={cn("w-[min(1200px,94vw)]", frameHeightClass)} url={url}>
              <div className="h-full w-full">{runtime}</div>
            </Safari>
          )}

          {activeDevice === "tablet" && (
            <div
              className="relative aspect-834/1194 rounded-[2.2rem] bg-zinc-950 p-3 shadow-2xl shadow-black/60 ring-1 ring-zinc-800"
              style={{ height: "min(1180px, calc(100vh - 150px))", width: "auto" }}
            >
              {/* Front camera */}
              <span className="absolute top-1.5 left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-700" />
              <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] bg-white">
                {runtime}
              </div>
            </div>
          )}

          {activeDevice === "mobile" && (
            <IPhone15Pro className="h-[min(844px,calc(100vh-150px))] w-auto">{runtime}</IPhone15Pro>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
