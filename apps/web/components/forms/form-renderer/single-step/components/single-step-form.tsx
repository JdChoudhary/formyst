"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFormStyling } from "@/hooks/use-form-styling";
import { FormBrandingFooter } from "@/components/form-branding/form-branding-footer";
import { FormBrandingLogo } from "@/components/form-branding/form-branding-logo";
import { cn } from "@/lib/utils";
import { constantTimeCompare } from "@/lib/utils/constant-time-compare";
import { getFormLayoutClasses } from "@/lib/utils/form-layout";
import { getNextStepIndex, getWelcomeScreen, interpolateRecall, resolveStepRouting } from "@repo/shared";
import { AttachmentMedia } from "@/components/form-builder/form-field-renderer/components/attachment-media";
import { PasswordProtectionModal } from "../../../modals/password-protection-modal";
import { useSingleStepForm } from "../hooks/use-single-step-form";
import type { PublicFormProps } from "../types";
import { getAllFields, validateSingleStepForm } from "../utils/form-utils";
import { AutosaveStatus } from "../../autosave-status";
import { SingleStepFormContent } from "./single-step-form-content";
import { SingleStepSuccessScreen } from "./single-step-success-screen";
import { SocialMediaIcons } from "@/components/ui/social-media-icons";

export const SingleStepForm: React.FC<PublicFormProps & { dir?: string }> = ({
  formId,
  schema,
  dir,
}) => {
  // `schema` is a stable prop, so parse it once per schema. Recomputing this
  // on every render produced a brand-new array each time, which made every
  // effect keyed on `fields` (hidden values, field initialisation, …) re-run
  // after each render — an endless render loop that froze the public form.
  const fields = useMemo(() => getAllFields(schema), [schema]);
  const {
    formData,
    errors,
    setErrors,
    submitting,
    submitted,
    duplicateError,
    handleFieldValueChange,
    handleSubmit,
    fieldVisibility,
    logicMessages,
    requiredOverrides,
    variables: logicVariables,
    hidden,
    quizResults,
    progressSaving,
    progressError,
    offline,
    saveNow,
    lastFieldId,
    recordFieldFocus,
    recordFieldBlur,
    recordFieldView,
  } = useSingleStepForm(formId, schema, fields);

  // Classic multi-step: paginate by persisted page groups.
  const groups =
    (schema as unknown as { groups?: { id: string; title?: string; fieldIds?: string[] }[] })
      .groups ?? [];
  const classicMultiStep = groups.length > 1;
  const pages = classicMultiStep
    ? groups.map((group: { id: string; title?: string; fieldIds?: string[] }) => ({
        id: group.id,
        title: group.title ?? "",
        fields: fields.filter((f) => group.fieldIds?.includes(f.ref ?? "")),
      }))
    : null;
  const [pageIndex, setPageIndex] = useState(0);
  const currentPageFields = pages ? (pages[pageIndex]?.fields ?? []) : fields;

  // Plain-language step routing: logic rules can jump to a later step or skip
  // steps entirely, so the "next" step is computed rather than just incremented.
  const stepRouting = resolveStepRouting(schema, formData, logicVariables ?? {}, {});
  const nextStepIndex = pages ? getNextStepIndex(schema, pageIndex, stepRouting) : null;
  const isEffectiveLastPage = !pages || nextStepIndex === null;

  const handleNextPage = () => {
    if (!pages) return;
    const pageFields = pages[pageIndex]?.fields ?? [];
    const { errors: pageErrors, isValid } = validateSingleStepForm(pageFields, formData);
    if (!isValid) {
      setErrors(pageErrors);
      return;
    }
    setErrors({});
    if (nextStepIndex !== null) {
      setPageIndex(nextStepIndex);
    }
  };

  const handleBackPage = () => {
    if (pageIndex > 0) setPageIndex((i) => i - 1);
  };

  const progressPct = pages
    ? Math.min(100, Math.round(((pageIndex + 1) / pages.length) * 100))
    : null;

  const welcomeScreen = getWelcomeScreen(schema);
  const [started, setStarted] = useState(!welcomeScreen);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const hasContent = Object.values(formData).some(
    (value) =>
      value !== "" &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0),
  );

  const { containerClass, marginClass } = getFormLayoutClasses(schema);
  const { customStyles, fontLoaded, getFormClasses, getButtonStyles } = useFormStyling(schema);

  // Background layer: full viewport, includes theme background color/image.
  // Classic mode strips the wallpaper image; conversational keeps it.
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: customStyles.containerStyle.backgroundColor,
    backgroundImage: customStyles.containerStyle.backgroundImage as string | undefined,
    backgroundSize: customStyles.containerStyle.backgroundSize as string | undefined,
    backgroundPosition: customStyles.containerStyle.backgroundPosition as string | undefined,
    backgroundRepeat: customStyles.containerStyle.backgroundRepeat as string | undefined,
    backgroundAttachment: customStyles.containerStyle.backgroundAttachment as
      React.CSSProperties["backgroundAttachment"] | undefined,
    color: customStyles.containerStyle.color,
    fontFamily: customStyles.containerStyle.fontFamily,
    fontSize: customStyles.containerStyle.fontSize,
    fontWeight: customStyles.containerStyle.fontWeight,
  };
  // Content layer: receives the constrained maxWidth + margin from the theme.
  const contentStyle: React.CSSProperties = {
    maxWidth: customStyles.containerStyle.maxWidth,
    width: customStyles.containerStyle.width,
    margin: customStyles.containerStyle.margin,
    textAlign: customStyles.containerStyle.textAlign,
  };

  const passwordProtection = (schema.settings as any)?.passwordProtection;
  const brandingSettings = (
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
  )?.branding;

  useEffect(() => {
    if (passwordProtection?.enabled && passwordProtection?.password) {
      setIsPasswordProtected(true);
      setShowPasswordModal(true);
    }
  }, [passwordProtection?.enabled, passwordProtection?.password]);

  const handlePasswordSubmit = (password: string) => {
    const expectedPassword = passwordProtection?.password;
    if (expectedPassword && constantTimeCompare(password, expectedPassword)) {
      setPasswordVerified(true);
      setShowPasswordModal(false);
    } else {
      toast.error("Incorrect password!");
    }
  };

  const handlePasswordCancel = () => {
    window.location.href = "/";
  };

  // Loading animation
  useEffect(() => {
    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      setShowForm(true);
    }, 1500);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(loadingTimer);
    };
  }, []);

  // Font loading gate
  if (!fontLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Progress className="h-1 w-48" value={40} />
      </div>
    );
  }

  if (submitted) {
    return (
      <SingleStepSuccessScreen
        formData={formData}
        hidden={hidden}
        quizResults={quizResults}
        schema={schema}
        variables={logicVariables ?? {}}
      />
    );
  }

  if (isPasswordProtected && !passwordVerified) {
    return (
      <PasswordProtectionModal
        isOpen={showPasswordModal}
        message={
          passwordProtection?.message ||
          "This form is password protected. Please enter the password to continue."
        }
        onCancel={handlePasswordCancel}
        onPasswordSubmit={handlePasswordSubmit}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-full max-w-[200px] px-6 py-8">
          <Progress className="h-2 w-full" value={loadingProgress} />
        </div>
      </div>
    );
  }

  // Welcome screen
  if (!started && welcomeScreen) {
    const welcomeProps = welcomeScreen.properties ?? {};
    const welcomeAlignment = welcomeProps.heading_alignment ?? "center";
    const welcomeAlignClass =
      welcomeAlignment === "left"
        ? "items-start text-left"
        : welcomeAlignment === "right"
          ? "items-end text-right"
          : "items-center text-center";
    const showWelcomeDivider = welcomeProps.show_divider === true;
    const welcomeDividerText = welcomeProps.divider_text?.trim();
    return (
      <div
        className={cn(
          "flex min-h-dvh w-full items-center justify-center transition-opacity duration-700 ease-out",
          showForm ? "opacity-100" : "opacity-0",
          marginClass,
          getFormClasses(),
        )}
        dir={dir}
        style={backgroundStyle}
      >
        <div
          className={cn("flex w-full flex-col gap-8 px-4 sm:px-6", containerClass)}
          style={contentStyle}
        >
          {brandingSettings?.socialMedia?.enabled &&
            brandingSettings.socialMedia.platforms &&
            (brandingSettings.socialMedia.position === "header" ||
              brandingSettings.socialMedia.position === "both") && (
              <SocialMediaIcons
                className="justify-center"
                iconSize={brandingSettings.socialMedia.iconSize ?? "md"}
                platforms={brandingSettings.socialMedia.platforms}
              />
            )}
          <Card
            className="flex w-full grow flex-col gap-6 p-8 shadow-none sm:p-10"
            style={customStyles.cardStyle}
          >
            <div
              className={cn("flex flex-col gap-4", welcomeAlignClass)}
              style={customStyles.textStyle}
            >
              <FormBrandingLogo mode="classical" schema={schema} screen="welcome" />
              {welcomeScreen.attachment?.href && (
                <div className="mt-2 flex justify-center">
                  <AttachmentMedia
                    attachment={welcomeScreen.attachment}
                    className="max-h-40 w-auto rounded-xl"
                  />
                </div>
              )}
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={customStyles.headingStyle}
              >
                {interpolateRecall(
                  welcomeScreen.title,
                  schema,
                  formData,
                  logicVariables ?? {},
                  hidden,
                )}
              </h1>
              {showWelcomeDivider && (
                <div
                  className={cn(
                    "flex w-full max-w-lg items-center gap-3",
                    welcomeAlignment === "left" && "justify-start",
                    welcomeAlignment === "right" && "justify-end",
                  )}
                >
                  {welcomeAlignment !== "right" && (
                    <span aria-hidden className="flex-1 border-border border-t" />
                  )}
                  {welcomeDividerText && (
                    <span className="shrink-0 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {welcomeDividerText}
                    </span>
                  )}
                  {welcomeAlignment !== "left" && (
                    <span aria-hidden className="flex-1 border-border border-t" />
                  )}
                </div>
              )}
              {welcomeProps.description && (
                <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                  {interpolateRecall(
                    welcomeProps.description,
                    schema,
                    formData,
                    logicVariables ?? {},
                    hidden,
                  )}
                </p>
              )}
              {welcomeProps.show_button !== false && (
                <Button
                  className="mt-2 px-8 py-6 text-base font-medium shadow-md transition-all hover:shadow-lg"
                  onClick={() => setStarted(true)}
                  style={getButtonStyles(true)}
                  type="button"
                >
                  {welcomeProps.button_text || "Start"}
                </Button>
              )}
            </div>
          </Card>
          <FormBrandingFooter className="pb-2" schema={schema} style={customStyles.textStyle} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-dvh w-full items-center justify-center transition-opacity duration-700 ease-out",
        showForm ? "opacity-100" : "opacity-0",
        marginClass,
        getFormClasses(),
      )}
      dir={dir}
      style={backgroundStyle}
    >
      <div
        className={cn("flex w-full flex-col gap-8 px-4 sm:px-6", containerClass)}
        style={contentStyle}
      >
        {brandingSettings?.socialMedia?.enabled &&
          brandingSettings.socialMedia.platforms &&
          (brandingSettings.socialMedia.position === "header" ||
            brandingSettings.socialMedia.position === "both") && (
            <SocialMediaIcons
              className="justify-center"
              iconSize={brandingSettings.socialMedia.iconSize ?? "md"}
              platforms={brandingSettings.socialMedia.platforms}
            />
          )}
        {progressPct !== null && schema.settings?.show_progress_bar !== false && (
          <div className="flex items-center gap-3">
            <Progress className="h-2 flex-1" value={progressPct} />
            <span className="shrink-0 text-xs text-muted-foreground">
              {pageIndex + 1} / {pages?.length}
            </span>
          </div>
        )}
        <Card
          className="flex w-full grow flex-col gap-6 p-8 shadow-none sm:p-10"
          style={customStyles.cardStyle}
        >
          <div style={customStyles.formStyle}>
            <FormBrandingLogo
              className="mb-1"
              mode="classical"
              pageIndex={pageIndex}
              schema={schema}
              screen="question"
            />
            <SingleStepFormContent
              duplicateError={duplicateError}
              errors={errors}
              fields={currentPageFields}
              fieldVisibility={fieldVisibility}
              formData={formData}
              formId={formId}
              hidden={hidden}
              isLastPage={isEffectiveLastPage}
              showAttachment={schema.mode !== "classic"}
              logicMessages={logicMessages}
              requiredOverrides={requiredOverrides}
              variables={logicVariables}
              onBack={handleBackPage}
              onFieldBlur={recordFieldBlur}
              onFieldFocus={recordFieldFocus}
              onFieldValueChange={handleFieldValueChange}
              onFieldView={recordFieldView}
              onNext={handleNextPage}
              onSubmit={handleSubmit}
              schema={schema}
              showMultiStepNav={!!pages}
              stepLabel={pages ? `Step ${pageIndex + 1} of ${pages.length}` : undefined}
              stepTitle={pages ? pages[pageIndex]?.title : undefined}
              submitting={submitting}
            />
          </div>
          <AutosaveStatus
            error={progressError}
            offline={offline}
            onSaveNow={() => {
              if (hasContent) saveNow(formData, 0, 1, lastFieldId);
            }}
            saving={progressSaving}
          />
        </Card>
        <FormBrandingFooter className="pb-2" schema={schema} style={customStyles.textStyle} />
      </div>
    </div>
  );
};
