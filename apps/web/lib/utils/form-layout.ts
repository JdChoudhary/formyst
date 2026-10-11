import type { FormSchema } from "@repo/shared";
import {
  getBorderRadiusValue,
  getFontSizeValue,
  getFontWeightValue,
  getMarginValue,
  getMaxWidthValue,
  getPaddingValue,
} from "./form-styles";
import { loadGoogleFont } from "./google-fonts";

export interface LayoutClasses {
  maxWidthClass: string;
  paddingClass: string;
  containerClass: string;
  marginClass: string;
}

export interface FormCustomStyles {
  containerStyle: React.CSSProperties;
  cardStyle: React.CSSProperties;
  formStyle: React.CSSProperties;
  textStyle: React.CSSProperties;
  headingStyle: React.CSSProperties;
}

/**
 * Visual config comes from the v2 `theme`, with a legacy-settings fallback.
 * The theme is a RICHER superset of Typeform's theme object — see
 * `themeSchema` in @repo/shared. `fields`, `screens`, `font`, `background`
 * (with `href`/`imageUrl`/`brightness`/`layout`) are all first-class.
 */
function themeOf(schema: FormSchema) {
  const theme = schema.theme ?? {};
  const legacy = (schema as any).settings ?? {};
  return {
    colors: (theme as any).colors ?? legacy.colors ?? {},
    typography: (theme as any).typography ?? legacy.typography ?? {},
    layout: (theme as any).layout ?? legacy.layout ?? {},
    background: (theme as any).background ?? {},
    fields: (theme as any).fields ?? {},
    screens: (theme as any).screens ?? {},
    font: (theme as any).font,
    button: (theme as any).button ?? {},
    roundedCorners: (theme as any).roundedCorners,
  };
}

/** Build CSS background-image/background-size/etc from the richer background object. */
function buildBackgroundCss(background: Record<string, any>): React.CSSProperties {
  const image = background?.href || background?.imageUrl;
  if (!image) return {};

  const layout = background?.layout ?? "fullscreen";
  const size = background?.size || (layout === "fullscreen" ? "cover" : "auto");
  const position = background?.position || (layout === "fullscreen" ? "center center" : "left top");

  // Brightness (-1..1) becomes an overlay. Negative = darken, positive = lighten.
  let overlay = "";
  const brightness = background?.brightness;
  if (typeof brightness === "number" && brightness !== 0) {
    const alpha = Math.min(0.7, Math.abs(brightness));
    const rgba =
      brightness < 0 ? `rgba(0,0,0,${alpha.toFixed(2)})` : `rgba(255,255,255,${alpha.toFixed(2)})`;
    overlay = `linear-gradient(${rgba}, ${rgba}), `;
  }

  return {
    backgroundImage: `${overlay}url(${image})`,
    backgroundSize: size,
    backgroundPosition: position,
    backgroundRepeat: layout === "repeat" ? "repeat" : "no-repeat",
    backgroundAttachment: background?.attachment ?? undefined,
  };
}

export const getFormLayoutClasses = (schema: FormSchema): LayoutClasses => {
  const { layout } = themeOf(schema);

  let maxWidthClass = "max-w-2xl";
  let containerClass = "w-full max-w-2xl mx-auto";

  if ((layout as any)?.maxWidth === "custom" && (layout as any)?.customWidth) {
    maxWidthClass = "";
    containerClass = "w-full mx-auto";
  } else {
    switch (layout?.maxWidth) {
      case "sm":
        maxWidthClass = "max-w-sm";
        containerClass = "w-full max-w-sm mx-auto";
        break;
      case "md":
        maxWidthClass = "max-w-2xl";
        containerClass = "w-full max-w-2xl mx-auto";
        break;
      case "lg":
        maxWidthClass = "max-w-4xl";
        containerClass = "w-full max-w-4xl mx-auto";
        break;
      case "xl":
        maxWidthClass = "max-w-6xl";
        containerClass = "w-full max-w-6xl mx-auto";
        break;
      case "full":
        maxWidthClass = "max-w-full";
        containerClass = "w-full max-w-full mx-auto";
        break;
    }
  }

  let paddingClass = "md:p-6 p-2";
  switch (layout?.padding) {
    case "none":
      paddingClass = "p-0";
      break;
    case "sm":
      paddingClass = "md:p-4 p-2";
      break;
    case "md":
      paddingClass = "md:p-6 p-2";
      break;
    case "lg":
      paddingClass = "md:p-8 p-4";
      break;
  }

  let marginClass = "";
  switch (layout?.margin) {
    case "sm":
      marginClass = "my-2";
      break;
    case "md":
      marginClass = "my-4";
      break;
    case "lg":
      marginClass = "my-8";
      break;
    default:
      marginClass = "";
  }

  return { maxWidthClass, paddingClass, containerClass, marginClass };
};

export const getFormCustomStyles = async (schema: FormSchema): Promise<FormCustomStyles> => {
  const { colors, typography, layout, background, fields, screens, font, button } = themeOf(schema);

  const fontFamily =
    font ?? typography.fontFamily ?? fields.font ?? "Inter";

  if (fontFamily && typeof window !== "undefined") {
    try {
      await loadGoogleFont(fontFamily);
    } catch (error) {
      console.warn("Failed to load Google Font:", fontFamily, error);
    }
  }

  const bgCss = buildBackgroundCss(background as Record<string, any>);

  // Screen alignment drives the container layout (works for both modes).
  const alignment = screens?.alignment ?? fields?.alignment ?? "left";

  const containerStyle: React.CSSProperties = {
    ...bgCss,
    backgroundColor: background.color || colors.background || undefined,
    color: colors.text || undefined,
    fontFamily: fontFamily
      ? `"${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      : undefined,
    fontSize: typography.fontSize ? getFontSizeValue(typography.fontSize) : undefined,
    fontWeight: typography.fontWeight ? getFontWeightValue(typography.fontWeight) : undefined,
    maxWidth:
      (layout as any).maxWidth === "custom" && (layout as any).customWidth
        ? (layout as any).customWidth
        : layout.maxWidth
          ? getMaxWidthValue(layout.maxWidth as any)
          : getMaxWidthValue("md"),
    width: "100%",
    margin: layout.margin ? `${getMarginValue(layout.margin)} auto` : "0 auto",
    textAlign: alignment === "center" ? "center" : "left",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.background || undefined,
    borderColor: colors.border || undefined,
    borderRadius:
      button?.radius === "0px"
        ? "0px"
        : layout.borderRadius
          ? getBorderRadiusValue(layout.borderRadius)
          : undefined,
    padding: layout.padding ? getPaddingValue(layout.padding) : undefined,
  };

  const formStyle: React.CSSProperties = {
    fontFamily: fontFamily
      ? `"${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      : undefined,
    textAlign: fields?.alignment === "center" ? "center" : undefined,
  };

  const textStyle: React.CSSProperties = {
    color: colors.text || undefined,
    fontFamily: fontFamily
      ? `"${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      : undefined,
    fontSize:
      fields?.font_size === "small" || fields?.font_size === "large"
        ? getFontSizeValue(fields.font_size === "large" ? "lg" : "sm")
        : typography.fontSize
          ? getFontSizeValue(typography.fontSize)
          : undefined,
    fontWeight: typography.fontWeight ? getFontWeightValue(typography.fontWeight) : undefined,
  };

  const headingStyle: React.CSSProperties = {
    color: colors.text || undefined,
    fontFamily: fontFamily
      ? `"${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      : undefined,
  };

  return {
    containerStyle,
    cardStyle,
    formStyle,
    textStyle,
    headingStyle,
  };
};

export const getDesignModeClass = () => "bg-transparent border-none  hover:bg-transparent";
