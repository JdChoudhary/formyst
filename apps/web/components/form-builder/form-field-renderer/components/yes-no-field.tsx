import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";
import { useCallback, useEffect } from "react";

export function YesNoField({ field, value, onChange, disabled, fieldRef }: BaseFieldProps) {
  const settings = (field as any).settings ?? {};
  const labels = settings.labels ?? { yes: "Yes", no: "No" };
  const selected: boolean | null =
    value === true || value === "yes" || value === 1 ? true : value === false || value === "no" || value === 0 ? false : null;

  const handleSelect = useCallback(
    (val: boolean) => {
      if (!disabled) onChange(val);
    },
    [disabled, onChange],
  );

  // Keyboard shortcuts: Y/N keys
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        handleSelect(true);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleSelect(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, handleSelect]);

  const options = [
    { key: true as const, label: labels.yes ?? "Yes", Icon: Check, activeColor: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-100" },
    { key: false as const, label: labels.no ?? "No", Icon: X, activeColor: "border-red-500 bg-red-50 text-red-700 shadow-red-100" },
  ];

  return (
    <div className="flex gap-3" ref={fieldRef}>
      {options.map(({ key, label, Icon, activeColor }) => {
        const active = selected === key;
        return (
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-2.5 rounded-xl border-2 px-6 py-4 text-sm font-semibold transition-all",
              "hover:scale-[1.02] active:scale-[0.98]",
              active
                ? cn(activeColor, "shadow-sm")
                : "border-border hover:border-primary/50 hover:bg-accent",
              disabled && "cursor-not-allowed opacity-50",
            )}
            disabled={disabled}
            key={String(key)}
            onClick={() => handleSelect(key)}
            type="button"
          >
            <Icon className="size-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
