import { createRef, DEFAULT_THEME, ensureSchemaDefaults } from "./form-utils";
import type { FormSchema } from "./form-types";

export interface CreateDefaultFormOptions {
  title?: string;
  /** always "classic" — page-based forms only (conversational mode is gone) */
  mode?: FormSchema["mode"];
  description?: string;
}

/**
 * Build a fresh schema with sensible defaults.
 * The builder/renderer can then add fields, screens, logic, etc.
 */
export function createDefaultFormSchema(options: CreateDefaultFormOptions = {}): FormSchema {
  const mode: FormSchema["mode"] = options.mode ?? "classic";
  const title = options.title || "Untitled Form";

  const schema: FormSchema = {
    mode,
    title,
    settings: {
      language: "en",
      is_public: true,
      autosave_progress: true,
      progress_bar: "proportion",
      show_progress_bar: true,
      show_typeform_branding: true,
      show_question_number: true,
      show_key_hint_on_choices: true,
      meta: {
        title,
        description: options.description,
      },
    },
    fields: [],
    welcome_screens: [],
    thankyou_screens: [
      {
        ref: "default_thankyou",
        title: "Thank you for your submission!",
        type: "thankyou_screen",
        properties: {
          show_button: true,
          button_text: "Submit another response",
          button_mode: "reload",
        },
      },
    ],
    hidden: [],
    urlParams: [],
    variables: {},
    logic: [],
  };

  return ensureSchemaDefaults(schema);
}

/** Backward-compatible aliases (now thin — no legacy rate-limit fields). */
export function ensureDefaultFormSettings(schema: unknown): FormSchema {
  return ensureSchemaDefaults(schema as FormSchema);
}
export function ensureDefaultRateLimitSettings(schema: unknown): FormSchema {
  return ensureSchemaDefaults(schema as FormSchema);
}

export { createRef, DEFAULT_THEME };
