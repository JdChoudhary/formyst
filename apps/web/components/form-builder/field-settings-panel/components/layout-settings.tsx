import type React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { FormField, Layout } from "@repo/shared";
import { createFieldUpdater } from "../utils";

interface LayoutSettingsProps {
  field: FormField;
  onFieldUpdate: (field: FormField) => void;
}

const LAYOUT_TYPES: {
  value: Layout["type"];
  label: string;
}[] = [
  { value: "stack", label: "Stack" },
  { value: "split", label: "Split" },
  { value: "float", label: "Float" },
  { value: "wallpaper", label: "Wallpaper" },
];

const SCALE_OPTIONS = [0.4, 0.6, 0.8, 1] as const;

/** Tiny visual diagram of each media layout (image block in primary color). */
function LayoutDiagram({ type }: { type: Layout["type"] }) {
  const line = <span className="h-1 w-full rounded-sm bg-muted-foreground/25" />;

  return (
    <span
      aria-hidden="true"
      className="flex aspect-video w-full items-stretch justify-center gap-1 rounded-md bg-muted/50 p-1.5"
    >
      {type === "stack" && (
        <span className="flex w-full flex-col gap-1">
          <span className="h-2/3 w-full rounded-sm bg-primary/70" />
          {line}
          {line}
        </span>
      )}
      {type === "split" && (
        <span className="flex w-full flex-col gap-1">
          {line}
          {line}
          <span className="mt-auto h-2/3 w-full rounded-sm bg-primary/70" />
        </span>
      )}
      {type === "float" && (
        <span className="flex w-full flex-col gap-1">
          {line}
          <span className="flex w-full flex-row-reverse gap-1">
            <span className="h-3 w-1/3 rounded-sm bg-primary/70" />
            <span className="flex flex-1 flex-col gap-1">
              {line}
              {line}
            </span>
          </span>
        </span>
      )}
      {type === "wallpaper" && (
        <span className="relative flex w-full flex-col gap-1 overflow-hidden rounded-sm">
          <span className="absolute inset-0 bg-primary/30" />
          <span className="relative z-10 flex flex-col gap-1">
            {line}
            {line}
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * Conversational media layout — how the attached image/video sits relative to
 * the question. Uses visual previews so users don't need to know the
 * technical layout names. Only relevant when a question has media.
 */
export const LayoutSettings: React.FC<LayoutSettingsProps> = ({ field, onFieldUpdate }) => {
  const { updateField } = createFieldUpdater(field, onFieldUpdate);

  const layout = field.layout;
  const attachment = layout?.attachment;
  if (!attachment?.href) return null;

  const updateLayout = (updates: Partial<Layout>) => {
    updateField({
      layout: {
        ...(layout ?? { type: "stack" }),
        ...updates,
        attachment,
      },
    });
  };

  const removeLayout = () => {
    updateField({
      layout: {
        type: "stack",
        placement: layout?.placement,
        attachment,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label className="font-medium text-sm">Layout</Label>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_TYPES.map((t) => {
            const isActive = (layout?.type ?? "stack") === t.value;
            return (
              <button
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-all",
                  isActive
                    ? "border-primary/60 bg-primary/[0.06] ring-1 ring-primary/20"
                    : "border-border hover:border-foreground/25",
                )}
                key={t.value}
                onClick={() => updateLayout({ type: t.value })}
                type="button"
              >
                <LayoutDiagram type={t.value} />
                <span
                  className={cn(
                    "text-center text-xs font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(layout?.type ?? "stack") === "split" && (
        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm">Image position</Label>
          <RadioGroup
            className="flex gap-4"
            onValueChange={(value) => updateLayout({ placement: value as "left" | "right" })}
            value={layout?.placement ?? "left"}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="layout-left" value="left" />
              <Label className="text-sm" htmlFor="layout-left">
                Left
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="layout-right" value="right" />
              <Label className="text-sm" htmlFor="layout-right">
                Right
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label className="font-medium text-sm">Size</Label>
        <div className="flex gap-2">
          {SCALE_OPTIONS.map((s) => (
            <button
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                (attachment.scale ?? 1) === s
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={s}
              onClick={() =>
                updateLayout({
                  attachment: { ...attachment, scale: s },
                })
              }
              type="button"
            >
              {s === 0.4 ? "Small" : s === 0.6 ? "Medium" : s === 0.8 ? "Large" : "Full"}
            </button>
          ))}
        </div>
      </div>

      <button
        className="w-fit text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
        onClick={removeLayout}
        type="button"
      >
        Reset to default layout
      </button>
    </div>
  );
};
