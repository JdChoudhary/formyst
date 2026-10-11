"use client";

import {
  Monitor,
  MonitorSmartphone,
  Play,
  Plus,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AddContentMenu } from "./add-content-menu";
import type { FormLayout } from "../types";
import type { FormSchema } from "@repo/shared";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_OPTIONS: {
  id: PreviewDevice;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5"
      role="group"
    >
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150",
            value === option.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground/80",
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface BuilderToolbarProps {
  formSchema: FormSchema;
  onLayoutChange: (layout: FormLayout) => void;
  onAddContent: (contentType: string) => void;
  onPreview: (device?: PreviewDevice) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Secondary toolbar directly below the header. Left: + Add content (opens the
 * searchable content menu). Center: classical layout selector. Right: device
 * preview dropdown + Preview button.
 */
export const BuilderToolbar: React.FC<BuilderToolbarProps> = ({
  formSchema,
  onLayoutChange,
  onAddContent,
  onPreview,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const layout: FormLayout =
    (formSchema.groups?.length ?? 0) > 1 ? "multi" : "single";

  const DeviceIcon = DEVICE_OPTIONS.find((d) => d.id === device)?.icon ?? MonitorSmartphone;

  return (
    <div className="flex items-center gap-2 border-border border-t px-3 py-1.5 md:gap-3">
      {/* Left: + Add content */}
      <Popover onOpenChange={setMenuOpen} open={menuOpen}>
        <PopoverTrigger
          render={
            <Button
              aria-label="Add content"
              className="h-7 gap-1.5 border-primary/30 bg-primary/[0.06] text-xs text-primary hover:bg-primary/10 hover:text-primary"
              size="sm"
              variant="outline"
            />
          }
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Add content</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-1" sideOffset={6}>
          <AddContentMenu
            formSchema={formSchema}
            onSelect={(contentType) => {
              onAddContent(contentType);
              setMenuOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Separator className="hidden h-5 md:block" orientation="vertical" />

      {/* Center: layout selector */}
      <div className="flex flex-1 items-center justify-center gap-2 md:gap-3">
        <SegmentedControl
          ariaLabel="Classical layout"
          onChange={onLayoutChange}
          options={[
            { value: "single", label: "Single page" },
            { value: "multi", label: "Multi-step" },
          ]}
          value={layout}
        />
      </div>

      {/* Right: undo/redo + device preview */}
      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Undo"
          disabled={!canUndo}
          className="h-7 text-xs"
          onClick={onUndo}
          size="icon-sm"
          title="Undo (Ctrl+Z)"
          variant="ghost"
        >
          <Undo2 className="size-3.5" />
        </Button>
        <Button
          aria-label="Redo"
          disabled={!canRedo}
          className="h-7 text-xs"
          onClick={onRedo}
          size="icon-sm"
          title="Redo (Ctrl+Shift+Z)"
          variant="ghost"
        >
          <Redo2 className="size-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="Preview device"
                className="h-7 gap-1.5 text-xs"
                size="sm"
                variant="ghost"
              >
                <DeviceIcon className="size-3.5" />
                <span className="hidden sm:inline">
                  {DEVICE_OPTIONS.find((d) => d.id === device)?.label}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={6}>
            {DEVICE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem key={option.id} onClick={() => setDevice(option.id)}>
                  <Icon className="size-4" />
                  <span>{option.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          className="h-7 gap-1.5 text-xs"
          onClick={() => onPreview(device)}
          size="sm"
          variant="secondary"
        >
          <Play className="size-3.5" />
          Preview
        </Button>
      </div>
    </div>
  );
};
