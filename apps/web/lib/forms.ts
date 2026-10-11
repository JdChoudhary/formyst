import {
  createDefaultFormSchema,
  ensureDefaultFormSettings,
  ensureDefaultRateLimitSettings,
} from "@repo/shared";

export const DEFAULT_RATE_LIMIT_SETTINGS = {
  enabled: true,
  maxSubmissions: 5,
  timeWindow: 30,
  blockDuration: 60,
  message: "Please wait before submitting another request.",
};

export const DEFAULT_PROFANITY_FILTER_SETTINGS = {
  enabled: true,
  strictMode: true,
  replaceWithAsterisks: false,
  customWords: [],
  customMessage: "Please keep your submission respectful.",
  whitelistedWords: [],
};

export const DEFAULT_RESPONSE_LIMIT_SETTINGS = {
  enabled: false,
  maxResponses: 100,
  message: "This form is no longer accepting responses.",
};

export const DEFAULT_METADATA_SETTINGS = {
  title: "",
  description: "",
  keywords: "",
  author: "",
  robots: "noindex" as const,
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  ogType: "website",
  twitterCard: "summary" as const,
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  twitterSite: "",
  twitterCreator: "",
  noIndex: true,
  noFollow: false,
  noArchive: false,
  noSnippet: false,
  noImageIndex: false,
  noTranslate: false,
};

export const DEFAULT_PASSWORD_PROTECTION_SETTINGS = {
  enabled: false,
  password: "",
  message: "This form is password protected. Please enter the password to continue.",
};

export const DEFAULT_DUPLICATE_PREVENTION_SETTINGS = {
  enabled: false,
  strategy: "combined" as const,
  mode: "one-time" as const,
  timeWindow: 1440,
  message: "You have already submitted this form. Each user can only submit once.",
  allowOverride: false,
  maxAttempts: 1,
};

export const DEFAULT_BOT_PROTECTION_SETTINGS = {
  enabled: false,
  message: "Bot detected. Access denied.",
};
export const BOT_DETECTION_HELP_TEXT = "A hidden honeypot field is added to the form. Real users don't see or fill it. Bots that auto-fill all fields trigger it and are rejected.";

export const DEFAULT_SOCIAL_MEDIA_SETTINGS = {
  enabled: true,
  platforms: {
    github: "https://github.com/preetsuthar17",
    twitter: "https://x.com/preetsuthar17",
  },
  showIcons: true,
  iconSize: "md" as const,
  position: "footer" as const,
};

export const DEFAULT_EMAIL_VALIDATION_SETTINGS = {
  allowedDomains: [],
  blockedDomains: [],
  autoCompleteDomain: "",
  requireBusinessEmail: false,
  customValidationMessage: "",
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  subject: "You received a submission! 🥳",
  message: "Whoo-hoo!! You have received a new submission on your form.",
};

export const DEFAULT_LAYOUT_SETTINGS = {
  margin: "md" as const,
  padding: "lg" as const,
  maxWidth: "md" as const,
  borderRadius: "md" as const,
  spacing: "normal" as const,
  alignment: "left" as const,
};

export const DEFAULT_BEHAVIOR_SETTINGS = {
  autoFocusFirstField: false,
};

export const DEFAULT_COLOR_SETTINGS = {
  text: "#1f2937",
  border: "#e5e7eb",
  primary: "#3b82f6",
  background: "transparent",
};

export const DEFAULT_TYPOGRAPHY_SETTINGS = {
  fontSize: "base" as const,
  fontFamily: "Inter",
  fontWeight: "normal" as const,
  lineHeight: "normal" as const,
  letterSpacing: "normal" as const,
};

export {
  createDefaultFormSchema,
  ensureDefaultFormSettings,
  ensureDefaultRateLimitSettings,
};

export { DEFAULT_LAYOUT_SETTINGS as FORM_DEFAULT_LAYOUT };
