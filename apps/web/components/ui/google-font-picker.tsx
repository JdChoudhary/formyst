"use client"

import { CheckIcon, ChevronsUpDownIcon, Loader2Icon, SearchIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import {
  GOOGLE_FONTS,
  generateFontPreviewStyles,
  loadGoogleFont,
} from "@/lib/utils/google-fonts";

interface GoogleFontPickerProps {
  value?: string;
  onChange?: (fontFamily: string) => void;
  label?: string;
  placeholder?: string;
  showPreview?: boolean;
  className?: string;
}

const CATEGORY_ORDER = ["Sans Serif", "Serif", "Monospace"] as const;

export function GoogleFontPicker({
  value = "Inter",
  onChange,
  label,
  placeholder = "Select a Google Font...",
  showPreview = false,
  className,
}: GoogleFontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingFont, setLoadingFont] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setSearch("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return GOOGLE_FONTS;
    return GOOGLE_FONTS.filter(
      (font) =>
        font.label.toLowerCase().includes(term) ||
        font.category.toLowerCase().includes(term)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof GOOGLE_FONTS> = {};
    for (const font of filtered) {
      if (!groups[font.category]) groups[font.category] = [];
      groups[font.category].push(font);
    }
    return groups;
  }, [filtered]);

  const handleSelect = async (fontFamily: string) => {
    setOpen(false);
    onChange?.(fontFamily);
    setLoadingFont(true);
    try {
      await loadGoogleFont(fontFamily);
    } finally {
      setLoadingFont(false);
    }
  };

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span
          className="truncate text-foreground"
          style={generateFontPreviewStyles(value)}
        >
          {value || placeholder}
        </span>
        {loadingFont ? (
          <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b border-border px-2.5">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              aria-label="Search fonts"
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              value={search}
            />
          </div>

          <div
            aria-label="Font list"
            className="max-h-64 overflow-y-auto p-1"
            role="listbox"
          >
            {Object.entries(grouped).map(([category, fonts]) => (
              <div className="py-0.5" key={category}>
                <p className="px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  {category}
                </p>
                {fonts.map((font) => {
                  const active = font.value === value;
                  return (
                    <button
                      aria-selected={active}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                        active && "bg-accent text-accent-foreground"
                      )}
                      key={font.value}
                      onClick={() => handleSelect(font.value)}
                      role="option"
                      style={generateFontPreviewStyles(font.value)}
                      type="button"
                    >
                      <span className="truncate">{font.label}</span>
                      {active && <CheckIcon className="size-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No fonts found
              </p>
            )}
          </div>
        </div>
      )}

      {showPreview && value && (
        <p
          className="mt-1.5 truncate text-sm text-foreground"
          style={generateFontPreviewStyles(value)}
        >
          {value} — The quick brown fox
        </p>
      )}
    </div>
  );
}
