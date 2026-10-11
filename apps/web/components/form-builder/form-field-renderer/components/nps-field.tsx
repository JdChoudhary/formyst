import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";
import { useCallback, useRef } from "react";

function getScoreColor(score: number): string {
  if (score <= 6) return "border-red-200 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 data-[active=true]:border-red-500 data-[active=true]:bg-red-500 data-[active=true]:text-white";
  if (score <= 8) return "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500 data-[active=true]:text-white";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-500 data-[active=true]:text-white";
}

function getCategoryLabel(score: number | null): { text: string; color: string } {
  if (score === null) return { text: "", color: "" };
  if (score >= 9) return { text: "Promoter", color: "text-emerald-600" };
  if (score >= 7) return { text: "Passive", color: "text-amber-600" };
  return { text: "Detractor", color: "text-red-600" };
}

export function NpsField({ field, value, onChange, disabled, fieldRef }: BaseFieldProps) {
  const settings = (field as any).settings ?? {};
  const labels = settings.labels ?? { left: "Not likely", right: "Extremely likely" };
  const scores = Array.from({ length: 11 }, (_, i) => i);
  const selected = typeof value === "number" ? value : null;
  const category = getCategoryLabel(selected);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      const current = typeof selected === "number" ? selected : -1;
      let next = current;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        next = Math.min(10, current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        next = Math.max(0, current - 1);
      } else if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        next = parseInt(e.key, 10);
      } else {
        return;
      }
      if (next >= 0 && next !== current) {
        onChange(next);
      }
    },
    [disabled, selected, onChange],
  );

  return (
    <div ref={fieldRef} className="flex flex-col gap-3">
      <div
        className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-x-visible sm:px-0"
        ref={scrollRef}
      >
        <div
          className="flex min-w-max gap-1.5 sm:min-w-0 sm:grid sm:grid-cols-11 sm:gap-2"
          onKeyDown={handleKeyDown}
          role="radiogroup"
          aria-label="Net Promoter Score"
        >
          {scores.map((score) => {
            const active = selected === score;
            return (
              <button
                aria-checked={active}
                aria-label={`${score}`}
                className={cn(
                  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 sm:h-10 sm:w-full",
                  getScoreColor(score),
                  active && "scale-110 shadow-sm data-[active=true]:shadow-md",
                  disabled && "cursor-not-allowed opacity-50",
                )}
                data-active={active ? "true" : undefined}
                disabled={disabled}
                key={score}
                onClick={() => onChange(score)}
                role="radio"
                type="button"
              >
                {score}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{labels.left ?? "Not likely"}</span>
        <span>{labels.right ?? "Extremely likely"}</span>
      </div>

      {selected !== null && category.text && (
        <p className={cn("text-sm font-medium", category.color)}>
          {category.text}
        </p>
      )}
    </div>
  );
}
