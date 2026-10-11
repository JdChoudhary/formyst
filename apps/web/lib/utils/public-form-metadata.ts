import type { Metadata } from "next";

import type { FormSchema } from "@repo/shared/form/form-types";

import { getPublicFormTitle } from "@/lib/utils/form-utils";

interface BuildPublicFormMetadataOptions {
  /** Absolute canonical-ish URL of the public form page. */
  formUrl: string;
  /** Fallback description when neither metadata nor legacy meta has one. */
  fallbackDescription?: string | null;
}

/**
 * Builds the Next.js `Metadata` for a public form page.
 *
 * Reads the SEO settings written by Settings → Metadata (`settings.metadata`:
 * basic SEO, social metadata, search-engine indexing) and falls back to the
 * legacy `settings.meta` block (title / description / allow_indexing / image)
 * used by older forms, then to the form's own title and description.
 */
export function buildPublicFormMetadata(
  schema: FormSchema | null | undefined,
  { formUrl, fallbackDescription }: BuildPublicFormMetadataOptions,
): Metadata {
  if (!schema) return {};

  const settings = (schema.settings ?? {}) as Record<string, any>;
  const legacy = (settings.meta ?? {}) as Record<string, any>;
  const md = (settings.metadata ?? {}) as Record<string, any>;

  const title = md.title || legacy.title || getPublicFormTitle(schema);
  const description =
    md.description || legacy.description || fallbackDescription || "Fill out this form.";
  const canonicalUrl = md.canonicalUrl || formUrl;

  // Indexing: explicit booleans from the Indexing section win, then the
  // robots directive string, then the legacy allow_indexing flag.
  const robotsDirectives =
    typeof md.robots === "string" && md.robots
      ? md.robots.split(",").map((d: string) => d.trim().toLowerCase())
      : null;
  const pick = (flag: boolean | undefined, directive: string, legacyValue: boolean) =>
    flag !== undefined ? !flag : robotsDirectives ? !robotsDirectives.includes(directive) : legacyValue;

  const robotsConfig = {
    index: pick(md.noIndex, "noindex", legacy.allow_indexing !== false),
    follow: pick(md.noFollow, "nofollow", true),
    archive: pick(md.noArchive, "noarchive", true),
    snippet: pick(md.noSnippet, "nosnippet", true),
    imageindex: pick(md.noImageIndex, "noimageindex", true),
    translate: pick(md.noTranslate, "notranslate", true),
  };

  const ogTitle = md.ogTitle || title;
  const ogDescription = md.ogDescription || description;
  const ogImage = md.ogImage || legacy.image?.href;
  const ogType = (md.ogType || "website") as "website" | "article" | "profile" | "book";

  const twitterCard = (md.twitterCard || "summary_large_image") as
    | "summary"
    | "summary_large_image"
    | "app"
    | "player";
  const twitterTitle = md.twitterTitle || ogTitle;
  const twitterDescription = md.twitterDescription || ogDescription;
  const twitterImage = md.twitterImage || ogImage;
  const twitterSite = md.twitterSite;
  const twitterCreator = md.twitterCreator;

  const author = md.author;
  const keywords = md.keywords;

  return {
    title,
    description,
    ...(author && { authors: [{ name: author }] }),
    ...(keywords && {
      keywords: String(keywords)
        .split(",")
        .map((k: string) => k.trim())
        .filter(Boolean),
    }),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: robotsConfig,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: formUrl,
      type: ogType,
      ...(ogImage && {
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: ogTitle,
          },
        ],
      }),
    },
    twitter: {
      card: twitterCard,
      title: twitterTitle,
      description: twitterDescription,
      ...(twitterImage && { images: [twitterImage] }),
      ...(twitterSite && { site: twitterSite }),
      ...(twitterCreator && { creator: twitterCreator }),
    },
  };
}
