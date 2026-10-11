import { useEffect, useState } from "react";

import type { FormSchema } from "@repo/shared";
import {
  DEFAULT_BEHAVIOR_SETTINGS,
  DEFAULT_BOT_PROTECTION_SETTINGS,
  DEFAULT_DUPLICATE_PREVENTION_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PASSWORD_PROTECTION_SETTINGS,
  DEFAULT_PROFANITY_FILTER_SETTINGS,
  DEFAULT_RATE_LIMIT_SETTINGS,
  DEFAULT_RESPONSE_LIMIT_SETTINGS,
} from "@/lib/forms";
import { DEFAULT_FORM_DESIGN } from "../constants";
import type { LocalSettings } from "../types";

/**
 * Build the legacy LocalSettings shape the settings UI edits from a v2 schema.
 * v2 keeps visual config (layout/colors/typography) in `theme`, while the
 * rest lives in `settings` — merge both, preferring theme for visuals.
 */
function buildLocalSettings(schema: FormSchema, userEmail?: string): LocalSettings {
  // v2 keeps visual config in `theme` and standard keys in `settings`; the
  // richer feature sections (behavior/rateLimit/...) are app-level legacy
  // extensions, so read them loosely to stay forward-compatible.
  const theme = (schema.theme ?? {}) as any;
  const legacy = (schema as any).settings ?? {};

  return {
    ...legacy,
    title: schema.title,
    layout: {
      maxWidth: theme.layout?.maxWidth || legacy.layout?.maxWidth || DEFAULT_FORM_DESIGN.maxWidth,
      padding: theme.layout?.padding || legacy.layout?.padding || DEFAULT_FORM_DESIGN.padding,
      spacing: theme.layout?.spacing || legacy.layout?.spacing || "normal",
      alignment: theme.layout?.alignment || legacy.layout?.alignment || "left",
      margin: theme.layout?.margin || legacy.layout?.margin || DEFAULT_FORM_DESIGN.margin,
      borderRadius:
        theme.layout?.borderRadius ||
        legacy.layout?.borderRadius ||
        DEFAULT_FORM_DESIGN.borderRadius,
    },
    colors: theme.colors ?? legacy.colors ?? {},
    typography: theme.typography ?? legacy.typography ?? {},
    behavior: {
      ...DEFAULT_BEHAVIOR_SETTINGS,
      ...legacy.behavior,
    },
    rateLimit: {
      ...DEFAULT_RATE_LIMIT_SETTINGS,
      ...legacy.rateLimit,
    },
    duplicatePrevention: {
      ...DEFAULT_DUPLICATE_PREVENTION_SETTINGS,
      ...legacy.duplicatePrevention,
    },
    profanityFilter: {
      ...DEFAULT_PROFANITY_FILTER_SETTINGS,
      ...legacy.profanityFilter,
    },
    botProtection: {
      ...DEFAULT_BOT_PROTECTION_SETTINGS,
      ...legacy.botProtection,
    },
    responseLimit: {
      ...DEFAULT_RESPONSE_LIMIT_SETTINGS,
      ...legacy.responseLimit,
    },
    passwordProtection: {
      ...DEFAULT_PASSWORD_PROTECTION_SETTINGS,
      ...legacy.passwordProtection,
    },
    notifications: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...legacy.notifications,
      email: legacy.notifications?.email || userEmail || "",
    },
    api: {
      enabled: false,
      apiKey: undefined,
      allowExternalSubmissions: false,
      ...legacy.api,
    },
  };
}

export function useFormSettings(
  schema: FormSchema,
  userEmail?: string,
  onSchemaUpdate?: (updates: Partial<FormSchema>) => void,
) {
  const [localSettings, setLocalSettings] = useState<LocalSettings>(() =>
    buildLocalSettings(schema, userEmail),
  );

  useEffect(() => {
    setLocalSettings(buildLocalSettings(schema, userEmail));
  }, [schema.settings, schema.theme, userEmail]);

  const persistSettings = (next: LocalSettings) => {
    setLocalSettings(next);
    onSchemaUpdate?.({
      settings: {
        ...schema.settings,
        ...next,
        meta: {
          ...schema.settings?.meta,
          title: next.publicTitle || next.title || schema.settings?.meta?.title,
          description: next.description || schema.settings?.meta?.description,
        },
      } as FormSchema["settings"],
    });
  };

  const updateSettings = (updates: Partial<LocalSettings>) => {
    persistSettings({
      ...localSettings,
      ...updates,
      layout: {
        ...localSettings.layout,
        ...updates.layout,
        margin: updates.layout?.margin ?? localSettings.layout?.margin,
        borderRadius: updates.layout?.borderRadius ?? localSettings.layout?.borderRadius,
      },
      behavior: {
        ...localSettings.behavior,
        ...updates.behavior,
      },
      rateLimit: {
        ...localSettings.rateLimit,
        ...updates.rateLimit,
      },
      duplicatePrevention: {
        ...localSettings.duplicatePrevention,
        ...updates.duplicatePrevention,
      },
      profanityFilter: {
        ...localSettings.profanityFilter,
        ...updates.profanityFilter,
      },
      responseLimit: {
        ...localSettings.responseLimit,
        ...updates.responseLimit,
      },
      passwordProtection: {
        ...localSettings.passwordProtection,
        ...updates.passwordProtection,
      },
    });
  };

  const updateRateLimit = (rateLimitUpdates: Partial<NonNullable<LocalSettings["rateLimit"]>>) => {
    persistSettings({
      ...localSettings,
      rateLimit: {
        ...localSettings.rateLimit,
        ...rateLimitUpdates,
      },
    });
  };

  const updateDuplicatePrevention = (
    duplicatePreventionUpdates: Partial<NonNullable<LocalSettings["duplicatePrevention"]>>,
  ) => {
    persistSettings({
      ...localSettings,
      duplicatePrevention: {
        ...localSettings.duplicatePrevention,
        ...duplicatePreventionUpdates,
      },
    });
  };

  const updateProfanityFilter = (
    profanityFilterUpdates: Partial<NonNullable<LocalSettings["profanityFilter"]>>,
  ) => {
    persistSettings({
      ...localSettings,
      profanityFilter: {
        ...localSettings.profanityFilter,
        ...profanityFilterUpdates,
      },
    });
  };

  const updateBotProtection = (
    botProtectionUpdates: Partial<NonNullable<LocalSettings["botProtection"]>>,
  ) => {
    persistSettings({
      ...localSettings,
      botProtection: {
        ...localSettings.botProtection,
        ...botProtectionUpdates,
      },
    });
  };

  const updateResponseLimit = (
    responseLimitUpdates: Partial<NonNullable<LocalSettings["responseLimit"]>>,
  ) => {
    persistSettings({
      ...localSettings,
      responseLimit: {
        ...localSettings.responseLimit,
        ...responseLimitUpdates,
      },
    });
  };

  const updatePasswordProtection = (
    passwordProtectionUpdates: Partial<NonNullable<LocalSettings["passwordProtection"]>>,
  ) => {
    persistSettings({
      ...localSettings,
      passwordProtection: {
        ...localSettings.passwordProtection,
        ...passwordProtectionUpdates,
      },
    });
  };

  const updateSocialMedia = (
    socialMediaUpdates: Partial<NonNullable<NonNullable<LocalSettings["branding"]>["socialMedia"]>>,
  ) => {
    persistSettings({
      ...localSettings,
      branding: {
        ...localSettings.branding,
        socialMedia: {
          ...localSettings.branding?.socialMedia,
          ...socialMediaUpdates,
        },
      },
    });
  };

  const updateNotifications = (notificationUpdates: Partial<LocalSettings["notifications"]>) => {
    persistSettings({
      ...localSettings,
      notifications: {
        ...localSettings.notifications,
        ...notificationUpdates,
      },
    });
  };

  const updateApi = (apiUpdates: Partial<NonNullable<LocalSettings["api"]>>) => {
    persistSettings({
      ...localSettings,
      api: {
        ...localSettings.api,
        ...apiUpdates,
      },
    });
  };

  const resetSettings = () => {
    setLocalSettings(buildLocalSettings(schema, userEmail));
  };

  return {
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
    resetSettings,
  };
}
