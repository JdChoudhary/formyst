import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";

/**
 * Divider — a purely presentational horizontal rule, optionally labelled.
 * Renders no input, so it is safe in both the renderer and the builder canvas.
 */
export function DividerField({ field }: BaseFieldProps) {
  if (field.type !== "divider") return null;

  // `title` is the builder-facing name ("Divider"); `divider_text` is the
  // optional label actually drawn on the rule.
  const text = field.properties?.divider_text?.trim();
  const style = field.properties?.divider_style ?? "solid";
  const align = field.properties?.align ?? "center";

  const borderClass =
    style === "dashed" ? "border-dashed" : style === "dotted" ? "border-dotted" : "border-solid";

  const stretchRule = (
    <span aria-hidden className={cn("flex-1 border-t border-border", borderClass)} />
  );

  return (
    <section aria-label="Divider" className="flex w-full flex-col justify-center py-1" role="separator">
      {text ? (
        <div className="flex w-full items-center gap-3">
          {align !== "right" && stretchRule}
          <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {text}
          </span>
          {align !== "left" && stretchRule}
        </div>
      ) : (
        <span className="flex w-full items-center">
          <span aria-hidden className={cn("w-full border-t border-border", borderClass)} />
        </span>
      )}
    </section>
  );
}

/** The unlabelled rule used by dividers and (optionally) screen headings. */
export function DividerRule({ className }: { className?: string }) {
  return <span aria-hidden className={cn("w-full border-t border-border", className)} />;
}
