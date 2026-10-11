import type { CSSProperties } from "react";

export const GOOGLE_FONTS: { value: string; label: string; category: string }[] = [
  { value: "Inter", label: "Inter", category: "Sans Serif" },
  { value: "Roboto", label: "Roboto", category: "Sans Serif" },
  { value: "Open Sans", label: "Open Sans", category: "Sans Serif" },
  { value: "Lato", label: "Lato", category: "Sans Serif" },
  { value: "Poppins", label: "Poppins", category: "Sans Serif" },
  { value: "Montserrat", label: "Montserrat", category: "Sans Serif" },
  { value: "Nunito", label: "Nunito", category: "Sans Serif" },
  { value: "Source Sans Pro", label: "Source Sans Pro", category: "Sans Serif" },
  { value: "Merriweather", label: "Merriweather", category: "Serif" },
  { value: "Playfair Display", label: "Playfair Display", category: "Serif" },
  { value: "Lora", label: "Lora", category: "Serif" },
  { value: "PT Serif", label: "PT Serif", category: "Serif" },
  { value: "Fira Code", label: "Fira Code", category: "Monospace" },
  { value: "JetBrains Mono", label: "JetBrains Mono", category: "Monospace" },
  { value: "Source Code Pro", label: "Source Code Pro", category: "Monospace" },
];

type FontLoadState = "loaded" | "error";

const fontState = new Map<string, FontLoadState>();
const inFlight = new Map<string, Promise<void>>();

function fontLinkId(fontFamily: string): string {
  return `google-font-${fontFamily.replace(/\s+/g, "-").toLowerCase()}`;
}

/**
 * Dynamically loads a Google Font (family name, e.g. "Inter") into the page.
 * Safe to call repeatedly/concurrently — the font is only requested once,
 * and concurrent callers share the same in-flight promise.
 *
 * Resolves once the stylesheet has loaded AND the font face itself is
 * confirmed available via the Font Loading API (falls back gracefully if
 * that API is unsupported).
 */
export async function loadGoogleFont(
  fontFamily: string,
  weights: number[] = [300, 400, 500, 600, 700],
): Promise<void> {
  if (typeof document === "undefined" || !fontFamily) return;

  if (fontState.get(fontFamily) === "loaded") return;

  const existing = inFlight.get(fontFamily);
  if (existing) return existing;

  const promise = (async () => {
    const linkId = fontLinkId(fontFamily);
    const family = encodeURIComponent(fontFamily).replace(/%20/g, "+");
    const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(";")}&display=swap`;

    let link = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!link) {
      await new Promise<void>((resolve) => {
        link = document.createElement("link");
        link!.id = linkId;
        link!.rel = "stylesheet";
        link!.href = href;
        link!.onload = () => resolve();
        link!.onerror = () => {
          fontState.set(fontFamily, "error");
          console.warn(`[loadGoogleFont] Failed to load stylesheet for "${fontFamily}"`);
          resolve();
        };
        document.head.appendChild(link!);
      });
    }

    if (fontState.get(fontFamily) === "error") return;

    // Confirm the actual font face is ready, not just the CSS file.
    if ("fonts" in document) {
      try {
        await Promise.all(weights.map((w) => document.fonts.load(`${w} 16px "${fontFamily}"`)));
      } catch {
        // Non-fatal — CSS loaded even if we couldn't verify the face.
      }
    }

    fontState.set(fontFamily, "loaded");
  })();

  inFlight.set(fontFamily, promise);
  try {
    await promise;
  } finally {
    inFlight.delete(fontFamily);
  }
}

export function getFontLoadState(fontFamily: string): FontLoadState | "idle" {
  return fontState.get(fontFamily) ?? "idle";
}

export function generateFontPreviewStyles(fontFamily?: string): CSSProperties {
  if (!fontFamily) return {};
  const safeName = fontFamily.replace(/"/g, '\\"');
  return {
    fontFamily: `"${safeName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  };
}
