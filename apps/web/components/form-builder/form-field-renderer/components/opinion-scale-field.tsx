import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";

export function OpinionScaleField({ field, value, onChange, disabled, fieldRef }: BaseFieldProps) {
  const settings = (field as any).settings ?? {};
  const steps = settings.steps ?? 5;
  const startAtOne = settings.startAtOne !== false;
  const labels = settings.labels ?? {};
  const values = Array.from({ length: steps }, (_, i) => i + (startAtOne ? 1 : 0));

  return (
    <div ref={fieldRef} className="flex flex-col gap-4">
      <div className="flex items-stretch gap-1 overflow-hidden rounded-lg border border-border">
        {values.map((stepValue) => {
          const active = value === stepValue;
          return (
            <button
              className={cn(
                "flex flex-1 items-center justify-center py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-accent",
                disabled && "cursor-not-allowed opacity-50",
              )}
              disabled={disabled}
              key={stepValue}
              onClick={() => onChange(stepValue)}
              type="button"
            >
              {stepValue}
            </button>
          );
        })}
      </div>
      {(labels.left || labels.right) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{labels.left}</span>
          {labels.center && <span className="text-center">{labels.center}</span>}
          <span>{labels.right}</span>
        </div>
      )}
    </div>
  );
}
