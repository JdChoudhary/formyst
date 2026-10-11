"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  Layout,
  Loader2,
  Monitor,
  Palette,
  RotateCcw,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
} from "lucide-react";
import { useGetTheme, useUpdateTheme } from "@/hooks/api/theme";
import type {
  Branding,
  BrandingPosition,
  BrandingVisibility,
  FormSchema,
  LogoSize,
  Theme,
} from "@repo/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormRuntimePreview } from "@/components/form-builder/preview/form-runtime-preview";
import { IPhone15Pro } from "@/components/ui/iphone-15-pro";
import { Safari } from "@/components/ui/safari";
import { cn } from "@/lib/utils";
import { DEFAULT_THEME } from "@repo/shared/form/form-utils";
import {
  FORM_PRESETS,
  type FormPreset,
  getPresetsByCategory,
  PRESET_CATEGORIES,
} from "@/lib/utils/form-presets";

interface ThemeEditorProps {
  themeId: string;
  onBack: () => void;
}

type PreviewDevice = "desktop" | "tablet" | "mobile";

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

const VISIBILITY_OPTIONS: { value: BrandingVisibility; label: string }[] = [
  { value: "welcome", label: "Welcome only" },
  { value: "throughout", label: "Throughout the form" },
  { value: "ending", label: "Ending only" },
  { value: "custom", label: "Custom" },
  { value: "first-step", label: "First step only" },
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

const COLOR_FIELDS: { key: string; label: string; path: string[] }[] = [
  { key: "background", label: "Background", path: ["colors", "background"] },
  { key: "question", label: "Question text", path: ["colors", "question"] },
  { key: "answer", label: "Answer / accent", path: ["colors", "answer"] },
  { key: "button", label: "Button", path: ["colors", "button"] },
  { key: "buttonText", label: "Button text", path: ["colors", "buttonText"] },
];

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

/* ─── Preset Thumbnail ─── */
function PresetThumbnail({
  preset,
  isActive,
}: {
  preset: FormPreset;
  isActive: boolean;
}) {
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

/* ─── Device Preview Frame ─── */
function DeviceFrame({
  device,
  children,
}: {
  device: PreviewDevice;
  children: React.ReactNode;
}) {
  if (device === "mobile") {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <IPhone15Pro className="h-[min(680px,calc(100vh-200px))] w-auto">
          {children}
        </IPhone15Pro>
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div
          className="relative rounded-[2rem] bg-zinc-950 p-3 shadow-2xl shadow-black/40 ring-1 ring-zinc-800"
          style={{
            height: "min(720px, calc(100vh - 200px))",
            width: "auto",
            aspectRatio: "3/4",
          }}
        >
          <span className="absolute left-1/2 top-1.5 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-700" />
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
      <Safari
        className="h-[min(680px,calc(100vh-200px))] w-[min(900px,80vw)]"
        url="https://formyst.app/f/preview"
      >
        <div className="h-full w-full">{children}</div>
      </Safari>
    </div>
  );
}

export function ThemeEditor({ themeId, onBack }: ThemeEditorProps) {
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [resetKey, setResetKey] = useState(0);
  const [presetFilter, setPresetFilter] = useState<
    FormPreset["category"] | "all"
  >("all");

  const { data: theme, isLoading } = useGetTheme(themeId);
  const updateTheme = useUpdateTheme(themeId);

  const [localTheme, setLocalTheme] = useState<Theme>(() => {
    const config = (theme as any)?.config || DEFAULT_THEME;
    return { ...DEFAULT_THEME, ...config };
  });

  const [themeName, setThemeName] = useState(
    () => (theme as any)?.name || "Untitled Theme",
  );

  // Hydrate from fetched theme
  useEffect(() => {
    if (theme) {
      const config = (theme as any).config || DEFAULT_THEME;
      setLocalTheme({ ...DEFAULT_THEME, ...config });
      setThemeName((theme as any).name || "Untitled Theme");
    }
  }, [theme]);

  const updateThemeValue = (path: string[], value: unknown) => {
    setLocalTheme(
      (prev) =>
        setNestedValue(prev as Record<string, unknown>, path, value) as Theme,
    );
  };

  const branding = localTheme.branding ?? {};
  const experience = branding.classical;
  const logo = branding.logo;

  const filteredPresets = useMemo(
    () =>
      presetFilter === "all"
        ? FORM_PRESETS
        : getPresetsByCategory(presetFilter),
    [presetFilter],
  );

  // Build a virtual FormSchema for the preview
  const previewSchema: FormSchema = useMemo(
    () => ({
      title: "Customer Feedback",
      mode: "classic",
      theme: localTheme,
      fields: [
        {
          ref: "sample_name",
          type: "short_text",
          title: "What's your name?",
        },
        {
          ref: "sample_email",
          type: "email",
          title: "What's your email?",
        },
        {
          ref: "sample_color",
          type: "multiple_choice",
          title: "Pick a color you like",
          properties: {
            choices: [
              { ref: "c1", label: "Blue" },
              { ref: "c2", label: "Red" },
              { ref: "c3", label: "Green" },
              { ref: "c4", label: "Purple" },
            ],
          },
        },
        {
          ref: "sample_rating",
          type: "rating",
          title: "Rate your experience",
          properties: { steps: 5 },
        },
        {
          ref: "sample_yn",
          type: "yes_no",
          title: "Would you recommend us?",
        },
        {
          ref: "sample_long",
          type: "long_text",
          title: "Any additional thoughts?",
        },
      ],
      welcome_screens: [
        {
          ref: "welcome",
          title: "Welcome to our survey",
          properties: {
            description: "Please answer a few questions.",
            show_button: true,
            button_text: "Start",
          },
        },
      ],
      thankyou_screens: [
        {
          ref: "thankyou",
          title: "Thank you!",
          type: "thankyou_screen",
          properties: {
            show_button: true,
            button_text: "Submit another response",
            button_mode: "reload",
          },
        },
      ],
    }),
    [localTheme],
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateTheme.mutateAsync({
        id: themeId,
        name: themeName || "Untitled Theme",
        config: localTheme,
      });
      toast.success("Theme saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save theme",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateExperience = (
    patch: Partial<NonNullable<Branding["conversational"]>>,
  ) => {
    const key = "classical";
    updateThemeValue(["branding", key], { ...experience, ...patch });
  };

  const applyPreset = (preset: FormPreset) => {
    const mergedTheme: Theme = {
      ...localTheme,
      colors: { ...localTheme.colors, ...preset.settings?.colors },
      typography: { ...localTheme.typography, ...preset.settings?.typography },
      layout: { ...localTheme.layout, ...preset.settings?.layout },
    };
    setLocalTheme(mergedTheme);
  };

  const resetTheme = () => {
    setLocalTheme(DEFAULT_THEME);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Theme not found.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 size-4" />
          Back to themes
        </Button>
      </div>
    );
  }

  /* ── Settings Panel (left side) ── */
  const settingsPanel = (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {/* Quick Presets Strip */}
        <div className="border-b border-border/40 px-4 pb-3 pt-4">
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
                onClick={() =>
                  setPresetFilter(cat.id as FormPreset["category"])
                }
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto pr-1">
            {filteredPresets.map((preset) => {
              const isActive =
                localTheme.colors?.background ===
                  preset.settings?.colors?.background &&
                localTheme.colors?.primary === preset.settings?.colors?.primary;
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
        <Section defaultOpen={true} icon={Palette} title="Branding">
          <div className="flex flex-col gap-4">
            {/* Logo */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium">Logo</Label>
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
                      onClick={() =>
                        updateThemeValue(["branding", "logo"], {
                          ...logo,
                          src: "",
                        })
                      }
                      size="sm"
                      variant="outline"
                    >
                      Replace
                    </Button>
                    <Button
                      onClick={() =>
                        updateThemeValue(["branding"], {
                          ...branding,
                          logo: undefined,
                        })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                  <Input
                    className="font-mono text-xs"
                    onChange={(e) =>
                      updateThemeValue(["branding", "logo"], {
                        ...logo,
                        src: e.target.value,
                      })
                    }
                    placeholder="Paste image URL..."
                    value={logo.src}
                  />
                </div>
              ) : (
                <Input
                  onChange={(e) =>
                    updateThemeValue(["branding", "logo"], {
                      enabled: true,
                      src: e.target.value,
                      alt: "",
                      size: "medium",
                    })
                  }
                  placeholder="Paste logo URL..."
                  type="url"
                />
              )}
            </div>

            {/* Show logo */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Show logo</Label>
              <Switch
                checked={logo?.enabled ?? false}
                onCheckedChange={(enabled) =>
                  updateThemeValue(["branding", "logo"], {
                    ...(logo ?? { src: "", alt: "", size: "medium" }),
                    enabled,
                  })
                }
              />
            </div>

            {/* Experience toggle */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium">Logo visibility</Label>
              <RadioGroup
                className="flex flex-col gap-1.5"
                onValueChange={(v) =>
                  updateExperience({ visibility: v as BrandingVisibility })
                }
                value={experience?.visibility ?? "welcome"}
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <div className="flex items-center gap-2" key={option.value}>
                    <RadioGroupItem
                      id={`brand-vis-${option.value}`}
                      value={option.value}
                    />
                    <Label
                      className="flex-1 text-xs"
                      htmlFor={`brand-vis-${option.value}`}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Position */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium">Position</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {POSITION_OPTIONS.map((option) => {
                  const isActive =
                    (experience?.position ?? "center") === option.value;
                  return (
                    <button
                      className={cn(
                        "flex h-8 items-center justify-center gap-1 rounded-md border text-xs font-medium transition-colors",
                        isActive
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30",
                      )}
                      key={option.value}
                      onClick={() =>
                        updateExperience({ position: option.value })
                      }
                      type="button"
                    >
                      {option.value === "left"
                        ? "↖"
                        : option.value === "right"
                          ? "↗"
                          : "↑"}{" "}
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
                  const isActive =
                    (logo?.size ?? "medium") === option.value;
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
                        updateThemeValue(["branding", "logo"], {
                          ...(logo ?? {
                            enabled: true,
                            src: "",
                            alt: "",
                            size: "medium",
                          }),
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

        {/* ── Colors ── */}
        <Section defaultOpen={true} icon={Palette} title="Colors">
          <div className="flex flex-col gap-3">
            {COLOR_FIELDS.map((field) => (
              <div className="flex items-center gap-3" key={field.key}>
                <Label className="w-24 shrink-0 text-xs">{field.label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                    onChange={(e) =>
                      updateThemeValue(field.path, e.target.value)
                    }
                    type="color"
                    value={
                      getNestedValue(localTheme, field.path) || "#000000"
                    }
                  />
                  <Input
                    className="h-7 w-24 font-mono text-xs"
                    onChange={(e) =>
                      updateThemeValue(field.path, e.target.value)
                    }
                    value={getNestedValue(localTheme, field.path)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section defaultOpen={false} icon={Type} title="Typography">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Font family</Label>
              <Select
                onValueChange={(v) =>
                  updateThemeValue(["typography", "fontFamily"], v)
                }
                value={localTheme.typography?.fontFamily ?? "Inter"}
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
              <div
                className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                style={{
                  fontFamily: `"${localTheme.typography?.fontFamily || "Inter"}, sans-serif`,
                  fontWeight:
                    (localTheme.typography?.fontWeight as any) || "normal",
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Font size</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) =>
                  updateThemeValue(["typography", "fontSize"], v)
                }
                value={localTheme.typography?.fontSize ?? "base"}
              >
                {(["xs", "sm", "base", "lg", "xl"] as const).map((s) => (
                  <div className="flex items-center gap-1" key={s}>
                    <RadioGroupItem id={`font-${s}`} value={s} />
                    <Label className="text-[10px]" htmlFor={`font-${s}`}>
                      {s.toUpperCase()}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Font weight</Label>
              <Select
                onValueChange={(v) =>
                  updateThemeValue(["typography", "fontWeight"], v)
                }
                value={localTheme.typography?.fontWeight ?? "normal"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["light", "normal", "medium", "semibold", "bold"].map(
                    (w) => (
                      <SelectItem key={w} value={w}>
                        {w.charAt(0).toUpperCase() + w.slice(1)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* ── Question Style ── */}
        <Section defaultOpen={false} icon={Eye} title="Question Style">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Size</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) =>
                  updateThemeValue(["screens", "font_size"], v)
                }
                value={localTheme.screens?.font_size ?? "small"}
              >
                {(["small", "medium", "large"] as const).map((s) => (
                  <div className="flex items-center gap-1" key={s}>
                    <RadioGroupItem id={`qs-${s}`} value={s} />
                    <Label className="text-[10px]" htmlFor={`qs-${s}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Alignment</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) =>
                  updateThemeValue(["screens", "alignment"], v)
                }
                value={localTheme.screens?.alignment ?? "center"}
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

        {/* ── Answer Style ── */}
        <Section defaultOpen={false} icon={Eye} title="Answer Style">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Size</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) =>
                  updateThemeValue(["fields", "font_size"], v)
                }
                value={localTheme.fields?.font_size ?? "small"}
              >
                {(["small", "medium", "large"] as const).map((s) => (
                  <div className="flex items-center gap-1" key={s}>
                    <RadioGroupItem id={`as-${s}`} value={s} />
                    <Label className="text-[10px]" htmlFor={`as-${s}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Alignment</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) =>
                  updateThemeValue(["fields", "alignment"], v)
                }
                value={localTheme.fields?.alignment ?? "left"}
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
        <Section defaultOpen={false} icon={Layout} title="Layout">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Max width</Label>
              <Select
                onValueChange={(v) =>
                  updateThemeValue(["layout", "maxWidth"], v)
                }
                value={localTheme.layout?.maxWidth ?? "md"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["sm", "md", "lg", "xl"].map((w) => (
                    <SelectItem key={w} value={w}>
                      {w.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">
                Question alignment
              </Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) =>
                  updateThemeValue(["layout", "questionAlignment"], v)
                }
                value={localTheme.layout?.questionAlignment ?? "left"}
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
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Spacing</Label>
              <Select
                onValueChange={(v) =>
                  updateThemeValue(["layout", "spacing"], v)
                }
                value={localTheme.layout?.spacing ?? "normal"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["compact", "normal", "relaxed"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* ── Button ── */}
        <Section defaultOpen={false} icon={Type} title="Button">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Style</Label>
              <RadioGroup
                className="flex gap-3"
                onValueChange={(v) =>
                  updateThemeValue(["button", "style"], v)
                }
                value={localTheme.button?.style ?? "solid"}
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
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Border radius</Label>
              <Select
                onValueChange={(v) =>
                  updateThemeValue(["button", "radius"], v)
                }
                value={localTheme.button?.radius ?? "8px"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["0px", "4px", "8px", "12px", "16px", "9999px"].map(
                    (r) => (
                      <SelectItem key={r} value={r}>
                        {r === "9999px" ? "Full" : r}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Transparent</Label>
              <Switch
                checked={localTheme.button?.transparent ?? false}
                onCheckedChange={(v) =>
                  updateThemeValue(["button", "transparent"], v)
                }
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
                  onChange={(e) =>
                    updateThemeValue(["background", "color"], e.target.value)
                  }
                  type="color"
                  value={localTheme.background?.color ?? "#ffffff"}
                />
                <Input
                  className="h-7 w-24 font-mono text-xs"
                  onChange={(e) =>
                    updateThemeValue(["background", "color"], e.target.value)
                  }
                  value={localTheme.background?.color ?? "#ffffff"}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Background image</Label>
              <Input
                className="text-xs"
                onChange={(e) =>
                  updateThemeValue(
                    ["background", "href"],
                    e.target.value || undefined,
                  )
                }
                placeholder="https://example.com/bg.jpg"
                value={localTheme.background?.href ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Image layout</Label>
              <Select
                onValueChange={(v) =>
                  updateThemeValue(["background", "layout"], v)
                }
                value={localTheme.background?.layout ?? "fullscreen"}
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
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Eye className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Live Preview
          </span>
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
      <div className="min-h-0 flex-1 overflow-auto">
        <DeviceFrame device={previewDevice}>
          <FormRuntimePreview key={resetKey} schema={previewSchema} />
        </DeviceFrame>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="z-20 shrink-0 border-b border-border bg-card px-4 py-3 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <Button
              className="gap-2"
              onClick={onBack}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex flex-col gap-1">
              <Input
                className="h-auto border-none bg-transparent p-0 font-semibold text-xl focus-visible:ring-0 focus-visible:ring-offset-0"
                onChange={(e) => setThemeName(e.target.value)}
                value={themeName}
              />
              <div className="text-sm text-muted-foreground">
                Edit Theme
              </div>
            </div>
          </div>

          <nav aria-label="Theme actions" className="flex items-center gap-2">
            <Button
              disabled={saving}
              loading={saving}
              onClick={handleSave}
            >
              Save theme
            </Button>
          </nav>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: customization controls */}
        <div className="hidden w-[380px] shrink-0 overflow-hidden border-r border-border/60 lg:block">
          {settingsPanel}
        </div>

        {/* Right panel: live preview */}
        <div className="min-w-0 flex-1">{previewPanel}</div>
      </div>
    </div>
  );
}
