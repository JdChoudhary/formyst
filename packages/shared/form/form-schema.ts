import { z } from "zod";

/* ============================================================================
 * Ikiform Form Schema
 * ----------------------------------------------------------------------------
 * - mode: "conversational" → one question per screen
 * - mode: "classic"        → page-based, no wallpaper
 * - `fields` is the flat, ordered source of truth, keyed by `ref`.
 * - `theme` is ONE canonical schema, stored in the themes table. Renderers
 *   (classic, conversational, or any future style) read whichever subset of
 *   fields they need directly off it — there is no per-platform theme shape.
 *   If you ever export to a real third-party API (Typeform, Google Forms),
 *   write a mapper function at that boundary; don't persist a second shape.
 * ========================================================================== */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const attachmentSchema = z.object({
  type: z.enum(["image", "video"]),
  href: z.string().url(),
  properties: z.object({ description: z.string().optional() }).optional(),
  scale: z.union([z.literal(0.4), z.literal(0.6), z.literal(0.8), z.literal(1)]).optional(),
});

export const layoutSchema = z.object({
  type: z.enum(["split", "wallpaper", "float", "stack"]),
  placement: z.enum(["left", "right"]).optional(),
  attachment: attachmentSchema.optional(),
  viewport_overrides: z
    .object({
      small: z
        .object({
          type: z.enum(["split", "wallpaper", "float", "stack"]),
          placement: z.enum(["left", "right"]).optional(),
        })
        .optional(),
      large: z
        .object({
          type: z.enum(["split", "wallpaper", "float", "stack"]),
          placement: z.enum(["left", "right"]).optional(),
        })
        .optional(),
    })
    .optional(),
});

export const choiceSchema = z.object({
  ref: z.string().optional(),
  label: z.string().max(255),
  attachment: attachmentSchema.optional(),
});

// Every key here is already optional — no need for .partial() on top.
export const validationsSchema = z.object({
  required: z.boolean().optional(),
  max_length: z.number().int().positive().optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
});

export const priceSchema = z.object({
  type: z.enum(["fixed", "variable"]).default("fixed"),
  value: z.object({
    type: z.enum(["constant", "variable"]).default("constant"),
    amount: z.string().optional(),
    variable_ref: z.string().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

export const fieldTypeSchema = z.enum([
  "banner",
  "calendly",
  "checkbox",
  "contact_info",
  "date",
  "divider",
  "dropdown",
  "email",
  "file_upload",
  "google_calendar",
  "group",
  "legal",
  "long_text",
  "matrix",
  "multi_format",
  "multiple_choice",
  "nps",
  "number",
  "opinion_scale",
  "payment",
  "phone_number",
  "picture_choice",
  "ranking",
  "rating",
  "short_text",
  "signature",
  "statement",
  "tags",
  "website",
  "yes_no",
]);

export const fieldPropertiesSchema: z.ZodType<FieldProperties> = z.lazy(() =>
  z
    .object({
      description: z.string().optional(),
      placeholder: z.string().optional(),
      choices: z.array(choiceSchema).optional(),
      allow_multiple_selection: z.boolean().optional(),
      randomize: z.boolean().optional(),
      allow_other_choice: z.boolean().optional(),
      vertical_alignment: z.boolean().optional(),
      supersized: z.boolean().optional(),
      show_labels: z.boolean().default(true).optional(),
      alphabetical_order: z.boolean().optional(),
      hide_marks: z.boolean().optional(),
      button_text: z.string().default("Continue").optional(),
      show_button: z.boolean().optional(),
      steps: z.number().int().min(5).max(11).optional(),
      shape: z
        .enum([
          "cat",
          "circle",
          "cloud",
          "crown",
          "dog",
          "droplet",
          "flag",
          "heart",
          "lightbulb",
          "pencil",
          "skull",
          "star",
          "thunderbolt",
          "tick",
          "trophy",
          "up",
          "user",
        ])
        .default("star")
        .optional(),
      labels: z
        .object({
          left: z.string().optional(),
          right: z.string().optional(),
          center: z.string().optional(),
        })
        .optional(),
      start_at_one: z.boolean().optional(),
      structure: z.enum(["MMDDYYYY", "DDMMYYYY", "YYYYMMDD"]).default("DDMMYYYY").optional(),
      separator: z.enum(["/", "-", "."]).default("/").optional(),
      currency: z
        .enum(["AUD", "BRL", "CAD", "CHF", "DKK", "EUR", "GBP", "MXN", "NOK", "SEK", "USD"])
        .default("EUR")
        .optional(),
      email_receipts: z.boolean().optional(),
      additional_payment_methods: z.array(z.string()).optional(),
      price: priceSchema.optional(),
      default_country_code: z.string().default("us").optional(),
      regexp: z.string().optional(),
      allowed_answer_types: z.array(z.string()).optional(),
      fields: z.array(z.lazy(() => fieldSchema)).optional(),
    })
    .passthrough(),
);

// NOTE: kept in sync by hand with fieldPropertiesSchema above — zod can't
// infer a clean type through the recursive `fields` reference. If you add a
// key to the schema, add it here too.
export interface FieldProperties {
  description?: string;
  placeholder?: string;
  choices?: Choice[];
  allow_multiple_selection?: boolean;
  randomize?: boolean;
  allow_other_choice?: boolean;
  vertical_alignment?: boolean;
  supersized?: boolean;
  show_labels?: boolean;
  alphabetical_order?: boolean;
  hide_marks?: boolean;
  button_text?: string;
  show_button?: boolean;
  steps?: number;
  shape?: string;
  labels?: { left?: string; right?: string; center?: string };
  start_at_one?: boolean;
  structure?: "MMDDYYYY" | "DDMMYYYY" | "YYYYMMDD";
  separator?: "/" | "-" | ".";
  currency?: string;
  email_receipts?: boolean;
  additional_payment_methods?: string[];
  price?: z.infer<typeof priceSchema>;
  default_country_code?: string;
  regexp?: string;
  allowed_answer_types?: string[];
  fields?: FormField[];
  [key: string]: unknown;
}

export interface FormField {
  ref?: string;
  title: string;
  type: z.infer<typeof fieldTypeSchema>;
  properties?: FieldProperties;
  validations?: z.infer<typeof validationsSchema>;
  attachment?: z.infer<typeof attachmentSchema>;
  layout?: z.infer<typeof layoutSchema>;
}

export interface Choice {
  ref?: string;
  label: string;
  attachment?: z.infer<typeof attachmentSchema>;
}

export const fieldSchema: z.ZodType<FormField> = z.lazy(() =>
  z.object({
    ref: z.string().optional(),
    title: z.string(),
    type: fieldTypeSchema,
    properties: fieldPropertiesSchema.optional(),
    validations: validationsSchema.optional(),
    attachment: attachmentSchema.optional(),
    layout: layoutSchema.optional(),
  }),
);

// ---------------------------------------------------------------------------
// Declarative Logic Engine — recursive condition/action model
// ---------------------------------------------------------------------------

// --- Value Reference (reusable across conditions, actions, etc.) ----------

export const valueReferenceSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("field"), ref: z.string() }),
    z.object({ type: z.literal("variable"), ref: z.string() }),
    z.object({
      type: z.literal("constant"),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    }),
    z.object({
      type: z.literal("choice"),
      fieldRef: z.string(),
      choiceRef: z.string(),
    }),
    z.object({ type: z.literal("score") }),
    z.object({
      type: z.literal("system"),
      key: z.enum(["currentStep", "currentPage", "progress", "submissionCount"]),
    }),
  ]),
);

// --- Comparison Operators -------------------------------------------------

const comparisonOperatorSchema = z.enum([
  // String
  "equals", "not_equals", "contains", "not_contains",
  "starts_with", "ends_with", "is_empty", "is_not_empty",
  // Number
  "less_than", "less_than_or_equal", "greater_than", "greater_than_or_equal",
  // Date
  "before", "before_or_on", "after", "after_or_on",
  // Boolean
  "is_true", "is_false",
  // Choice
  "is_selected", "is_not_selected",
  // Multi-select
  "contains_choice", "does_not_contain_choice", "contains_any", "contains_all",
  // General
  "always", "never",
]);

// --- Condition (recursive tree) -------------------------------------------

export const conditionSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("condition"),
      source: valueReferenceSchema,
      operator: comparisonOperatorSchema,
      value: valueReferenceSchema.optional(),
    }),
    z.object({
      type: z.literal("group"),
      operator: z.enum(["and", "or"]),
      conditions: z.array(z.lazy(() => conditionSchema)),
    }),
    z.object({
      type: z.literal("not"),
      condition: z.lazy(() => conditionSchema),
    }),
  ]),
);

// --- Action Target --------------------------------------------------------

const actionTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("field"), ref: z.string() }),
  z.object({ type: z.literal("group"), ref: z.string() }),
  z.object({ type: z.literal("thankyou"), ref: z.string() }),
  z.object({ type: z.literal("outcome"), ref: z.string() }),
]);

// --- Logic Action ---------------------------------------------------------

export const logicActionSchema = z.discriminatedUnion("type", [
  // Navigation
  z.object({ type: z.literal("jump"), target: actionTargetSchema }),
  z.object({ type: z.literal("skip_field"), target: z.object({ type: z.literal("field"), ref: z.string() }) }),
  z.object({ type: z.literal("skip_group"), target: z.object({ type: z.literal("group"), ref: z.string() }) }),
  // Visibility
  z.object({ type: z.literal("show_field"), target: z.object({ type: z.literal("field"), ref: z.string() }) }),
  z.object({ type: z.literal("hide_field"), target: z.object({ type: z.literal("field"), ref: z.string() }) }),
  z.object({ type: z.literal("show_group"), target: z.object({ type: z.literal("group"), ref: z.string() }) }),
  z.object({ type: z.literal("hide_group"), target: z.object({ type: z.literal("group"), ref: z.string() }) }),
  // Field behavior
  z.object({ type: z.literal("make_required"), target: z.object({ type: z.literal("field"), ref: z.string() }) }),
  z.object({ type: z.literal("make_optional"), target: z.object({ type: z.literal("field"), ref: z.string() }) }),
  z.object({ type: z.literal("enable_field"), target: z.object({ type: z.literal("field"), ref: z.string() }) }),
  z.object({ type: z.literal("disable_field"), target: z.object({ type: z.literal("field"), ref: z.string() }) }),
  // Value operations
  z.object({ type: z.literal("set_value"), target: actionTargetSchema, value: valueReferenceSchema }),
  z.object({ type: z.literal("clear_value"), target: actionTargetSchema }),
  z.object({ type: z.literal("copy_value"), source: valueReferenceSchema, target: actionTargetSchema }),
  // Variable operations
  z.object({ type: z.literal("set_variable"), target: z.string(), value: valueReferenceSchema }),
  z.object({ type: z.literal("add_variable"), target: z.string(), value: valueReferenceSchema }),
  z.object({ type: z.literal("subtract_variable"), target: z.string(), value: valueReferenceSchema }),
  z.object({ type: z.literal("multiply_variable"), target: z.string(), value: valueReferenceSchema }),
  z.object({ type: z.literal("divide_variable"), target: z.string(), value: valueReferenceSchema }),
  z.object({ type: z.literal("increment_variable"), target: z.string() }),
  z.object({ type: z.literal("decrement_variable"), target: z.string() }),
  // Ending
  z.object({ type: z.literal("end_form"), target: z.object({ type: z.literal("thankyou"), ref: z.string() }).optional() }),
  z.object({ type: z.literal("redirect"), url: z.string().url() }),
]);

// --- Logic Rule -----------------------------------------------------------

export const logicRuleSchema = z.object({
  id: z.string(),
  trigger: z.enum([
    "field_changed", "field_answered", "field_cleared",
    "group_entered", "group_completed",
    "form_started", "form_submitted", "before_submit", "after_submit",
  ]).optional(),
  sourceRefs: z.array(z.string()).optional(),
  priority: z.number().optional(),
  when: conditionSchema,
  then: z.array(logicActionSchema),
});

// --- Scoring Rule ---------------------------------------------------------

export const scoringRuleSchema = z.object({
  id: z.string(),
  fieldRef: z.string(),
  correctAnswers: z.array(z.union([z.string(), z.number()])),
  points: z.number().default(1),
  negativePoints: z.number().optional(),
  partialPoints: z.boolean().optional(),
});

// --- Outcome --------------------------------------------------------------

export const outcomeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  conditions: conditionSchema.optional(),
  priority: z.number().optional(),
  thankyouRef: z.string().optional(),
  redirectUrl: z.string().url().optional(),
});

// --- Variable Definition --------------------------------------------------

export const variableDefinitionSchema = z.object({
  key: z.string(),
  type: z.enum(["number", "string", "boolean", "date"]),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

// --- Calculation Expression -----------------------------------------------

const calculationOperandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("variable"), ref: z.string() }),
  z.object({ type: z.literal("field"), ref: z.string() }),
  z.object({ type: z.literal("constant"), value: z.number() }),
  z.object({ type: z.literal("score") }),
]);

export const calculationExpressionSchema = z.object({
  target: z.string(),
  left: calculationOperandSchema,
  operator: z.enum(["add", "subtract", "multiply", "divide"]),
  right: calculationOperandSchema,
});

// ---------------------------------------------------------------------------
// Screens (welcome / thank you)
// ---------------------------------------------------------------------------

export const welcomeScreenSchema = z.object({
  ref: z.string().optional(),
  title: z.string(),
  properties: z
    .object({
      description: z.string().optional(),
      show_button: z.boolean().optional(),
      button_text: z.string().optional(),
    })
    .optional(),
  attachment: attachmentSchema.optional(),
  layout: layoutSchema.optional(),
});

export const thankyouScreenSchema = z.object({
  ref: z.string().optional(),
  title: z.string(),
  type: z.enum(["thankyou_screen", "url_redirect"]).default("thankyou_screen"),
  properties: z
    .object({
      show_button: z.boolean().optional(),
      button_text: z.string().optional(),
      button_mode: z.enum(["reload", "default_redirect", "redirect"]).optional(),
      redirect_url: z.string().url().optional(),
      share_icons: z.boolean().optional(),
    })
    .optional(),
  attachment: attachmentSchema.optional(),
  layout: layoutSchema.optional(),
});

// ---------------------------------------------------------------------------
// Form settings
// ---------------------------------------------------------------------------

export const formSettingsSchema = z.object({
  language: z.string().length(2).default("en").optional(),
  is_public: z.boolean().default(true).optional(),
  autosave_progress: z.boolean().default(true).optional(),
  progress_bar: z.enum(["percentage", "proportion"]).default("proportion").optional(),
  show_progress_bar: z.boolean().default(true).optional(),
  show_typeform_branding: z.boolean().default(true).optional(),
  show_time_to_complete: z.boolean().optional(),
  show_number_of_submissions: z.boolean().optional(),
  show_cookie_consent: z.boolean().optional(),
  show_question_number: z.boolean().default(true).optional(),
  show_key_hint_on_choices: z.boolean().default(true).optional(),
  hide_navigation: z.boolean().optional(),
  meta: z
    .object({
      title: z.string().optional(),
      allow_indexing: z.boolean().default(true).optional(),
      description: z.string().optional(),
      image: z.object({ href: z.string().url() }).optional(),
    })
    .optional(),
  redirect_after_submit_url: z.string().url().optional(),
  google_analytics: z.string().optional(),
  facebook_pixel: z.string().optional(),
  google_tag_manager: z.string().optional(),
  captcha: z.boolean().optional(),
  quiz: z
    .object({
      enabled: z.boolean().default(false),
      passingScore: z.number().min(0).max(100).optional(),
      showScore: z.boolean().default(true),
      showCorrectAnswers: z.boolean().default(false),
      allowRetake: z.boolean().default(false),
      timeLimit: z.number().int().positive().optional(),
      resultMessage: z
        .object({
          pass: z.string().optional(),
          fail: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  password_protection: z
    .object({
      enabled: z.boolean().default(false),
      mode: z.enum(["passcode", "email"]).default("passcode"),
      prompt: z.string().optional(),
    })
    .optional(),
});

export const quizSettingsSchema = z
  .object({
    enabled: z.boolean().default(false),
    passingScore: z.number().min(0).max(100).optional(),
    showScore: z.boolean().default(true),
    showCorrectAnswers: z.boolean().default(false),
    allowRetake: z.boolean().default(false),
    timeLimit: z.number().int().positive().optional(),
    resultMessage: z
      .object({
        pass: z.string().optional(),
        fail: z.string().optional(),
      })
      .optional(),
  })
  .optional();

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

export const brandingVisibilitySchema = z.enum([
  "welcome",
  "throughout",
  "ending",
  "custom",
  "first-step",
]);
export const brandingPositionSchema = z.enum(["left", "center", "right"]);
export const logoSizeSchema = z.enum(["small", "medium", "large"]);

export const brandingExperienceSchema = z.object({
  visibility: brandingVisibilitySchema.default("welcome"),
  show_on: z
    .object({
      welcome: z.boolean().default(true),
      questions: z.boolean().default(false),
      ending: z.boolean().default(false),
    })
    .optional(),
  position: brandingPositionSchema.default("center"),
});

export const brandingSchema = z.object({
  logo: z
    .object({
      enabled: z.boolean().default(true),
      src: z.string(),
      alt: z.string().default(""),
      size: logoSizeSchema.default("medium"),
    })
    .optional(),
  classical: brandingExperienceSchema.optional(),
  conversational: brandingExperienceSchema.optional(),
});

// ---------------------------------------------------------------------------
// Typeform-compatible surface schemas (used by theme import/export)
// ---------------------------------------------------------------------------

export const typeformThemeBackgroundSchema = z.object({
  layout: z.enum(["fullscreen", "repeat", "no-repeat"]).optional(),
  href: z.string().url().optional(),
  brightness: z.number().min(-1).max(1).optional(),
}).passthrough();

export const typeformThemeColorsSchema = z.object({
  background: z.string().optional(),
  answer: z.string().optional(),
  button: z.string().optional(),
  question: z.string().optional(),
}).passthrough();

export const typeformThemeFieldsSchema = z.object({
  font_size: z.enum(["small", "medium", "large"]).optional(),
  alignment: z.enum(["left", "center"]).optional(),
  font: z.string().optional(),
}).passthrough();

export const typeformThemeScreensSchema = z.object({
  font_size: z.enum(["small", "medium", "large"]).optional(),
  alignment: z.enum(["left", "center"]).optional(),
}).passthrough();

export const typeformThemeSchema = z.object({
  name: z.string().optional(),
  origin: z.enum(["new", "duplicate", "auto-branding"]).optional(),
  sourceThemeId: z.string().optional(),
  background: typeformThemeBackgroundSchema.optional(),
  colors: typeformThemeColorsSchema.optional(),
  fields: typeformThemeFieldsSchema.optional(),
  screens: typeformThemeScreensSchema.optional(),
  font: z.string().optional(),
  hasTransparentButton: z.boolean().optional(),
  roundedCorners: z.enum(["none", "small", "large"]).optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Theme — the ONE canonical, stored theme shape. Every renderer (classic,
// conversational, and any future style) reads a subset of this directly.
// ---------------------------------------------------------------------------

export const themeSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    origin: z.enum(["new", "duplicate", "auto-branding"]).default("new"),
    source_theme_id: z.string().optional(),

    colors: z
      .object({
        background: z.string().default("#FFFFFF"),
        text: z.string().optional(),
        primary: z.string().optional(),
        secondary: z.string().optional(),
        question: z.string().default("#3D3D3D"),
        answer: z.string().default("#4FB0AE"),
        button: z.string().default("#4FB0AE"),
        buttonText: z.string().optional(),
        error: z.string().optional(),
        border: z.string().optional(),
        websiteBackground: z.string().optional(),
      })
      .default({
        background: "#FFFFFF",
        question: "#3D3D3D",
        answer: "#4FB0AE",
        button: "#4FB0AE",
      }),

    typography: z
      .object({
        headingFont: z.string().optional(),
        bodyFont: z.string().optional(),
        fontFamily: z.string().optional(),
        headingSize: z.string().optional(),
        bodySize: z.string().optional(),
        fontSize: z.enum(["xs", "sm", "base", "lg", "xl"]).optional(),
        fontWeight: z.enum(["light", "normal", "medium", "semibold", "bold"]).optional(),
        lineHeight: z.enum(["tight", "normal", "relaxed"]).optional(),
        letterSpacing: z.enum(["tight", "normal", "wide"]).optional(),
        weight: z.string().optional(),
      })
      .default({ fontFamily: "Inter", fontSize: "base", fontWeight: "normal" }),

    fields: z
      .object({
        font_size: z.enum(["small", "medium", "large"]).default("small"),
        alignment: z.enum(["left", "center"]).default("left"),
      })
      .default({ font_size: "small", alignment: "left" }),

    screens: z
      .object({
        font_size: z.enum(["small", "medium", "large"]).default("small"),
        alignment: z.enum(["left", "center"]).default("center"),
      })
      .default({ font_size: "small", alignment: "center" }),

    layout: z
      .object({
        maxWidth: z.string().default("md"),
        questionAlignment: z.enum(["left", "center"]).default("left"),
        spacing: z.enum(["compact", "normal", "relaxed"]).default("normal"),
        padding: z.enum(["none", "sm", "md", "lg"]).optional(),
        margin: z.enum(["none", "sm", "md", "lg"]).optional(),
        alignment: z.enum(["left", "center", "right"]).optional(),
      })
      .default({ maxWidth: "md", questionAlignment: "left", spacing: "normal" }),

    background: z
      .object({
        color: z.string().default("#ffffff"),
        href: z.string().url().optional(),
        imageUrl: z.string().url().optional(),
        layout: z.enum(["fullscreen", "repeat", "no-repeat"]).default("fullscreen"),
        brightness: z.number().min(-1).max(1).default(0),
        overlay: z.number().min(0).max(1).optional(),
      })
      .default({ color: "#ffffff", layout: "fullscreen", brightness: 0 }),

    button: z
      .object({
        radius: z.string().default("8px"),
        style: z.enum(["solid", "outline", "ghost"]).default("solid"),
        transparent: z.boolean().default(false),
      })
      .default({ radius: "8px", style: "solid", transparent: false }),

    branding: brandingSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.origin === "duplicate" && !data.source_theme_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "source_theme_id is required when origin is 'duplicate'",
        path: ["source_theme_id"],
      });
    }
    if (data.origin !== "duplicate" && data.source_theme_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "source_theme_id must not be provided unless origin is 'duplicate'",
        path: ["source_theme_id"],
      });
    }
  });

// ---------------------------------------------------------------------------
// Groups (pages/steps)
// ---------------------------------------------------------------------------

export const formGroupSchema = z.object({
  id: z.string(),
  ref: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  fieldIds: z.array(z.string()),
  layout: z.enum(["single", "two-column", "three-column"]).optional(),
  logic: z.array(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Top-level form
// ---------------------------------------------------------------------------

export const formTypeSchema = z.enum([
  "quiz",
  "classification",
  "score",
  "branching",
  "classification_branching",
  "score_branching",
]);

export const formSchema = z.object({
  id: z.string().optional(),
  mode: z.enum(["conversational", "classic"]).default("classic").optional(),
  title: z.string(),
  type: formTypeSchema.default("quiz").optional(),
  settings: formSettingsSchema.optional(),
  // Either reference a shared theme row by id, or embed a one-off theme.
  theme: z.union([z.object({ themeId: z.string() }), themeSchema]).optional(),
  workspace: z.object({ href: z.string().url() }).optional(),
  hidden: z.array(z.string()).optional(),
  urlParams: z.array(z.string()).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
  variableDefinitions: z.array(variableDefinitionSchema).optional(),
  calculations: z.array(calculationExpressionSchema).optional(),
  welcome_screens: z.array(welcomeScreenSchema).optional(),
  thankyou_screens: z.array(thankyouScreenSchema).optional(),
  fields: z.array(fieldSchema),
  groups: z.array(formGroupSchema).optional(),
  logic: z.array(logicRuleSchema).optional(),
  scoring: z.array(scoringRuleSchema).optional(),
  outcomes: z.array(outcomeSchema).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type Form = z.infer<typeof formSchema>;

export function validateFormSchema(raw: unknown) {
  const result = formSchema.safeParse(raw);
  if (result.success) return { valid: true as const, data: result.data };
  const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  return { valid: false as const, issues };
}
