"use client";

import { cn } from "@/lib/utils";
import type { BrandingScreen } from "./branding";
import { logoPositionClass, logoSizeClass, resolveBranding, shouldShowLogo } from "./branding";

interface FormBrandingLogoProps {
  schema: Parameters<typeof resolveBranding>[0];
  mode: "classical" | "conversational";
  /** Which screen is currently shown. */
  screen: BrandingScreen;
  /** Current page index for classical multi-step ("first-step" visibility). */
  pageIndex?: number;
  className?: string;
}

/**
 * The single source of truth for logo rendering. Both the builder preview and
 * the public renderers consume this, so branding configured in Design →
 * Branding behaves identically everywhere.
 */
export function FormBrandingLogo({
  schema,
  mode,
  screen,
  pageIndex = 0,
  className,
}: FormBrandingLogoProps) {
  const branding = resolveBranding(schema, mode);
  if (!shouldShowLogo(branding, screen, pageIndex)) return null;

  const sizeClass = logoSizeClass(branding.size);

  return (
    <div
      className={cn(
        "flex w-full shrink-0 leading-none",
        logoPositionClass(branding.position),
        className,
      )}
    >
      <img
        alt={branding.alt || "Form logo"}
        className={cn("w-auto max-w-[min(12rem,70vw)] object-contain", sizeClass)}
        src={branding.src}
      />
    </div>
  );
}
