import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";

type AspectRatio = "square" | "standard" | "wide";

const ASPECT_CLASS: Record<AspectRatio, string> = {
  square: "aspect-square",
  standard: "aspect-[4/3]",
  wide: "aspect-video",
};

function resolveAspect(value: unknown): AspectRatio {
  return value === "standard" || value === "wide" ? value : "square";
}

export function PictureChoiceField({ field, value, onChange, disabled, fieldRef }: BaseFieldProps) {
  const options = field.properties?.choices ?? [];
  const multiple = !!field.properties?.allow_multiple_selection;
  const aspectClass = ASPECT_CLASS[resolveAspect(field.properties?.picture_aspect)];
  const selected: string[] = multiple
    ? Array.isArray(value)
      ? value
      : []
    : typeof value === "string"
      ? value
        ? [value]
        : []
      : [];

  const getOptionValue = (option: { ref?: string; label: string }): string =>
    option.ref ?? option.label;

  const toggle = (id: string) => {
    if (multiple) {
      onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    } else {
      onChange(selected[0] === id ? "" : id);
    }
  };

  if (options.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-3",
        multiple ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
      ref={fieldRef}
    >
      {options.map((option) => {
        const optionValue = getOptionValue(option);
        const active = selected.includes(optionValue);
        const imageHref = option.attachment?.href;
        return (
          <button
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              "group flex flex-col items-stretch gap-2 overflow-hidden rounded-xl border-2 p-2 text-left transition-all",
              active
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-accent/50",
              disabled && "cursor-not-allowed opacity-50",
            )}
            disabled={disabled}
            key={optionValue}
            onClick={() => toggle(optionValue)}
            type="button"
          >
            <div className={cn("relative w-full overflow-hidden rounded-lg bg-accent", aspectClass)}>
              {imageHref ? (
                <img
                  alt={option.attachment?.properties?.description ?? option.label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                  src={imageHref}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-2xl text-muted-foreground">
                  🖼️
                </div>
              )}
              {active && (
                <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  ✓
                </span>
              )}
            </div>
            <span className="line-clamp-2 px-1 pb-0.5 text-sm font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
