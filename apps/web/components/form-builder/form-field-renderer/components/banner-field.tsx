import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";

type BannerVariant = "info" | "success" | "warning" | "error";

const VARIANTS: Record<
  BannerVariant,
  { icon: typeof Info; iconBg: string; container: string; text: string }
> = {
  info: {
    icon: Info,
    iconBg: "bg-blue-500 text-white",
    container: "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40",
    text: "text-blue-900 dark:text-blue-200",
  },
  success: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-500 text-white",
    container:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40",
    text: "text-emerald-900 dark:text-emerald-200",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500 text-white",
    container: "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40",
    text: "text-amber-900 dark:text-amber-200",
  },
  error: {
    icon: XCircle,
    iconBg: "bg-red-500 text-white",
    container: "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40",
    text: "text-red-900 dark:text-red-200",
  },
};

/**
 * Banner — a callout block with an info / success / warning / error tone.
 * Display-only, so it collects no answer.
 */
export function BannerField({ field }: BaseFieldProps) {
  if (field.type !== "banner") return null;

  const variant: BannerVariant = field.properties?.banner_variant ?? "info";
  const tone = VARIANTS[variant];
  const Icon = tone.icon;
  const title = field.properties?.banner_title?.trim();
  const description = field.properties?.description?.trim();

  return (
    <section
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn("flex items-start gap-3 rounded-xl border p-4", tone.container)}
      role="status"
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          tone.iconBg,
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className={cn("font-semibold text-sm", tone.text)}>{title}</p>}
        {description && (
          <p className={cn("whitespace-pre-line text-sm", tone.text)}>{description}</p>
        )}
      </div>
    </section>
  );
}
