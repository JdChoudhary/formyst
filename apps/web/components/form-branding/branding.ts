import type {
  Branding,
  BrandingPosition,
  BrandingVisibility,
  FormSchema,
  LogoSize,
} from "@repo/shared";

/** Screens a branding logo can appear on. */
export type BrandingScreen = "welcome" | "question" | "ending";

export interface ResolvedBranding {
  enabled: boolean;
  src: string;
  alt: string;
  size: LogoSize;
  visibility: BrandingVisibility;
  position: BrandingPosition;
  /** Effective per-screen visibility after resolving `visibility`. */
  showOn: { welcome: boolean; questions: boolean; ending: boolean };
}

const DEFAULT_CONVERSATIONAL: Branding["conversational"] = {
  visibility: "welcome",
  position: "center",
};

const DEFAULT_CLASSICAL: Branding["classical"] = {
  visibility: "throughout",
  position: "center",
};

/** Pull the branding config out of the theme (with a settings fallback). */
export function getBrandingConfig(schema: FormSchema): Branding | undefined {
  const theme = schema.theme;
  if (theme && typeof theme === "object" && "branding" in theme) {
    return (theme as { branding?: Branding }).branding;
  }
  // Legacy fallback: a form-level logo set in settings.meta.image.
  const legacyLogo = (schema as { settings?: { meta?: { image?: { href?: string } } } }).settings
    ?.meta?.image?.href;
  if (legacyLogo) {
    return {
      logo: { enabled: true, src: legacyLogo, alt: "", size: "medium" },
      classical: DEFAULT_CLASSICAL,
      conversational: DEFAULT_CONVERSATIONAL,
    };
  }
  return undefined;
}

/**
 * Resolve the effective branding for a form mode. Never throws — returns a
 * fully-defaulted config so renderers can call it unconditionally.
 */
export function resolveBranding(
  schema: FormSchema,
  mode: "classical" | "conversational",
): ResolvedBranding {
  const config = getBrandingConfig(schema);
  const experience =
    mode === "conversational"
      ? (config?.conversational ?? DEFAULT_CONVERSATIONAL)
      : (config?.classical ?? DEFAULT_CLASSICAL);

  const visibility = experience?.visibility ?? "welcome";
  const position = experience?.position ?? "center";
  const showOn = experience?.show_on;

  const baseShowOn =
    visibility === "throughout"
      ? { welcome: true, questions: true, ending: true }
      : visibility === "welcome"
        ? { welcome: true, questions: false, ending: false }
        : visibility === "ending"
          ? { welcome: false, questions: false, ending: true }
          : visibility === "first-step"
            ? { welcome: true, questions: false, ending: false }
            : // "custom"
              {
                welcome: showOn?.welcome ?? true,
                questions: showOn?.questions ?? false,
                ending: showOn?.ending ?? false,
              };

  return {
    enabled: config?.logo?.enabled ?? true,
    src: config?.logo?.src ?? "",
    alt: config?.logo?.alt ?? "",
    size: config?.logo?.size ?? "medium",
    visibility,
    position,
    showOn: baseShowOn,
  };
}

/**
 * Whether the logo should render for a given screen. Multi-step classical
 * forms pass the current page index so "first-step" only shows on page 1.
 */
export function shouldShowLogo(
  resolved: ResolvedBranding,
  screen: BrandingScreen,
  pageIndex = 0,
): boolean {
  if (!resolved.enabled || !resolved.src) return false;
  if (resolved.visibility === "first-step" && screen !== "question") {
    return screen === "welcome";
  }
  if (resolved.visibility === "first-step") {
    return pageIndex === 0;
  }
  return resolved.showOn[screen === "question" ? "questions" : screen] ?? false;
}

/** CSS size mapping for the logo presets. */
export function logoSizeClass(size: LogoSize): string {
  switch (size) {
    case "small":
      return "h-7 sm:h-8";
    case "large":
      return "h-12 sm:h-14";
    default:
      return "h-9 sm:h-10";
  }
}

/** Flex/text alignment class for the logo position. */
export function logoPositionClass(position: BrandingPosition): string {
  switch (position) {
    case "left":
      return "items-start justify-start";
    case "right":
      return "items-end justify-end";
    default:
      return "items-center justify-center";
  }
}
