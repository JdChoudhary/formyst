/**
 * Slug generation for forms.
 *
 * Services used to carry their own copy of this pipeline and had drifted
 * (one stripped underscores, the other did not), so the same title could
 * produce two different slugs depending on which service touched it.
 */

/** Longest slug we will ever produce. */
export const MAX_SLUG_LENGTH = 200;

/** Used when a title contains no characters that survive slugification. */
export const FALLBACK_SLUG = "untitled";

/**
 * Lowercase, accent-folded, ASCII-only, dash-separated.
 *
 * Returns `fallback` rather than an empty string, because an empty slug would
 * produce a URL like `/f/` and a unique index that can only hold one row.
 */
export function slugify(value: string, fallback: string = FALLBACK_SLUG): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    // Drop combining marks so "Café" and "Cafe" collide as intended.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // The slice above can leave a trailing dash behind.
    .replace(/-+$/g, "");

  return slug || fallback;
}

/**
 * The slug to try on attempt `n`:
 * `0 -> "my-form"`, `1 -> "my-form-1"`, `2 -> "my-form-2"`.
 */
export function slugCandidate(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base}-${attempt}`;
}
