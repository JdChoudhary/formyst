"use client";

import { useEffect } from "react";
import type { FormSchema } from "@repo/shared";
import { loadGoogleFont } from "@/lib/utils/google-fonts";
import { getFontSizeValue, getFontWeightValue } from "@/lib/utils/form-styles";

function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
  const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
  const b = Number.parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

function getBorderRadiusValues(borderRadius?: string) {
  switch (borderRadius) {
    case "none": return { base: "0px", card: "0px" };
    case "sm": return { base: "4px", card: "8px" };
    case "md": return { base: "10px", card: "16px" };
    case "lg": return { base: "16px", card: "24px" };
    case "xl": return { base: "24px", card: "32px" };
    default: return { base: "10px", card: "16px" };
  }
}

interface ThemeProviderProps {
  schema: FormSchema;
  children: React.ReactNode;
}

/**
 * Full theme provider for public forms.
 * Reads the schema's `theme` (and legacy `settings`) and sets CSS
 * custom properties so every child component inherits the design system.
 */
export function CSSPropertiesProvider({ schema, children }: ThemeProviderProps) {
  const theme = schema.theme ?? {};
  const legacy = (schema as any).settings ?? {};
  const colors = (theme as any).colors ?? legacy.colors ?? {};
  const typography = (theme as any).typography ?? legacy.typography ?? {};
  const layout = (theme as any).layout ?? legacy.layout ?? {};
  const background = (theme as any).background ?? {};
  const borderRadius = layout.borderRadius ?? "md";

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");

    const root = document.documentElement;

    // Border radius
    const radii = getBorderRadiusValues(borderRadius);
    root.style.setProperty("--radius", radii.base);
    root.style.setProperty("--card-radius", radii.card);

    // Colors
    if (colors.background) {
      root.style.setProperty("--form-background-color", colors.background);
    }
    if (colors.text) {
      root.style.setProperty("--form-text-color", colors.text);
    }
    if (colors.primary) {
      root.style.setProperty("--form-primary-color", colors.primary);
    }
    if (colors.border) {
      root.style.setProperty("--form-border-color", colors.border);
    }
    if (colors.websiteBackground) {
      const hsl = hexToHsl(colors.websiteBackground);
      root.style.setProperty("--hu-background", hsl);
      root.style.setProperty("--color-background", `hsl(${hsl})`);
    }

    // Typography
    const fontFamily = typography.fontFamily;
    if (fontFamily) {
      loadGoogleFont(fontFamily).catch(() => {});
      root.style.setProperty(
        "--form-font-family",
        `"${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
      );
    }
    if (typography.fontSize) {
      root.style.setProperty("--form-font-size", getFontSizeValue(typography.fontSize));
    }
    if (typography.fontWeight) {
      root.style.setProperty("--form-font-weight", getFontWeightValue(typography.fontWeight));
    }

    return () => {
      root.style.removeProperty("--radius");
      root.style.removeProperty("--card-radius");
      root.style.removeProperty("--form-background-color");
      root.style.removeProperty("--form-text-color");
      root.style.removeProperty("--form-primary-color");
      root.style.removeProperty("--form-border-color");
      root.style.removeProperty("--hu-background");
      root.style.removeProperty("--color-background");
      root.style.removeProperty("--form-font-family");
      root.style.removeProperty("--form-font-size");
      root.style.removeProperty("--form-font-weight");
      document.documentElement.classList.remove("light");
    };
  }, [
    borderRadius,
    colors.background,
    colors.text,
    colors.primary,
    colors.border,
    colors.websiteBackground,
    typography.fontFamily,
    typography.fontSize,
    typography.fontWeight,
  ]);

  return <>{children}</>;
}
