"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { FormSchema } from "@repo/shared";
import { SocialMediaIcons } from "@/components/ui/social-media-icons";
import { cn } from "@/lib/utils";

interface FooterSocialMedia {
  enabled?: boolean;
  platforms?: Record<string, string>;
  position?: "footer" | "header" | "both";
  iconSize?: "sm" | "md" | "lg";
}

interface FooterBranding {
  socialMedia?: FooterSocialMedia;
  showIkiformBranding?: boolean;
}

interface FooterSettings {
  show_typeform_branding?: boolean;
  branding?: FooterBranding;
}

interface FormBrandingFooterProps {
  schema: FormSchema;
  className?: string;
  /** The form's computed text style (`customStyles.textStyle` from `useFormStyling`). */
  style?: CSSProperties;
}

/**
 * The footer shown at the bottom of *every* public form screen (start page,
 * each question page, and the ending). It renders the optional social icons
 * and the "Powered by Formyst" attribution, and disappears entirely when both
 * are disabled.
 *
 * Kept in one place so the single-step, conversational and builder-preview
 * renderers cannot drift apart.
 */
export function FormBrandingFooter({ schema, className, style }: FormBrandingFooterProps) {
  const settings = schema.settings as unknown as FooterSettings | undefined;
  const socialMedia = settings?.branding?.socialMedia; // Position is optional in stored schemas (the settings UI shows "Footer"
  // as its default without persisting it), so treat missing as "footer".
  const position = socialMedia?.position ?? "footer";
  const showSocial = Boolean(
    socialMedia?.enabled && socialMedia.platforms && (position === "footer" || position === "both"),
  );
  const showPoweredBy =
    settings?.show_typeform_branding !== false && settings?.branding?.showIkiformBranding !== false;

  if (!showSocial && !showPoweredBy) return null;

  return (
    <div className={cn("flex w-full shrink-0 flex-col gap-4 text-center", className)} style={style}>
      {showSocial && (
        <SocialMediaIcons
          className="justify-center"
          iconSize={socialMedia?.iconSize ?? "md"}
          platforms={socialMedia?.platforms ?? {}}
        />
      )}
      {showPoweredBy && (
        <p className="text-muted-foreground text-sm">
          Powered by{" "}
          <span className="font-medium text-foreground underline">
            <Link href="https://formyst.app">Formyst</Link>
          </span>
        </p>
      )}
    </div>
  );
}
