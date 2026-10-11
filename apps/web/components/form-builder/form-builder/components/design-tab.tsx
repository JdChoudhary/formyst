"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Monitor,
  PanelBottom,
  PanelTop,
  Palette,
  RotateCcw,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type {
  Branding,
  BrandingPosition,
  BrandingVisibility,
  FormSchema,
  LogoSize,
  Theme,
} from "@repo/shared";
import { cn } from "@/lib/utils";
import { FormRuntimePreview } from "../../preview/form-runtime-preview";
import { IPhone15Pro } from "@/components/ui/iphone-15-pro";
import { Safari } from "@/components/ui/safari";
import {
  FORM_PRESETS,
  type FormPreset,
  getPresetsByCategory,
  PRESET_CATEGORIES,
} from "@/lib/utils/form-presets";

interface DesignTabProps {
  formSchema: FormSchema;
  onFormSettingsUpdate: (settings: Partial<FormSchema["settings"]>) => void;
  onSchemaUpdate?: (updates: Partial<FormSchema>) => void;
}

type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEFAULT_THEME: Theme = {
  colors: {
    background: "#FFFFFF",
    question: "#3D3D3D",
    answer: "#4FB0AE",
    button: "#4FB0AE",
  },
  typography: {
    fontFamily: "Inter",
    fontSize: "base",
    fontWeight: "normal",
  },
  fields: { font_size: "small", alignment: "left" },
  screens: { font_size: "small", alignment: "center" },
  layout: { maxWidth: "md", questionAlignment: "left", spacing: "normal" },
  background: { color: "#ffffff", layout: "fullscreen", brightness: 0 },
  button: { radius: "8px", style: "solid", transparent: false },
  origin: "new",
};

const COLOR_FIELDS: { key: string; label: string; path: string[] }[] = [
  { key: "background", label: "Background", path: ["colors", "background"] },
  { key: "question", label: "Question text", path: ["colors", "question"] },
  { key: "answer", label: "Answer / accent", path: ["colors", "answer"] },
  { key: "button", label: "Button", path: ["colors", "button"] },
  { key: "buttonText", label: "Button text", path: ["colors", "buttonText"] },
];

function getTheme(formSchema: FormSchema): Theme {
  const raw = formSchema.theme;
  if (!raw || typeof raw !== "object" || !("colors" in raw)) return DEFAULT_THEME;
  return raw as Theme;
}

function getNestedValue(obj: unknown, path: string[]): string {
  let current: Record<string, unknown> = obj as Record<string, unknown>;
  for (const key of path) {
    if (current == null || typeof current !== "object") return "";
    current = current[key] as Record<string, unknown>;
  }
  return typeof current === "string" ? current : "";
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  const result = { ...obj };
  let current: Record<string, unknown> = result;
  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = { ...(current[path[i]] as Record<string, unknown>) };
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
  return result;
}

const VISIBILITY_OPTIONS: { value: BrandingVisibility; label: string; hint: string }[] = [
  { value: "welcome", label: "Welcome only", hint: "Show the logo on the intro screen" },
  {
    value: "throughout",
    label: "Throughout the form",
    hint: "A small persistent header on every screen",
  },
  { value: "ending", label: "Ending only", hint: "Show the logo on the thank-you screen" },
  { value: "custom", label: "Custom", hint: "Pick individual screens" },
  {
    value: "first-step",
    label: "First step only",
    hint: "Classical multi-step: header on page one",
  },
];

const POSITION_OPTIONS: { value: BrandingPosition; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const SIZE_OPTIONS: { value: LogoSize; label: string }[] = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];

const WIDTH_OPTIONS = [
  { value: "sm", label: "Narrow", hint: "Comfortable for short forms" },
  { value: "md", label: "Balanced", hint: "A good fit for most forms" },
  { value: "lg", label: "Wide", hint: "More room for longer answers" },
  { value: "xl", label: "Extra wide", hint: "Best for large screens" },
] as const;

const SPACING_OPTIONS = [
  { value: "compact", label: "Compact", hint: "Less space between questions" },
  { value: "normal", label: "Comfortable", hint: "Recommended for most forms" },
  { value: "relaxed", label: "Relaxed", hint: "More breathing room" },
] as const;

const FONT_SIZE_OPTIONS = [
  { value: "xs", label: "Small" },
  { value: "sm", label: "Slightly small" },
  { value: "base", label: "Standard" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
] as const;

const FONT_WEIGHT_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "normal", label: "Regular" },
  { value: "medium", label: "Medium" },
  { value: "semibold", label: "Strong" },
  { value: "bold", label: "Bold" },
] as const;

const RADIUS_OPTIONS = [
  { value: "0px", label: "Square" },
  { value: "4px", label: "Soft" },
  { value: "8px", label: "Rounded" },
  { value: "12px", label: "Smooth" },
  { value: "16px", label: "Round" },
  { value: "9999px", label: "Pill" },
] as const;

function ChoiceSlider({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; hint?: string }[];
  onChange: (value: string) => void;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex] ?? options[0];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs font-medium text-primary">{selected.label}</span>
      </div>
      <Slider
        aria-label={label}
        max={options.length - 1}
        min={0}
        onValueCommitted={(values) => {
          const option = options[Math.round(values[0] ?? selectedIndex)];
          if (option) onChange(option.value);
        }}
        step={1}
        value={[selectedIndex]}
      />
      {selected.hint && <p className="text-[11px] text-muted-foreground">{selected.hint}</p>}
    </div>
  );
}

/* ─── Collapsible Section ─── */
function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40">
      <button
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">{title}</span>
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ─── Color Swatch Button ─── */
function ColorSwatch({
  color,
  isActive,
  onClick,
  className,
}: {
  color: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "size-8 shrink-0 rounded-full border-2 transition-all",
        isActive
          ? "border-primary scale-110 ring-2 ring-primary/20"
          : "border-border hover:scale-105",
        className,
      )}
      onClick={onClick}
      style={{ backgroundColor: color }}
      title={color}
      type="button"
    />
  );
}

/* ─── Device Preview Frame ─── */
function DeviceFrame({ device, children }: { device: PreviewDevice; children: React.ReactNode }) {
  const url = "https://formyst.app/f/preview";

  if (device === "mobile") {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <IPhone15Pro className="h-[min(680px,calc(100vh-200px))] w-auto">{children}</IPhone15Pro>
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div
          className="relative rounded-[2rem] bg-zinc-950 p-3 shadow-2xl shadow-black/40 ring-1 ring-zinc-800"
          style={{ height: "min(720px, calc(100vh - 200px))", width: "auto", aspectRatio: "3/4" }}
        >
          <span className="absolute top-1.5 left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-700" />
          <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] bg-white">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop — Safari chrome
  return (
    <div className="flex h-full items-center justify-center p-4">
      <Safari className="h-[min(680px,calc(100vh-200px))] w-[min(900px,80vw)]" url={url}>
        <div className="h-full w-full">{children}</div>
      </Safari>
    </div>
  );
}

/* ─── Preset Thumbnail ─── */
function PresetThumbnail({ preset, isActive }: { preset: FormPreset; isActive: boolean }) {
  const c = preset.settings.colors ?? {};
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden transition-all",
        isActive && "ring-2 ring-primary ring-offset-1",
      )}
      style={{ backgroundColor: c.background || "#fff" }}
    >
      <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2">
        <div
          className="w-10 rounded-sm"
          style={{ height: 3, backgroundColor: c.primary || "#3b82f6" }}
        />
        <div
          className="w-8 rounded-sm"
          style={{ height: 2, backgroundColor: c.border || "#e5e7eb" }}
        />
        <div
          className="w-8 rounded-sm"
          style={{ height: 2, backgroundColor: c.border || "#e5e7eb" }}
        />
        <div
          className="mt-1 rounded-sm px-2 py-0.5"
          style={{
            backgroundColor: c.primary || "#3b82f6",
            height: 4,
            width: 16,
          }}
        />
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*                     MAIN DESIGN TAB                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function DesignTab({ formSchema, onFormSettingsUpdate, onSchemaUpdate }: DesignTabProps) {
  const theme = getTheme(formSchema);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [resetKey, setResetKey] = useState(0);
  const [presetFilter, setPresetFilter] = useState<FormPreset["category"] | "all">("all");

  const branding = theme.branding ?? {};
  const experience = branding.classical;
  const logo = branding.logo;
  const formSettings = (formSchema.settings ?? {}) as Record<string, unknown>;
  const footerBranding = (formSettings.branding ?? {}) as Record<string, unknown>;
  const socialMedia = (footerBranding.socialMedia ?? {}) as Record<string, unknown>;

  const filteredPresets = useMemo(
    () => (presetFilter === "all" ? FORM_PRESETS : getPresetsByCategory(presetFilter)),
    [presetFilter],
  );

  const updateTheme = (path: string[], value: unknown) => {
    const updated = setNestedValue(theme as Record<string, unknown>, path, value) as Theme;
    if (onSchemaUpdate) {
      onSchemaUpdate({ theme: updated });
    }
  };

  const updateExperience = (patch: Partial<NonNullable<Branding["conversational"]>>) => {
    const key = "classical";
    updateTheme(["branding", key], { ...experience, ...patch });
  };

  const applyPreset = (preset: FormPreset) => {
    if (!onSchemaUpdate) return;
    const currentTheme = theme;
    const mergedTheme: Theme = {
      ...currentTheme,
      colors: { ...currentTheme.colors, ...preset.settings?.colors },
      typography: { ...currentTheme.typography, ...preset.settings?.typography },
      layout: { ...currentTheme.layout, ...preset.settings?.layout },
    };
    onSchemaUpdate({ theme: mergedTheme });
  };

  const resetTheme = () => {
    if (onSchemaUpdate) {
      onSchemaUpdate({ theme: DEFAULT_THEME });
    }
  };

  const updateFooterBranding = (updates: Record<string, unknown>) => {
    onFormSettingsUpdate({
      branding: {
        ...footerBranding,
        ...updates,
      },
    } as Partial<FormSchema["settings"]>);
  };

  /* ── Settings Panel (left side) ── */
  const settingsPanel = (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {/* Quick Presets Strip */}
        <div className="border-b border-border/40 px-4 pt-4 pb-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Presets
            </span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                presetFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setPresetFilter("all")}
              type="button"
            >
              All
            </button>
            {PRESET_CATEGORIES.map((cat) => (
              <button
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                  presetFilter === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
                key={cat.id}
                onClick={() => setPresetFilter(cat.id as FormPreset["category"])}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto pr-1">
            {filteredPresets.map((preset) => {
              const isActive =
                theme.colors?.background === preset.settings?.colors?.background &&
                theme.colors?.primary === preset.settings?.colors?.primary;
              return (
                <button
                  className="group flex flex-col gap-1"
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  title={preset.name}
                  type="button"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-md border border-border/60 transition-all group-hover:border-primary/50">
                    <PresetThumbnail isActive={isActive} preset={preset} />
                  </div>
                  <span className="truncate text-center text-[9px] leading-tight text-muted-foreground group-hover:text-foreground">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Branding ── */}
        <Section defaultOpen={true} icon={Palette} title="Branding & identity">
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-sm font-medium">Make the form feel like your brand</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Add a logo and choose where people see it. The preview updates as you make changes.
              </p>
            </div>

            {/* Logo */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium">Your logo</Label>
              {logo?.src ? (
                <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="flex min-h-10 items-center justify-center rounded-md bg-background p-2">
                    <img
                      alt={logo.alt || "Form logo"}
                      className="max-h-10 w-auto object-contain"
                      src={logo.src}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={() => updateTheme(["branding", "logo"], { ...logo, src: "" })}
                      size="sm"
                      variant="outline"
                    >
                      Change image
                    </Button>
                    <Button
                      onClick={() => updateTheme(["branding"], { ...branding, logo: undefined })}
                      size="sm"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                  <Input
                    className="font-mono text-xs"
                    onChange={(e) =>
                      updateTheme(["branding", "logo"], { ...logo, src: e.target.value })
                    }
                    placeholder="Paste an image link"
                    value={logo.src}
                  />
                </div>
              ) : (
                <Input
                  onChange={(e) =>
                    updateTheme(["branding", "logo"], {
                      enabled: true,
                      src: e.target.value,
                      alt: "",
                      size: "medium",
                    })
                  }
                  placeholder="Paste an image link (PNG, JPG, or SVG)"
                  type="url"
                />
              )}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Use a public image link. A transparent PNG or SVG usually looks best.
              </p>
            </div>

            {/* Show logo */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium">Show your logo</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Display it in the form header or on selected screens.
                </p>
              </div>
              <Switch
                checked={logo?.enabled ?? false}
                onCheckedChange={(enabled) =>
                  updateTheme(["branding", "logo"], {
                    ...(logo ?? { src: "", alt: "", size: "medium" }),
                    enabled,
                  })
                }
              />
            </div>

            {logo?.src && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Logo description</Label>
                <Input
                  aria-label="Logo description"
                  onChange={(e) =>
                    updateTheme(["branding", "logo"], {
                      ...logo,
                      alt: e.target.value,
                    })
                  }
                  placeholder="Describe the logo for screen readers"
                  value={logo.alt ?? ""}
                />
              </div>
            )}

            {/* Experience toggle */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium">Where should people see it?</Label>
              <RadioGroup
                className="flex flex-col gap-1.5"
                onValueChange={(v) => updateExperience({ visibility: v as BrandingVisibility })}
                value={experience?.visibility ?? "welcome"}
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <div className="flex items-center gap-2" key={option.value}>
                    <RadioGroupItem id={`brand-vis-${option.value}`} value={option.value} />
                    <Label className="flex-1 text-xs" htmlFor={`brand-vis-${option.value}`}>
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {experience?.visibility === "custom" && (
              <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-3">
                <Label className="text-xs font-medium">Show logo on</Label>
                {(
                  [
                    ["welcome", "Welcome screen"],
                    ["questions", "Question screens"],
                    ["ending", "Ending screen"],
                  ] as const
                ).map(([key, label]) => (
                  <div className="flex items-center justify-between gap-3" key={key}>
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <Switch
                      checked={experience.show_on?.[key] ?? false}
                      onCheckedChange={(checked) =>
                        updateExperience({
                          show_on: {
                            welcome: experience.show_on?.welcome ?? false,
                            questions: experience.show_on?.questions ?? false,
                            ending: experience.show_on?.ending ?? false,
                            [key]: checked,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Position */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium">Header alignment</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {POSITION_OPTIONS.map((option) => {
                  const isActive = (experience?.position ?? "center") === option.value;
                  return (
                    <button
                      className={cn(
                        "flex h-8 items-center justify-center gap-1 rounded-md border text-xs font-medium transition-colors",
                        isActive
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30",
                      )}
                      key={option.value}
                      onClick={() => updateExperience({ position: option.value })}
                      type="button"
                    >
                      {option.value === "left" ? "↖" : option.value === "right" ? "↗" : "↑"}{" "}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logo size */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium">Logo size</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {SIZE_OPTIONS.map((option) => {
                  const isActive = (logo?.size ?? "medium") === option.value;
                  return (
                    <button
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                        isActive
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30",
                      )}
                      key={option.value}
                      onClick={() =>
                        updateTheme(["branding", "logo"], {
                          ...(logo ?? { enabled: true, src: "", alt: "", size: "medium" }),
                          size: option.value,
                        })
                      }
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Colors and footer ── */}
        <Section defaultOpen={true} icon={Palette} title="Colors & footer">
          <div className="flex flex-col gap-3">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <Label className="w-24 shrink-0 text-xs">{field.label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                    onChange={(e) => updateTheme(field.path, e.target.value)}
                    type="color"
                    value={getNestedValue(theme, field.path) || "#000000"}
                  />
                  <Input
                    className="h-7 w-24 font-mono text-xs"
                    onChange={(e) => updateTheme(field.path, e.target.value)}
                    value={getNestedValue(theme, field.path)}
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-start gap-2">
                <PanelTop className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold">Header</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Your logo appears above the form questions based on the choices above.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <PanelBottom className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold">Footer</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Keep a small “Powered by Formyst” line or add social links below the form.
                  </p>
                </div>
              </div>
            </div>

            <Section defaultOpen={false} icon={PanelBottom} title="Footer options">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-medium">Show “Powered by Formyst”</Label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      A small attribution shown at the bottom of the form.
                    </p>
                  </div>
                  <Switch
                    checked={formSettings.show_typeform_branding !== false}
                    onCheckedChange={(show) =>
                      onFormSettingsUpdate({ show_typeform_branding: show })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-medium">Show social links</Label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Add your social profiles to the form footer.
                    </p>
                  </div>
                  <Switch
                    checked={socialMedia.enabled === true}
                    onCheckedChange={(enabled) =>
                      updateFooterBranding({
                        socialMedia: { ...socialMedia, enabled, position: "footer" },
                      })
                    }
                  />
                </div>
                {socialMedia.enabled === true && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-medium">Social profile links</Label>
                    {["instagram", "linkedin", "twitter"].map((platform) => (
                      <Input
                        aria-label={`${platform} profile link`}
                        key={platform}
                        onChange={(event) =>
                          updateFooterBranding({
                            socialMedia: {
                              ...socialMedia,
                              enabled: true,
                              position: "footer",
                              platforms: {
                                ...((socialMedia.platforms ?? {}) as Record<string, string>),
                                [platform]: event.target.value,
                              },
                            },
                          })
                        }
                        placeholder={`${platform[0].toUpperCase()}${platform.slice(1)} profile link`}
                        type="url"
                        value={
                          ((socialMedia.platforms ?? {}) as Record<string, string>)[platform] ?? ""
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </Section>
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section defaultOpen={false} icon={Type} title="Typography">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Font family</Label>
              <Select
                onValueChange={(v) => updateTheme(["typography", "fontFamily"], v)}
                value={theme.typography?.fontFamily ?? "Inter"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Inter",
                    "Roboto",
                    "Open Sans",
                    "Lato",
                    "Poppins",
                    "Montserrat",
                    "Source Sans 3",
                    "Nunito",
                    "Raleway",
                    "Work Sans",
                    "DM Sans",
                    "Plus Jakarta Sans",
                    "Outfit",
                    "Manrope",
                    "Space Grotesk",
                    "Playfair Display",
                    "Lora",
                    "Merriweather",
                  ].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Live font preview */}
              <div
                className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                style={{
                  fontFamily: `"${theme.typography?.fontFamily || "Inter"}, sans-serif`,
                  fontWeight: (theme.typography?.fontWeight as any) || "normal",
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
            <ChoiceSlider
              label="Text size"
              onChange={(value) => updateTheme(["typography", "fontSize"], value)}
              options={FONT_SIZE_OPTIONS}
              value={theme.typography?.fontSize ?? "base"}
            />
            <ChoiceSlider
              label="Text weight"
              onChange={(value) => updateTheme(["typography", "fontWeight"], value)}
              options={FONT_WEIGHT_OPTIONS}
              value={theme.typography?.fontWeight ?? "normal"}
            />
          </div>
        </Section>

        {/* ── Question ── */}
        <Section defaultOpen={false} icon={Eye} title="Question Style">
          <div className="flex flex-col gap-3">
            <ChoiceSlider
              label="Question size"
              onChange={(value) => updateTheme(["screens", "font_size"], value)}
              options={[
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ]}
              value={theme.screens?.font_size ?? "small"}
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Alignment</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) => updateTheme(["screens", "alignment"], v)}
                value={theme.screens?.alignment ?? "center"}
              >
                {(["left", "center"] as const).map((a) => (
                  <div className="flex items-center gap-1" key={a}>
                    <RadioGroupItem id={`qa-${a}`} value={a} />
                    <Label className="text-[10px]" htmlFor={`qa-${a}`}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </Section>

        {/* ── Answer ── */}
        <Section defaultOpen={false} icon={Eye} title="Answer Style">
          <div className="flex flex-col gap-3">
            <ChoiceSlider
              label="Answer size"
              onChange={(value) => updateTheme(["fields", "font_size"], value)}
              options={[
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ]}
              value={theme.fields?.font_size ?? "small"}
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Alignment</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) => updateTheme(["fields", "alignment"], v)}
                value={theme.fields?.alignment ?? "left"}
              >
                {(["left", "center"] as const).map((a) => (
                  <div className="flex items-center gap-1" key={a}>
                    <RadioGroupItem id={`aa-${a}`} value={a} />
                    <Label className="text-[10px]" htmlFor={`aa-${a}`}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </Section>

        {/* ── Layout ── */}
        <Section defaultOpen={false} icon={Monitor} title="Layout">
          <div className="flex flex-col gap-3">
            <ChoiceSlider
              label="Form width"
              onChange={(value) => updateTheme(["layout", "maxWidth"], value)}
              options={WIDTH_OPTIONS}
              value={theme.layout?.maxWidth ?? "md"}
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Question alignment</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) => updateTheme(["layout", "questionAlignment"], v)}
                value={theme.layout?.questionAlignment ?? "left"}
              >
                {(["left", "center"] as const).map((a) => (
                  <div className="flex items-center gap-1" key={a}>
                    <RadioGroupItem id={`align-${a}`} value={a} />
                    <Label className="text-[10px]" htmlFor={`align-${a}`}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <ChoiceSlider
              label="Space between questions"
              onChange={(value) => updateTheme(["layout", "spacing"], value)}
              options={SPACING_OPTIONS}
              value={theme.layout?.spacing ?? "normal"}
            />
          </div>
        </Section>

        {/* ── Button ── */}
        <Section defaultOpen={false} icon={Type} title="Button">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Style</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) => updateTheme(["button", "style"], v)}
                value={theme.button?.style ?? "solid"}
              >
                {(["solid", "outline", "ghost"] as const).map((s) => (
                  <div className="flex items-center gap-1" key={s}>
                    <RadioGroupItem id={`btn-${s}`} value={s} />
                    <Label className="text-[10px]" htmlFor={`btn-${s}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <ChoiceSlider
              label="Button shape"
              onChange={(value) => updateTheme(["button", "radius"], value)}
              options={RADIUS_OPTIONS}
              value={theme.button?.radius ?? "8px"}
            />
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Transparent</Label>
              <Switch
                checked={theme.button?.transparent ?? false}
                onCheckedChange={(v) => updateTheme(["button", "transparent"], v)}
              />
            </div>
          </div>
        </Section>

        {/* ── Background ── */}
        <Section defaultOpen={false} icon={Palette} title="Background">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Label className="w-20 shrink-0 text-xs">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                  onChange={(e) => updateTheme(["background", "color"], e.target.value)}
                  type="color"
                  value={theme.background?.color ?? "#ffffff"}
                />
                <Input
                  className="h-7 w-24 font-mono text-xs"
                  onChange={(e) => updateTheme(["background", "color"], e.target.value)}
                  value={theme.background?.color ?? "#ffffff"}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Background image</Label>
              <Input
                className="text-xs"
                onChange={(e) => updateTheme(["background", "href"], e.target.value || undefined)}
                placeholder="https://example.com/bg.jpg"
                value={theme.background?.href ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Image layout</Label>
              <Select
                onValueChange={(v) => updateTheme(["background", "layout"], v)}
                value={theme.background?.layout ?? "fullscreen"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["fullscreen", "repeat", "no-repeat"].map((l) => (
                    <SelectItem key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs font-medium">Image brightness</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round((theme.background?.brightness ?? 0) * 100)}%
                </span>
              </div>
              <Slider
                aria-label="Background image brightness"
                max={100}
                min={-100}
                onValueCommitted={(values) =>
                  updateTheme(["background", "brightness"], (values[0] ?? 0) / 100)
                }
                step={1}
                value={[Math.round((theme.background?.brightness ?? 0) * 100)]}
              />
              <p className="text-[11px] text-muted-foreground">
                Adjust the image so your questions stay easy to read.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Progress ── */}
        <Section defaultOpen={false} icon={Eye} title="Progress">
          <RadioGroup
            className="flex flex-col gap-1.5"
            onValueChange={(v) => {
              if (v === "number") {
                onFormSettingsUpdate({ show_question_number: true, show_progress_bar: false });
              } else if (v === "bar") {
                onFormSettingsUpdate({
                  show_progress_bar: true,
                  progress_bar: "proportion",
                  show_question_number: false,
                });
              } else if (v === "percentage") {
                onFormSettingsUpdate({
                  show_progress_bar: true,
                  progress_bar: "percentage",
                  show_question_number: false,
                });
              } else {
                onFormSettingsUpdate({ show_progress_bar: false, show_question_number: false });
              }
            }}
            value={
              (formSchema.settings?.show_question_number ?? true)
                ? "number"
                : formSchema.settings?.show_progress_bar
                  ? (formSchema.settings?.progress_bar ?? "proportion") === "percentage"
                    ? "percentage"
                    : "bar"
                  : "none"
            }
          >
            {[
              { value: "number", label: "Question number", hint: "1 / 5" },
              { value: "bar", label: "Progress bar", hint: "▬▬▬░░" },
              { value: "percentage", label: "Percentage", hint: "25%" },
              { value: "none", label: "None", hint: "" },
            ].map((o) => (
              <div className="flex items-center gap-2" key={o.value}>
                <RadioGroupItem id={`progress-${o.value}`} value={o.value} />
                <Label className="flex-1 text-xs" htmlFor={`progress-${o.value}`}>
                  {o.label}
                </Label>
                {o.hint && <span className="text-[10px] text-muted-foreground">{o.hint}</span>}
              </div>
            ))}
          </RadioGroup>
        </Section>

        {/* ── Behavior ── */}
        <Section defaultOpen={false} icon={Eye} title="Behavior">
          <div className="flex flex-col gap-2.5">
            {[
              { label: "Show progress bar", key: "show_progress_bar", default: true },
              { label: "Show question numbers", key: "show_question_number", default: true },
              { label: "Key hints on choices", key: "show_key_hint_on_choices", default: true },
              { label: "Hide navigation", key: "hide_navigation", default: false },
              { label: "Show branding", key: "show_typeform_branding", default: true },
              { label: "Autosave progress", key: "autosave_progress", default: true },
            ].map(({ label, key, default: def }) => (
              <div className="flex items-center justify-between" key={key}>
                <Label className="text-xs">{label}</Label>
                <Switch
                  checked={(formSchema.settings as any)?.[key] ?? def}
                  onCheckedChange={(v) => onFormSettingsUpdate({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Reset */}
        <div className="px-4 py-3">
          <Button
            className="w-full gap-1.5 text-muted-foreground"
            onClick={resetTheme}
            size="sm"
            variant="ghost"
          >
            <RotateCcw className="size-3.5" />
            Reset to default
          </Button>
        </div>
      </div>
    </ScrollArea>
  );

  /* ── Preview Panel (right side) ── */
  const previewPanel = (
    <div className="flex h-full flex-col overflow-hidden bg-muted/30">
      {/* Device toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Eye className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
          {[
            { id: "desktop" as const, label: "Desktop", icon: Monitor },
            { id: "tablet" as const, label: "Tablet", icon: Tablet },
            { id: "mobile" as const, label: "Mobile", icon: Smartphone },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = previewDevice === option.id;
            return (
              <button
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
                key={option.id}
                onClick={() => setPreviewDevice(option.id)}
                type="button"
              >
                <Icon className="size-3" />
                {option.label}
              </button>
            );
          })}
        </div>
        <Button
          className="gap-1 text-muted-foreground"
          onClick={() => setResetKey((k) => k + 1)}
          size="sm"
          variant="ghost"
        >
          <RotateCcw className="size-3" />
          <span className="text-[10px]">Restart</span>
        </Button>
      </div>

      {/* Device-framed preview */}
      <ScrollArea className="min-h-0 flex-1">
        <DeviceFrame device={previewDevice}>
          <FormRuntimePreview key={resetKey} schema={formSchema} />
        </DeviceFrame>
      </ScrollArea>
    </div>
  );

  /* ── Main split layout ──
     Stacks vertically below `lg` (settings on top, preview underneath) so the
     builder stays usable on phones instead of squeezing the preview to zero
     width behind a fixed 380px panel. */
  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      {/* Settings — full width on mobile, fixed rail on desktop */}
      <div className="h-1/2 w-full shrink-0 overflow-hidden border-b border-border/60 lg:h-full lg:w-[380px] lg:border-b-0 lg:border-r">
        {settingsPanel}
      </div>

      {/* Live preview */}
      <div className="min-h-0 min-w-0 flex-1">{previewPanel}</div>
    </div>
  );
}
