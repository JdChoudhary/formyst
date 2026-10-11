"use client"

import { CheckIcon, Pipette } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  "#ffffff",
  "#f8fafc",
  "#f1f5f9",
  "#e2e8f0",
  "#cbd5e1",
  "#64748b",
  "#475569",
  "#334155",
  "#1e293b",
  "#0f172a",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#ca8a04",
  "#65a30d",
  "#16a34a",
  "#059669",
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#a855f7",
  "#c026d3",
  "#db2777",
  "#e11d48",
] as const;

interface EnhancedColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  label?: string;
  allowTransparent?: boolean;
  className?: string;
}

export function EnhancedColorPicker({
  value = "#000000",
  onChange,
  label,
  allowTransparent = false,
  className,
}: EnhancedColorPickerProps) {
  const [hexDraft, setHexDraft] = useState(value)
  const isTransparent = value === "transparent" || value === "";

  const commitColor = (color: string) => {
    onChange?.(color)
    setHexDraft(color)
  }

  const handleHexChange = (raw: string) => {
    setHexDraft(raw)
    const trimmed = raw.trim()
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) {
      onChange?.(trimmed)
    }
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      <div className="flex items-center gap-2">
        <div
          aria-hidden="true"
          className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border"
          style={{
            backgroundColor: isTransparent ? "transparent" : value,
            backgroundImage: isTransparent
              ? "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 10px 10px"
              : undefined,
          }}
        >
          <input
            aria-label={label ? `${label} custom color` : "Custom color"}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(e) => commitColor(e.target.value)}
            type="color"
            value={isTransparent ? "#000000" : /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          />
        </div>
        <input
          aria-label={label ? `${label} hex value` : "Hex value"}
          className="h-8 w-24 rounded-md border border-input bg-transparent px-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          onChange={(e) => handleHexChange(e.target.value)}
          spellCheck={false}
          value={hexDraft}
        />
        <span className="text-xs text-muted-foreground">HEX</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allowTransparent && (
          <button
            aria-label="Transparent"
            aria-pressed={isTransparent}
            className="flex size-5 items-center justify-center rounded-full border border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => commitColor("transparent")}
            style={{
              backgroundImage:
                "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 8px 8px",
            }}
            title="Transparent"
            type="button"
          >
            {isTransparent && <Pipette className="size-3" />}
          </button>
        )}
        {PRESET_COLORS.map((color) => {
          const active = !isTransparent && value.toLowerCase() === color.toLowerCase();
          return (
            <button
              aria-label={color}
              aria-pressed={active}
              className="flex size-5 items-center justify-center rounded-full border border-border transition-transform outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50"
              key={color}
              onClick={() => commitColor(color)}
              style={{ backgroundColor: color }}
              title={color}
              type="button"
            >
              {active && (
                <CheckIcon className="size-3 text-white drop-shadow" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
