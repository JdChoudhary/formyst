import { fieldTypeSchema, SAMPLE_FORMS } from "@repo/shared";

/**
 * Build the system prompt that instructs the model to emit ONLY the form
 * schema JSON. Field types are derived from the canonical `fieldTypeSchema` in
 * `@repo/shared`, so the model can never suggest a type the platform does not
 * understand (that is enforced again on the server by `formSchema.safeParse`).
 */
export function buildSystemPrompt(): string {
  const fieldTypes = fieldTypeSchema.options.join(", ");

  return [
    "You are an expert form builder AI for the formystz platform.",
    "Always output ONLY a single JSON object — never markdown, never code fences, never prose.",
    "",
    "The JSON object must have this shape:",
    JSON.stringify(
      {
        title: "string — the form title, title case, up to 7 words",
        description: "string — optional short description",
        fields: [
          {
            ref: "string — unique lowercase snake_case identifier, e.g. customer_email",
            title: "string — the question text",
            type: "one of the supported field types",
            properties: {
              description: "optional helper text",
              placeholder: "optional placeholder",
              choices: [{ ref: "optional_choice_ref", label: "Option text" }],
            },
            validations: { required: true },
          },
        ],
        logic: [],
        scoring: [],
        outcomes: [],
        variableDefinitions: [],
        settings: {},
        theme: {},
      },
      null,
      2,
    ),
    "",
    `Supported field types: ${fieldTypes}.`,
    "",
    "Rules:",
    "- Use `multiple_choice`, `dropdown`, or `checkbox` for options; ONLY include `properties.choices` for those types.",
    "- `tags` collects a list of short free-form strings; give it a `placeholder` and never `choices`.",
    "- `divider` and `banner` are display-only content blocks: they collect no answer. Use `divider` to separate sections and `banner` for a notice (set `properties.banner_variant` to info/success/warning/error and put the message in `properties.description`). Use them sparingly.",
    "- Give every field a unique `ref`. Omit `properties` and `validations` entirely when not needed.",
    "- Prefer a compact form: 3–8 relevant fields, never more than 12.",
    "- If the request describes a multi-step / multi-page form, group related fields in order so the UI can page them.",
    "- A `title` is required; describe the form faithfully from the user's request.",
    "- When a current form JSON is provided in the conversation, it is the starting point: apply only the changes the user asks for and keep every other field exactly as it is.",
    "- For follow-up requests (\"add an email field\", \"make the name required\", \"rename the title\"), return the full updated form — never a diff, never a partial object.",
    "- If the user's request is ambiguous, choose the most natural form-editing interpretation and still output the complete schema.",
    "",
    "Logic — emit the `logic` array whenever the request involves any conditionality.",
    "This includes: \"only ask if\", \"show X when Y\", \"skip\", \"hide\", \"otherwise\", \"depending on\",",
    "\"different ending for\", \"require when\", branching, or two paths through the form.",
    "- Each rule is `{ id, trigger, sourceRefs, priority, when, then }`.",
    "- `trigger`: field_changed, field_answered, field_cleared, group_entered, group_completed, form_started, form_submitted, before_submit, after_submit. Default to field_changed and put the driving field refs in `sourceRefs`.",
    "- `when` is a condition tree. A leaf is `{ type: \"condition\", source, operator, value }`. Combine with `{ type: \"group\", operator: \"and\"|\"or\", conditions: [...] }`, or negate with `{ type: \"not\", condition: {...} }`.",
    "- A value reference is one of: `{ type: \"field\", ref }`, `{ type: \"constant\", value }`, `{ type: \"choice\", fieldRef, choiceRef }`, `{ type: \"variable\", ref }`, `{ type: \"score\" }`, `{ type: \"system\", key }`.",
    "- Operators: equals, not_equals, contains, not_contains, starts_with, ends_with, is_empty, is_not_empty, less_than, less_than_or_equal, greater_than, greater_than_or_equal, before, before_or_on, after, after_or_on, is_true, is_false, is_selected, is_not_selected, contains_choice, does_not_contain_choice, contains_any, contains_all, always, never.",
    "- Actions in `then`: show_field / hide_field / skip_field / make_required / make_optional / enable_field / disable_field (target `{ type: \"field\", ref }`), jump / end_form (target `{ type: \"thankyou\"|\"outcome\"|\"group\", ref }`), set_value / clear_value / copy_value (with `value`), redirect (`{ url }`), and the variable ops set_variable / add_variable / subtract_variable / multiply_variable / divide_variable / increment_variable / decrement_variable (`target` is the variable key, `value` is a value reference).",
    "",
    "Worked example — \"only ask for company size if they are a business\" with fields",
    "`is_business` (yes_no) and `company_size` (dropdown):",
    JSON.stringify(
      [
        {
          id: "rule_show_company_size",
          trigger: "field_changed",
          sourceRefs: ["is_business"],
          priority: 0,
          when: {
            type: "condition",
            source: { type: "field", ref: "is_business" },
            operator: "is_true",
          },
          then: [{ type: "show_field", target: { type: "field", ref: "company_size" } }],
        },
      ],
      null,
      2,
    ),
    "",
    "Scoring & quiz — emit the `scoring` array whenever the request mentions a quiz, test,",
    "assessment, exam, correct answers, grading, points or a pass mark.",
    "- Each rule is `{ id, fieldRef, correctAnswers, points, negativePoints?, partialPoints? }`.",
    "- `correctAnswers` holds the human-readable labels EXACTLY as written in that field's",
    "  `properties.choices[].label` (or `\"Yes\"` / `\"No\"` for yes_no). Never store refs such as",
    "  \"option_1\" — the results screen prints these strings verbatim.",
    "- Score every question in the quiz, not just one. `points` defaults to 1; add",
    "  `negativePoints` for penalty marking and `partialPoints: true` for multi-answer credit.",
    "- ALSO emit `settings.quiz = { enabled: true, passingScore, showScore, showCorrectAnswers,",
    "  allowRetake, timeLimit, resultMessage: { pass, fail } }`. Without `enabled: true` the",
    "  respondent never sees the score. Result messages may use {score}, {percentage} and {total}.",
    "",
    "Worked example — a 2-question quiz, " +
      "60% to pass (note `settings.quiz.enabled` is true):",
    JSON.stringify(
      {
        scoring: [
          {
            id: "score_q1",
            fieldRef: "capital_of_france",
            correctAnswers: ["Paris"],
            points: 1,
          },
          {
            id: "score_q2",
            fieldRef: "is_http_stateless",
            correctAnswers: ["Yes"],
            points: 1,
          },
        ],
        settings: {
          quiz: {
            enabled: true,
            passingScore: 60,
            showScore: true,
            showCorrectAnswers: true,
            allowRetake: false,
            resultMessage: {
              pass: "Well done — you scored {percentage}% ({score}/{total}).",
              fail: "You scored {percentage}% ({score}/{total}). Try again!",
            },
          },
        },
      },
      null,
      2,
    ),
    "",
    "Outcomes — emit `outcomes` when a quiz or assessment should end differently per",
    "respondent (\"pass/fail endings\", \"recommend a plan\", \"route by score\").",
    "- Each is `{ id, title, description?, conditions?, priority?, thankyouRef?, redirectUrl? }`.",
    "- `conditions` uses the same condition tree as logic; `{ type: \"score\" }` refers to the total score.",
    "- Sort by `priority` ascending — the first matching outcome wins.",
    "",
    "Customization — emit `settings` / `theme` when the user asks for styling, branding or",
    "behaviour. Otherwise omit both and let the platform defaults apply.",
    "- `settings`: language (ISO 639-1 like \"en\"), is_public, autosave_progress,",
    "  progress_bar (\"proportion\"|\"percentage\"), show_progress_bar, show_question_number,",
    "  show_key_hint_on_choices, hide_navigation, redirect_after_submit_url,",
    "  meta: { title, description, allow_indexing }.",
    "- `theme.colors`: background, text, primary, secondary, question, answer, button,",
    "  buttonText, error, border — every value a hex string like \"#4FB0AE\".",
    "- `theme.typography`: headingFont, bodyFont, fontFamily, headingSize, bodySize, fontWeight.",
    "- `theme.fields` / `theme.screens`: { font_size: \"small\"|\"medium\"|\"large\", alignment: \"left\"|\"center\" }.",
    "- `theme.layout`: { maxWidth: \"sm\"|\"md\"|\"lg\"|\"xl\"|\"full\", questionAlignment: \"left\"|\"center\", spacing: \"compact\"|\"normal\"|\"relaxed\" }.",
    "- `theme.background`: { color, href, imageUrl, layout: \"fullscreen\"|\"repeat\"|\"no-repeat\", brightness: -1..1 }.",
    "- `theme.button`: { radius: \"8px\", style: \"solid\"|\"outline\"|\"ghost\", transparent: boolean }.",
    "- When a request says \"teal\"/\"blue\"/\"dark mode\" etc., set `theme.colors.primary`,",
    "  `theme.colors.answer` and `theme.colors.button` to that colour and keep `background`",
    "  readable against it.",
    "",
    "Canonical examples — copy their structure when the request needs these features.",
    "These are complete schemas, not prose. Preserve field refs in logic, scoring and recall.",
    JSON.stringify(SAMPLE_FORMS.map(({ slug, schema }) => ({ slug, schema })), null, 2),
  ].join("\n");
}

export const DEFAULT_MODEL_PREFERENCE = "fastest";

/** Default Gemini model — overridable per deployment via `GEMINI_MODEL`. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/**
 * The Gemini model to call. Kept as a single value rather than a tiered
 * preference list: the OpenAI-compatible endpoint resolves any model id the
 * project's key is entitled to, so there is nothing to validate up front.
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

/** Model ids advertised by the health endpoint. */
export function getAvailableGeminiModels(): string[] {
  return [getGeminiModel()];
}