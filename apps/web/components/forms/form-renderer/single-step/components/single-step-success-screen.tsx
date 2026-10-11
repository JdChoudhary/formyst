import type React from "react";
import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { getDefaultThankyou, interpolateRecall } from "@repo/shared";
import { AttachmentMedia } from "@/components/form-builder/form-field-renderer/components/attachment-media";
import { FormBrandingLogo } from "@/components/form-branding/form-branding-logo";
import { QuizResults } from "@/components/quiz/results/quiz-results";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SocialMediaIcons } from "@/components/ui/social-media-icons";
import { useFormStyling } from "@/hooks/use-form-styling";

import { generateQuizResultMessage } from "@/lib/quiz/scoring";
import type { FormSchema } from "@repo/shared/form/form-types";
import type { QuizResult } from "@/lib/quiz/scoring";

interface SingleStepSuccessScreenProps {
  schema: FormSchema;
  quizResults?: QuizResult | null;
  formData?: Record<string, unknown>;
  /** Current variable values — used to resolve recall tokens on the ending. */
  variables?: Record<string, unknown>;
  /** Hidden field values from URL parameters — used for recall tokens. */
  hidden?: Record<string, unknown>;
}

export const SingleStepSuccessScreen: React.FC<SingleStepSuccessScreenProps> = ({
  schema,
  quizResults,
  formData = {},
  variables = {},
  hidden = {},
}) => {
  const thankyou = getDefaultThankyou(schema);
  const thankyouProps = thankyou?.properties ?? {};
  const alignment = thankyouProps.heading_alignment ?? "center";
  const alignClass =
    alignment === "left"
      ? "items-start text-left"
      : alignment === "right"
        ? "items-end text-right"
        : "items-center text-center";
  const showDivider = thankyouProps.show_divider === true;
  const dividerText = thankyouProps.divider_text?.trim();
  const { customStyles } = useFormStyling(schema);

  const quizSettings = (schema.settings as any)?.quiz;
  const shouldShowQuizResults =
    quizSettings?.enabled &&
    (quizSettings?.showScore !== false || quizSettings?.showCorrectAnswers !== false) &&
    quizResults;
  const quizResultMessage = shouldShowQuizResults
    ? generateQuizResultMessage(quizResults, schema)
    : undefined;

  const redirectUrl = thankyouProps.redirect_url || schema.settings?.redirect_after_submit_url;
  const branding = (
    schema.settings as unknown as {
      branding?: {
        socialMedia?: {
          enabled?: boolean;
          platforms?: Record<string, string>;
          position?: "footer" | "header" | "both";
          iconSize?: "sm" | "md" | "lg";
        };
        showIkiformBranding?: boolean;
      };
    }
  ).branding;

  useEffect(() => {
    if (shouldShowQuizResults) return;
    if (thankyou?.type === "url_redirect" || (redirectUrl && thankyouProps.show_button === false)) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl!;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowQuizResults, redirectUrl, thankyou?.type, thankyouProps.show_button]);

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6"
      style={customStyles.containerStyle}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-4" style={customStyles.textStyle}>
          <FormBrandingLogo mode="classical" schema={schema} screen="ending" />
          {branding?.socialMedia?.enabled &&
            branding.socialMedia.platforms &&
            (branding.socialMedia.position === "header" ||
              branding.socialMedia.position === "both") && (
              <SocialMediaIcons
                className="justify-center"
                iconSize={branding.socialMedia.iconSize ?? "md"}
                platforms={branding.socialMedia.platforms}
              />
            )}
        </div>
        {shouldShowQuizResults ? (
          <QuizResults
            allowRetake={quizSettings?.allowRetake === true}
            result={quizResults}
            showDetailedResults={quizSettings?.showCorrectAnswers !== false}
            customMessage={quizResultMessage}
            onRetake={() => {
              window.location.reload();
            }}
          />
        ) : (
          <Card
            className="flex w-full grow flex-col gap-7 border p-8 shadow-none sm:p-10"
            style={{
              ...customStyles.cardStyle,
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className={cn("flex flex-col gap-4", alignClass)}>
              {thankyou?.attachment?.href && (
                <AttachmentMedia
                  attachment={thankyou.attachment}
                  className="max-h-40 w-auto rounded-xl"
                />
              )}
              <div className="flex size-16 items-center justify-center rounded-2xl bg-accent">
                <svg
                  className="size-8 text-accent-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-2xl text-foreground sm:text-3xl">
                {interpolateRecall(thankyou?.title || "Thank you!", schema, formData, variables, hidden)}
              </h2>
              {showDivider && (
                <div
                  className={cn(
                    "flex w-full max-w-md items-center gap-3",
                    alignment === "left" && "justify-start",
                    alignment === "right" && "justify-end",
                  )}
                >
                  {alignment !== "right" && (
                    <span aria-hidden className="flex-1 border-border border-t" />
                  )}
                  {dividerText && (
                    <span className="shrink-0 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {dividerText}
                    </span>
                  )}
                  {alignment !== "left" && (
                    <span aria-hidden className="flex-1 border-border border-t" />
                  )}
                </div>
              )}
              <p className="max-w-md text-muted-foreground text-sm leading-6">
                {thankyouProps.description
                  ? interpolateRecall(
                      thankyouProps.description,
                      schema,
                      formData,
                      variables,
                      hidden,
                    )
                  : "Your response has been recorded. You can safely close this page."}
              </p>
              {redirectUrl && (
                <p className="text-muted-foreground text-sm">Redirecting you in a moment...</p>
              )}
              {thankyouProps.show_button !== false &&
                thankyou?.type !== "url_redirect" &&
                !redirectUrl && (
                  <Button
                    className="mt-2"
                    onClick={() => {
                      if (thankyouProps.button_mode === "reload") {
                        window.location.reload();
                      } else if (
                        thankyouProps.button_mode === "redirect" &&
                        thankyouProps.redirect_url
                      ) {
                        window.location.href = thankyouProps.redirect_url;
                      } else if (redirectUrl) {
                        window.location.href = redirectUrl;
                      } else {
                        window.location.reload();
                      }
                    }}
                  >
                    {thankyouProps.button_text || "Submit another response"}
                  </Button>
                )}
            </div>
          </Card>
        )}
        <div className="flex flex-col items-center gap-3">
          {branding?.socialMedia?.enabled &&
            branding.socialMedia.platforms &&
            ((branding.socialMedia.position ?? "footer") === "footer" ||
              branding.socialMedia.position === "both") && (
              <SocialMediaIcons
                className="justify-center"
                iconSize={branding.socialMedia.iconSize ?? "md"}
                platforms={branding.socialMedia.platforms}
              />
            )}
          {schema.settings?.show_typeform_branding !== false &&
            branding?.showIkiformBranding !== false && (
              <p className="text-xs text-muted-foreground">
                Powered by{" "}
                <Link className="font-medium underline underline-offset-2" href="/">
                  Formyst
                </Link>
              </p>
            )}
        </div>
      </div>
    </div>
  );
};
