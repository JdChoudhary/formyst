/**
 * Helpers for `slider` fields stored in the legacy (Typeform-style) `settings`
 * shape, e.g. `{ min, max, step, default_value, is_range, range: { min, max } }`.
 *
 * Used by the form settings "API & Code" section to build representative sample
 * payloads for code examples. All helpers are defensive: they accept missing or
 * partial settings and fall back to sensible defaults.
 */

export interface SliderFieldSettings {
  min?: number;
  max?: number;
  step?: number;
  default_value?: number;
  defaultValue?: number;
  is_range?: boolean;
  isRange?: boolean;
  range?: { min?: number; max?: number } | null;
  [key: string]: unknown;
}

/** Whether the slider is in range (dual-handle) mode. */
export function isRangeSliderMode(settings?: SliderFieldSettings | null): boolean {
  if (!settings) return false;
  if (settings.is_range === true || settings.isRange === true) return true;
  return typeof settings.range === "object" && settings.range !== null;
}

/** Resolve the slider's `{ min, max }` bounds, preferring an explicit range. */
export function normalizeRangeSliderValue(
  settings?: SliderFieldSettings | null,
): { min: number; max: number } {
  const range = settings?.range;
  const min = typeof range?.min === "number" ? range.min : (settings?.min ?? 0);
  const max = typeof range?.max === "number" ? range.max : (settings?.max ?? 100);
  return { min, max };
}

/** Resolve a single representative value (explicit default, else midpoint). */
export function normalizeSingleSliderValue(settings?: SliderFieldSettings | null): number {
  if (typeof settings?.default_value === "number") return settings.default_value;
  if (typeof settings?.defaultValue === "number") return settings.defaultValue;
  const { min, max } = normalizeRangeSliderValue(settings);
  return Math.round((min + max) / 2);
}
