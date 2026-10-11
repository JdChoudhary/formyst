"use client";

import { Settings } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { FormSettingsDesktopLayout, FormSettingsMobileLayout } from "./components";
import { useFormSettings } from "./hooks";
import type { FormSettingsSection } from "./types";

interface FormSettingsPanelProps {
  formId?: string;
  schema: any;
  onSchemaUpdate: (updates: any) => void;
  userEmail?: string;
  onBack: () => void;
}

/**
 * Inline form settings — the same sections as the modal, rendered as a builder
 * tab instead of an overlay dialog.
 */
export function FormSettingsPanel({
  formId,
  schema,
  onSchemaUpdate,
  userEmail,
  onBack,
}: FormSettingsPanelProps) {
  const {
    localSettings,
    updateSettings,
    updateRateLimit,
    updateDuplicatePrevention,
    updateProfanityFilter,
    updateBotProtection,
    updateResponseLimit,
    updatePasswordProtection,
    updateSocialMedia,
    updateNotifications,
    updateApi,
  } = useFormSettings(schema, userEmail, onSchemaUpdate);

  const [activeSection, setActiveSection] = useState<FormSettingsSection>("basic");

  const sectionProps = {
    localSettings,
    updateSettings,
    updateRateLimit,
    updateDuplicatePrevention,
    updateProfanityFilter,
    updateBotProtection,
    updateResponseLimit,
    updatePasswordProtection,
    updateSocialMedia,
    updateNotifications,
    updateApi,
    formId,
    schema,
    onSchemaUpdate,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-border border-b px-4 py-2.5">
        <Settings className="size-4 text-primary" />
        <h2 className="font-semibold text-sm">Form settings</h2>
        <Button className="ml-auto gap-1.5" onClick={onBack} size="sm" variant="ghost">
          <ArrowLeft className="size-3.5" />
          Back to build
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {formId ? (
          <>
            <FormSettingsDesktopLayout
              activeSection={activeSection}
              onClose={onBack}
              onSectionChange={setActiveSection}
              sectionProps={sectionProps}
            />
            <FormSettingsMobileLayout
              activeSection={activeSection}
              onClose={onBack}
              onSectionChange={setActiveSection}
              sectionProps={sectionProps}
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">
              Please save the form first to access the settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
