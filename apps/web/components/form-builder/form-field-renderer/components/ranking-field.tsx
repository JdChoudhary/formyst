import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";
import { getRankedOrder, getRankOptions, moveRanked } from "../utils/ranking";

export function RankingField({ field, value, onChange, disabled, fieldRef }: BaseFieldProps) {
  const options = getRankOptions(field.properties?.choices);
  const ordered = getRankedOrder(options, value);

  const move = (id: string, direction: -1 | 1) => {
    const next = moveRanked(ordered, id, direction);
    if (!next) return;
    // Commit the whole order: a previously untouched field then starts from the
    // layout shown on screen instead of the empty value the buttons cannot move.
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2" ref={fieldRef}>
      {ordered.map((optionId, index) => {
        const option = options.find((o) => o.id === optionId);
        if (!option) return null;
        return (
          <div
            className="flex items-center gap-2 rounded-lg border border-border bg-background p-3"
            key={option.id}
          >
            <GripVertical className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold">
              {index + 1}
            </span>
            <span className="flex-1 text-sm">{option.label}</span>
            <div className="flex gap-1">
              <button
                aria-label={`Move ${option.label} up`}
                className={cn(
                  "rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent",
                  disabled && "cursor-not-allowed opacity-50",
                )}
                disabled={disabled || index === 0}
                onClick={() => move(option.id, -1)}
                type="button"
              >
                ↑
              </button>
              <button
                aria-label={`Move ${option.label} down`}
                className={cn(
                  "rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent",
                  disabled && "cursor-not-allowed opacity-50",
                )}
                disabled={disabled || index === ordered.length - 1}
                onClick={() => move(option.id, 1)}
                type="button"
              >
                ↓
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
