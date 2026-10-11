"use client";

import { useEffect, useState } from "react";
import type { FormSchema } from "@repo/shared/form/form-types";
import type { FormCustomStyles } from "@/lib/utils/form-layout";
import { getFormCustomStyles } from "@/lib/utils/form-layout";
import { getFontSizeValue, getFontWeightValue } from "@/lib/utils/form-styles";
import { loadGoogleFont } from "@/lib/utils/google-fonts";

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
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

/** Visual config lives in the v2 `theme` (legacy settings kept as fallback). */
function themeOf(schema: FormSchema) {
  const theme = schema.theme ?? {};
  const legacy = (schema as any).settings ?? {};
  return {
    colors: (theme as any).colors ?? legacy.colors ?? {},
    typography: (theme as any).typography ?? legacy.typography ?? {},
  };
}

export function useFormStyling(schema: FormSchema) {
  const [customStyles, setCustomStyles] = useState<FormCustomStyles>({
    containerStyle: {},
    cardStyle: {},
    formStyle: {},
    textStyle: {},
    headingStyle: {},
  });
  const [fontLoaded, setFontLoaded] = useState(false);

  const { colors, typography } = themeOf(schema);

  useEffect(() => {
    async function loadStyles() {
      try {
        const styles = await getFormCustomStyles(schema);
        setCustomStyles(styles);

        const fontFamily = typography?.fontFamily;
        if (fontFamily && typeof window !== "undefined") {
          await loadGoogleFont(fontFamily);
          setFontLoaded(true);
        } else {
          setFontLoaded(true);
        }
      } catch (error) {
        console.warn("Failed to load form styles:", error);
        setFontLoaded(true);
      }
    }

    loadStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(schema.theme), JSON.stringify((schema as any).settings?.typography)]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    if (colors) {
      if (colors.primary) {
        root.style.setProperty("--form-primary-color", colors.primary);
      }
      if (colors.text) {
        root.style.setProperty("--form-text-color", colors.text);
      }
      if (colors.background) {
        root.style.setProperty("--form-background-color", colors.background);
      }
      if (colors.border) {
        root.style.setProperty("--form-border-color", colors.border);
      }
      if (colors.websiteBackground) {
        const hslValues = hexToHsl(colors.websiteBackground);
        root.style.setProperty("--hu-background", hslValues);

        root.style.setProperty("--color-background", `hsl(${hslValues})`);
      }
    }

    if (typography) {
      if (typography.fontFamily) {
        root.style.setProperty(
          "--form-font-family",
          `"${typography.fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        );
      }
      if (typography.fontSize) {
        root.style.setProperty("--form-font-size", getFontSizeValue(typography.fontSize as any));
      }
      if (typography.fontWeight) {
        root.style.setProperty("--form-font-weight", getFontWeightValue(typography.fontWeight as any));
      }
    }

    return () => {
      root.style.removeProperty("--form-primary-color");
      root.style.removeProperty("--form-text-color");
      root.style.removeProperty("--form-background-color");
      root.style.removeProperty("--form-border-color");
      root.style.removeProperty("--hu-background");
      root.style.removeProperty("--color-background");
      root.style.removeProperty("--form-font-family");
      root.style.removeProperty("--form-font-size");
      root.style.removeProperty("--form-font-weight");
    };
  }, [JSON.stringify(colors), JSON.stringify(typography)]);

  const getFormClasses = () => {
    const classes = ["ikiform-customized", "w-full", "ikiform-minimal"];
    return classes.join(" ");
  };

  const getFieldStyles = () => {
    return {
      borderColor: colors?.border || undefined,
      fontFamily: customStyles.formStyle.fontFamily || undefined,
    };
  };

  const getButtonStyles = (isPrimary = false) => {
    const buttonTheme = (themeOf(schema) as any).button ?? (schema.theme as any)?.button ?? {};
    const radius = buttonTheme.radius ?? "8px";
    const style = buttonTheme.style ?? "solid";
    const transparent = buttonTheme.transparent ?? false;
    const buttonText = colors?.buttonText || "#ffffff";

    const base: React.CSSProperties = {
      borderRadius: radius,
    };

    if (transparent) {
      return { ...base, backgroundColor: "transparent" };
    }

    if (style === "outline") {
      return {
        ...base,
        backgroundColor: "transparent",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: isPrimary && colors?.primary ? colors.primary : "currentColor",
        color: isPrimary && colors?.primary ? colors.primary : undefined,
      };
    }

    if (style === "ghost") {
      return {
        ...base,
        backgroundColor: "transparent",
        color: isPrimary && colors?.primary ? colors.primary : undefined,
      };
    }

    // solid (default)
    if (isPrimary && colors?.primary) {
      return {
        ...base,
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        color: buttonText,
      };
    }
    return base;
  };

  return {
    customStyles,
    fontLoaded,
    getFormClasses,
    getFieldStyles,
    getButtonStyles,
  };
}
