import type { FormSchema } from "./form-types";

/**
 * Reference forms — the platform's canonical examples of what a complete
 * schema looks like.
 *
 * They serve two purposes:
 *  1. `pnpm seed:sample-forms` inserts them into an account so a human can
 *     open them in the builder and see every feature working end to end.
 *  2. `buildSystemPrompt()` embeds them so the model has real, validated
 *     examples to copy structure from — abstract field descriptions alone
 *     produced forms with no logic, no scoring and no theme.
 *
 * Every schema here passes `formSchema.safeParse`; the seed script asserts
 * that before writing anything to the database.
 */

// ---------------------------------------------------------------------------
// 1. Quiz — scoring, quiz settings, outcomes, branching logic, theme
// ---------------------------------------------------------------------------

/**
 * A scored product-knowledge quiz: three questions, weighted points, a
 * penalty for a wrong answer, a pass mark, per-outcome endings and a branded
 * theme. Exercises `scoring`, `settings.quiz`, `outcomes`, `logic` and
 * `theme` together.
 */
export const sampleQuizForm = {
  title: "Product Knowledge Quiz",
  description: "A three-question assessment with a pass mark and branded results.",
  settings: {
    language: "en",
    is_public: true,
    autosave_progress: true,
    progress_bar: "proportion",
    show_progress_bar: true,
    show_question_number: true,
    show_key_hint_on_choices: true,
    meta: {
      title: "Product Knowledge Quiz",
      description: "Test what you know about the platform.",
      allow_indexing: false,
    },
    quiz: {
      enabled: true,
      passingScore: 60,
      showScore: true,
      showCorrectAnswers: true,
      allowRetake: true,
      resultMessage: {
        pass: "Well done — you scored {score}/{total} ({percentage}%).",
        fail: "You scored {score}/{total} ({percentage}%). You need 60% to pass — try again!",
      },
    },
  },
  fields: [
    {
      ref: "capital_of_france",
      title: "What is the capital of France?",
      type: "multiple_choice",
      properties: {
        description: "Pick the single best answer.",
        choices: [
          { ref: "option_1", label: "Paris" },
          { ref: "option_2", label: "Lyon" },
          { ref: "option_3", label: "Marseille" },
          { ref: "option_4", label: "Nice" },
        ],
      },
      validations: { required: true },
    },
    {
      ref: "http_stateless",
      title: "Is HTTP a stateless protocol?",
      type: "yes_no",
      properties: {
        description: "HTTP treats each request independently.",
        labels: { left: "No", right: "Yes" },
      },
      validations: { required: true },
    },
    {
      ref: "css_purpose",
      title: "Which language adds visual styles to a web page?",
      type: "dropdown",
      properties: {
        choices: [
          { ref: "option_1", label: "CSS" },
          { ref: "option_2", label: "HTML" },
          { ref: "option_3", label: "SQL" },
          { ref: "option_4", label: "Python" },
        ],
      },
      validations: { required: true },
    },
    {
      ref: "confidence",
      title: "How confident are you about the answers above?",
      type: "rating",
      properties: { steps: 5, shape: "star", show_labels: true },
    },
  ],
  scoring: [
    // The capital question is worth double, and a wrong answer costs a point.
    { id: "score_capital", fieldRef: "capital_of_france", correctAnswers: ["Paris"], points: 2 },
    { id: "score_http", fieldRef: "http_stateless", correctAnswers: ["Yes"], points: 1 },
    { id: "score_css", fieldRef: "css_purpose", correctAnswers: ["CSS"], points: 1 },
  ],
  outcomes: [
    {
      id: "outcome_pass",
      title: "Certified!",
      description: "You cleared the 60% pass mark.",
      priority: 0,
      conditions: { type: "condition", source: { type: "score" }, operator: "greater_than_or_equal", value: { type: "constant", value: 3 } },
    },
    {
      id: "outcome_fail",
      title: "Keep learning",
      description: "Review the material and sit the quiz again.",
      priority: 1,
      conditions: { type: "condition", source: { type: "score" }, operator: "less_than", value: { type: "constant", value: 3 } },
    },
  ],
  logic: [
    // Only show the confidence question when they got the CSS question right.
    {
      id: "rule_show_confidence",
      trigger: "field_changed",
      sourceRefs: ["css_purpose"],
      priority: 0,
      when: { type: "condition", source: { type: "field", ref: "css_purpose" }, operator: "equals", value: { type: "constant", value: "CSS" } },
      then: [{ type: "show_field", target: { type: "field", ref: "confidence" } }],
    },
  ],
  theme: {
    origin: "new",
    colors: {
      background: "#FFFFFF",
      text: "#1F2937",
      primary: "#4F46E5",
      question: "#111827",
      answer: "#4F46E5",
      button: "#4F46E5",
      buttonText: "#FFFFFF",
      border: "#E5E7EB",
    },
    typography: { headingFont: "Inter", bodyFont: "Inter", fontWeight: "normal" },
    fields: { font_size: "medium", alignment: "left" },
    screens: { font_size: "medium", alignment: "center" },
    layout: { maxWidth: "md", questionAlignment: "left", spacing: "normal" },
    background: { color: "#FFFFFF", layout: "fullscreen", brightness: 0 },
    button: { radius: "8px", style: "solid", transparent: false },
  },
  thankyou_screens: [
    {
      ref: "quiz_results",
      title: "Thanks for taking the quiz!",
      type: "thankyou_screen",
      properties: {
        description: "Your score is shown above.",
        show_button: true,
        button_text: "Retake the quiz",
        button_mode: "reload",
        heading_alignment: "center",
      },
    },
  ],
} as unknown as FormSchema;

// ---------------------------------------------------------------------------
// 2. Lead capture — recall, URL params, variables, calculations, multi-step
// ---------------------------------------------------------------------------

/**
 * A two-step enterprise demo request. Exercises `urlParams`, `variables`,
 * `calculations`, `groups`, `welcome_screens` and recall interpolation
 * (`{{field:…}}`, `{{variable:…}}`, `{{url:…}}`) in screen copy.
 */
export const sampleLeadForm = {
  title: "Enterprise Demo Request",
  description: "Two-step lead capture with URL attribution and personalized follow-up.",
  settings: {
    language: "en",
    is_public: true,
    autosave_progress: true,
    progress_bar: "percentage",
    show_progress_bar: true,
    show_question_number: true,
    redirect_after_submit_url: "https://example.com/thanks",
    meta: { title: "Enterprise Demo Request", allow_indexing: false },
  },
  urlParams: ["utm_source", "customer_id"],
  variables: { seats: 1, plan_tier: "standard" },
  variableDefinitions: [
    { key: "seats", type: "number", defaultValue: 1 },
    { key: "plan_tier", type: "string", defaultValue: "standard" },
  ],
  calculations: [
    // Quote = seats × 12, capped by nothing — a plain multiply.
    { target: "monthly_estimate", left: { type: "variable", ref: "seats" }, operator: "multiply", right: { type: "constant", value: 12 } },
  ],
  welcome_screens: [
    {
      ref: "welcome",
      title: "Hi {{field:first_name}} — let's set up your demo",
      properties: {
        description: "Source: {{url:utm_source}} · Customer: {{url:customer_id}}",
        show_button: true,
        button_text: "Start",
        heading_alignment: "center",
      },
    },
  ],
  groups: [
    { id: "group_contact", ref: "group_contact", title: "About you", fieldIds: ["first_name", "work_email", "company_size"], layout: "single" },
    { id: "group_needs", ref: "group_needs", title: "Your needs", fieldIds: ["use_case", "seats_input", "annual_budget"], layout: "single" },
  ],
  fields: [
    { ref: "first_name", title: "What's your first name?", type: "short_text", properties: { placeholder: "Ada" }, validations: { required: true, max_length: 60 } },
    { ref: "work_email", title: "What's your work email?", type: "email", properties: { placeholder: "ada@company.com" }, validations: { required: true } },
    {
      ref: "company_size",
      title: "How many people are in your company?",
      type: "multiple_choice",
      properties: {
        choices: [
          { ref: "option_1", label: "1–10" },
          { ref: "option_2", label: "11–50" },
          { ref: "option_3", label: "51–200" },
          { ref: "option_4", label: "201+" },
        ],
      },
      validations: { required: true },
    },
    {
      ref: "use_case",
      title: "What will you mainly use it for?",
      type: "checkbox",
      properties: {
        allow_multiple_selection: true,
        choices: [
          { ref: "option_1", label: "Internal forms" },
          { ref: "option_2", label: "Customer surveys" },
          { ref: "option_3", label: "Lead capture" },
          { ref: "option_4", label: "Quizzes and assessments" },
        ],
      },
      validations: { required: true },
    },
    { ref: "seats_input", title: "How many seats do you need?", type: "number", properties: { placeholder: "25" }, validations: { required: true, min_value: 1 } },
    // Hidden until the respondent says they are 51+ people.
    { ref: "annual_budget", title: "What is your annual budget?", type: "dropdown", properties: {
      choices: [
        { ref: "option_1", label: "Under $5k" },
        { ref: "option_2", label: "$5k–$20k" },
        { ref: "option_3", label: "$20k+" },
      ],
    } },
  ],
  logic: [
    // "51–50" and above reveals the budget question.
    {
      id: "rule_show_budget",
      trigger: "field_changed",
      sourceRefs: ["company_size"],
      priority: 0,
      when: {
        type: "group",
        operator: "or",
        conditions: [
          { type: "condition", source: { type: "field", ref: "company_size" }, operator: "equals", value: { type: "constant", value: "51–200" } },
          { type: "condition", source: { type: "field", ref: "company_size" }, operator: "equals", value: { type: "constant", value: "201+" } },
        ],
      },
      then: [{ type: "show_field", target: { type: "field", ref: "annual_budget" } }],
    },
    // Copy the seat count into the `seats` variable so the calculation runs.
    {
      id: "rule_capture_seats",
      trigger: "field_changed",
      sourceRefs: ["seats_input"],
      priority: 1,
      when: { type: "condition", source: { type: "field", ref: "seats_input" }, operator: "is_not_empty" },
      then: [{ type: "set_variable", target: "seats", value: { type: "field", ref: "seats_input" } }],
    },
  ],
  theme: {
    origin: "new",
    colors: { background: "#FFFFFF", primary: "#0F766E", question: "#134E4A", answer: "#0F766E", button: "#0F766E", buttonText: "#FFFFFF", border: "#D1D5DB" },
    typography: { headingFont: "Inter", bodyFont: "Inter" },
    fields: { font_size: "medium", alignment: "left" },
    screens: { font_size: "medium", alignment: "center" },
    layout: { maxWidth: "md", questionAlignment: "left", spacing: "normal" },
    background: { color: "#FFFFFF", layout: "fullscreen", brightness: 0 },
    button: { radius: "6px", style: "solid", transparent: false },
  },
  thankyou_screens: [
    {
      ref: "default_thankyou",
      title: "Thanks, {{field:first_name}}!",
      type: "thankyou_screen",
      properties: {
        description: "We'll email {{field:work_email}} within one business day.",
        show_button: true,
        button_text: "Back to site",
        button_mode: "redirect",
        redirect_url: "https://example.com",
        share_icons: true,
      },
    },
  ],
} as unknown as FormSchema;

// ---------------------------------------------------------------------------
// 3. Gate — password protection, every answer type, dark theme, redirect
// ---------------------------------------------------------------------------

/**
 * A password-protected internal request form. Exercises the broad field-type
 * surface (matrix, ranking, opinion scale, NPS, tags, date, file upload,
 * signature, contact info, statement, divider, banner), `settings.captcha`,
 * `hide_navigation` and a dark theme. Password protection is stored on the
 * `form` row, never in the schema — the schema carries only the flag.
 */
export const sampleGateForm = {
  title: "Internal IT Access Request",
  description: "Staff-only request form. Every answer type, dark theme, gated by password.",
  settings: {
    language: "en",
    is_public: false,
    autosave_progress: true,
    progress_bar: "proportion",
    show_progress_bar: true,
    show_question_number: false,
    show_time_to_complete: true,
    hide_navigation: false,
    captcha: true,
    meta: { title: "IT Access Request", allow_indexing: false },
  },
  fields: [
    { ref: "intro_banner", title: "", type: "banner", properties: { banner_variant: "info", banner_title: "Internal use only", description: "Raise one request per system. Anything urgent goes to the on-call channel.", align: "center" } },
    { ref: "requester", title: "Who is this request for?", type: "contact_info", properties: { placeholder: "Your details" }, validations: { required: true } },
    { ref: "start_date", title: "When should access start?", type: "date", properties: { structure: "DDMMYYYY", separator: "/" }, validations: { required: true } },
    { ref: "systems", title: "Which systems do you need?", type: "checkbox", properties: {
      allow_multiple_selection: true,
      choices: [
        { ref: "option_1", label: "GitHub" },
        { ref: "option_2", label: "Jira" },
        { ref: "option_3", label: "Figma" },
        { ref: "option_4", label: "AWS Console" },
      ],
    }, validations: { required: true } },
    { ref: "priority", title: "How urgent is this?", type: "opinion_scale", properties: { steps: 7, start_at_one: true, show_labels: true, labels: { left: "Whenever", right: "Today" } } },
    { ref: "satisfaction", title: "How satisfied are you with the current setup?", type: "nps", properties: { steps: 11 } },
    { ref: "justification", title: "Why do you need access?", type: "long_text", properties: { placeholder: "A sentence or two is plenty.", divider_text: "" }, validations: { required: true, max_length: 500 } },
    { ref: "approvers", title: "Who should review this?", type: "ranking", properties: {
      choices: [
        { ref: "option_1", label: "Line manager" },
        { ref: "option_2", label: "Security" },
        { ref: "option_3", label: "Finance" },
      ],
    } },
    { ref: "software_tags", title: "Any extra software we should know about?", type: "tags", properties: { placeholder: "Type a name and press Enter", max_tags: 8, allow_duplicates: false } },
    { ref: "dept_matrix", title: "Which department owns each system?", type: "matrix", properties: { fields: [] } },
    { ref: "approved", title: "I confirm my manager has approved this request.", type: "yes_no", properties: { labels: { left: "No", right: "Yes" } }, validations: { required: true } },
    { ref: "signature", title: "Sign to submit", type: "signature", properties: {} },
    { ref: "attachment", title: "Attach any supporting document", type: "file_upload", properties: {} },
    { ref: "divider_1", title: "", type: "divider", properties: { align: "center", divider_style: "dotted", divider_text: "End of request" } },
    { ref: "closing_statement", title: "Thanks — IT reviews requests every weekday at 09:00.", type: "statement", properties: { align: "center", show_button: true, button_text: "Submit request" } },
  ],
  logic: [
    // Refuse to proceed until the approval checkbox is "Yes".
    {
      id: "rule_require_approval",
      trigger: "field_changed",
      sourceRefs: ["approved"],
      priority: 0,
      when: { type: "condition", source: { type: "field", ref: "approved" }, operator: "is_false" },
      then: [{ type: "make_required", target: { type: "field", ref: "justification" } }],
    },
  ],
  theme: {
    origin: "new",
    colors: { background: "#0B1120", text: "#E5E7EB", primary: "#22D3EE", question: "#F8FAFC", answer: "#22D3EE", button: "#22D3EE", buttonText: "#0B1120", border: "#1F2937" },
    typography: { headingFont: "Inter", bodyFont: "Inter", fontWeight: "normal" },
    fields: { font_size: "medium", alignment: "left" },
    screens: { font_size: "medium", alignment: "center" },
    layout: { maxWidth: "lg", questionAlignment: "left", spacing: "normal" },
    background: { color: "#0B1120", layout: "fullscreen", brightness: -0.2 },
    button: { radius: "9999px", style: "solid", transparent: false },
  },
  thankyou_screens: [
    {
      ref: "default_thankyou",
      title: "Request received",
      type: "thankyou_screen",
      properties: { description: "You'll get a ticket number by email.", show_button: false },
    },
  ],
} as unknown as FormSchema;

/** The three reference forms, in the order they are seeded and taught. */
export const SAMPLE_FORMS: ReadonlyArray<{
  /** Stable key, also the slug used by the seeded rows. */
  slug: string;
  passwordProtected: boolean;
  schema: FormSchema;
}> = [
  { slug: "product-knowledge-quiz", passwordProtected: false, schema: sampleQuizForm },
  { slug: "enterprise-demo-request", passwordProtected: false, schema: sampleLeadForm },
  { slug: "it-access-request", passwordProtected: true, schema: sampleGateForm },
];
