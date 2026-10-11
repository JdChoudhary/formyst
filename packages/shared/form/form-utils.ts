import { z } from "zod";
import { formSchema, themeSchema } from "./form-schema";
import type {
  FormSchema,
  FormField,
  Choice,
  FieldOption,
  ThankyouScreen,
  WelcomeScreen,
  FormSettings,
  Theme,
  Condition,
  LogicAction,
  ValueReference,
} from "./form-types";

/* ============================================================================
 * Id / ref helpers
 * ========================================================================== */

export function createFieldId(prefix = "field"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createRef(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `q_${Math.random().toString(36).slice(2, 7)}`;
}

export function createOption(label: string): FieldOption {
  return { ref: createRef(label), label };
}

export function createId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ============================================================================
 * Field accessors
 * ========================================================================== */

export function getFields(schema: FormSchema): FormField[] {
  return schema.fields ?? [];
}

export function getFieldByRef(
  schema: FormSchema,
  ref: string | null | undefined,
): FormField | undefined {
  if (!ref) return undefined;
  return (schema.fields ?? []).find((f) => f.ref === ref);
}

export function getFieldById(
  schema: FormSchema,
  ref: string | null | undefined,
): FormField | undefined {
  return getFieldByRef(schema, ref);
}

export function getChoiceById(field: FormField, choiceRef: string | undefined): Choice | undefined {
  if (!choiceRef) return undefined;
  const choices = getFieldOptions(field);
  return choices.find((c) => c.ref === choiceRef || c.label === choiceRef);
}

export function getFieldOptions(field: FormField): FieldOption[] {
  return (field.properties?.choices ?? []).filter(
    (c): c is FieldOption => !!c && typeof c === "object" && "label" in c,
  );
}

export function getWelcomeScreen(schema: FormSchema): WelcomeScreen | undefined {
  return (schema.welcome_screens ?? [])[0];
}

export function getDefaultThankyou(schema: FormSchema): ThankyouScreen | undefined {
  return (schema.thankyou_screens ?? [])[0];
}

export function getThankyouByRef(schema: FormSchema, ref: string): ThankyouScreen | undefined {
  return (schema.thankyou_screens ?? []).find((t) => t.ref === ref);
}

export function getDefaultEnding(schema: FormSchema): ThankyouScreen | undefined {
  return getDefaultThankyou(schema);
}

export function getEndingByRef(schema: FormSchema, ref: string): ThankyouScreen | undefined {
  return getThankyouByRef(schema, ref);
}

export function isMultiStep(schema: FormSchema): boolean {
  return (schema.groups?.length ?? 0) > 1;
}

export function classifyNps(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

/* ============================================================================
 * Normalization
 * ========================================================================== */

export function normalizeFormSchema(raw: unknown): FormSchema {
  const parsed = formSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  throw new Error("Invalid form schema");
}

export function normalizeFormSchemaSafe(raw: unknown): FormSchema | null {
  try {
    return normalizeFormSchema(raw);
  } catch {
    return null;
  }
}

/* ============================================================================
 * Defaults
 * ========================================================================== */

export const DEFAULT_THEME: Theme = {
  id: "theme_default",
  name: "Default",
  origin: "new",
  colors: {
    background: "#ffffff",
    text: "#1f2937",
    primary: "#3b82f6",
    question: "#3D3D3D",
    answer: "#4FB0AE",
    button: "#4FB0AE",
    border: "#e5e7eb",
  },
  typography: {
    fontFamily: "Inter",
    fontSize: "base",
    fontWeight: "normal",
    lineHeight: "normal",
    letterSpacing: "normal",
  },
  layout: {
    maxWidth: "md",
    questionAlignment: "left",
    spacing: "normal",
    padding: "lg",
    margin: "md",
    alignment: "left",
  },
  background: { color: "#ffffff", layout: "fullscreen", brightness: 0 },
  fields: { alignment: "left", font_size: "medium" },
  screens: { alignment: "center", font_size: "small" },
  button: { radius: "8px", style: "solid", transparent: false },
};

export function ensureSchemaDefaults(schema: FormSchema): FormSchema {
  const theme =
    schema.theme && "colors" in schema.theme
      ? ({ ...DEFAULT_THEME, ...schema.theme } as Theme)
      : DEFAULT_THEME;
  const settingsDefaults: FormSettings = {
    language: "en",
    progress_bar: "proportion",
    show_progress_bar: true,
    show_typeform_branding: true,
    show_question_number: true,
    show_key_hint_on_choices: true,
    autosave_progress: true,
    is_public: true,
  };
  return {
    ...schema,
    mode: schema.mode ?? "classic",
    settings: { ...settingsDefaults, ...schema.settings },
    theme,
    fields: schema.fields ?? [],
    // Seed a default ending only when the key is absent. An explicit empty
    // array means the author deleted the screen and it must stay deleted —
    // otherwise normalization would silently resurrect it on every save.
    thankyou_screens: schema.thankyou_screens ?? [
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
    welcome_screens: schema.welcome_screens ?? [],
    hidden: schema.hidden ?? [],
    urlParams: schema.urlParams ?? schema.hidden ?? [],
    variables: schema.variables ?? {},
    logic: schema.logic ?? [],
    scoring: schema.scoring ?? [],
    outcomes: schema.outcomes ?? [],
  };
}

/* ============================================================================
 * Hidden fields (URL params)
 * ========================================================================== */

/**
 * Every URL parameter declared on the form.
 *
 * `urlParams` is the canonical name; `hidden` is the legacy alias still
 * written by older schemas. Both are merged (and de-duplicated) so forms
 * saved under either key keep working.
 */
export function getUrlParams(schema: Pick<FormSchema, "hidden" | "urlParams">): string[] {
  const merged = [...(schema.urlParams ?? []), ...(schema.hidden ?? [])];
  return merged.filter((key, index) => key !== "" && merged.indexOf(key) === index);
}

export function resolveHiddenValues(
  schema: FormSchema,
  params: Record<string, string | undefined>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const ref of getUrlParams(schema)) {
    const raw = params[ref];
    if (raw !== undefined && raw !== null && raw !== "") {
      values[ref] = raw;
    }
  }

  // URL-backed prepopulation is also available as a hidden value so the
  // logic engine, recall tokens, and public renderers all resolve it the same
  // way. The field itself remains visible and can submit the resolved value.
  for (const field of schema.fields ?? []) {
    const prepopulation = (
      field as FormField & {
        prepopulation?: {
          enabled?: boolean;
          source?: string;
          config?: { urlParam?: string; fallbackValue?: unknown };
        };
      }
    ).prepopulation;
    if (!prepopulation?.enabled || prepopulation.source !== "url") continue;

    const ref = field.ref ?? "";
    const urlParam = prepopulation.config?.urlParam;
    if (!ref || !urlParam) continue;

    const raw = params[urlParam];
    if (raw !== undefined && raw !== null && raw !== "") {
      values[ref] = raw;
    } else if (prepopulation.config?.fallbackValue !== undefined) {
      values[ref] = prepopulation.config.fallbackValue;
    }
  }

  return values;
}

/* ============================================================================
 * Interpolation
 * ========================================================================== */

/**
 * Resolve a single recall reference to a concrete value.
 *
 * Field answers take priority. Hidden fields (URL parameters) never collect a
 * question answer, so when the answer is missing we fall back to the hidden
 * value map. Returns `undefined` when neither source has a usable value so the
 * caller can render a blank placeholder.
 */
function resolveRecallValue(
  key: string,
  answers: Record<string, unknown>,
  hidden: Record<string, unknown>,
): unknown {
  const answer = answers[key];
  if (answer !== undefined && answer !== null && answer !== "") return answer;

  const hiddenValue = hidden[key];
  if (hiddenValue !== undefined && hiddenValue !== null && hiddenValue !== "") {
    return hiddenValue;
  }

  return undefined;
}

export function interpolateRecall(
  text: string,
  schema: FormSchema,
  answers: Record<string, unknown>,
  variables: Record<string, unknown>,
  hidden: Record<string, unknown> = {},
): string {
  if (!text) return "";

  // Placeholder for unresolved recall references
  const BLANK = "__";

  // 1. Handle new-style {{type:key}} tokens (used by the builder)
  //    If the referenced field has no answer yet, show ____ blank placeholder.
  let result = text.replace(
    /\{\{(field|variable|var|url_param|url|score|price)(?::([^}]+))\}\}/g,
    (_match, type: string, key: string) => {
      switch (type) {
        case "field": {
          // Hidden fields are referenced by their ref but only ever hold a
          // value from the URL params (the hidden map), never an answer.
          const value = resolveRecallValue(key, answers, hidden);
          if (value === undefined || value === null || value === "") return BLANK;
          return Array.isArray(value) ? value.join(", ") : String(value);
        }
        case "variable":
        case "var": {
          const v = variables[key];
          if (v === undefined || v === null) return BLANK;
          return String(v);
        }
        case "url_param":
        case "url": {
          const h = hidden[key];
          if (h === undefined || h === null) return BLANK;
          return String(h);
        }
        case "score": {
          const s = variables["score"];
          return s !== undefined && s !== null ? String(s) : BLANK;
        }
        case "price": {
          const p = variables["price"];
          return p !== undefined && p !== null ? String(p) : BLANK;
        }
        default:
          return BLANK;
      }
    },
  );

  // 2. Handle old-style @key tokens (backward compatibility)
  result = result.replace(/@([a-zA-Z0-9_-]+)/g, (_match, key) => {
    const field = (schema.fields ?? []).find((f) => f.ref === key);
    if (field) {
      // Prefer the answer, fall back to a hidden (URL param) value.
      const value = resolveRecallValue(key, answers, hidden);
      if (value === undefined) return BLANK;
      return Array.isArray(value) ? value.join(", ") : String(value);
    }
    if (key in variables) {
      const v = variables[key];
      return v === undefined || v === null ? BLANK : String(v);
    }
    if (key in hidden) {
      const h = hidden[key];
      return h === undefined || h === null ? BLANK : String(h);
    }
    return BLANK;
  });

  return result;
}

/* ============================================================================
 * Schema parsing
 * ========================================================================== */

export function safeParseFormSchema(raw: unknown) {
  return formSchema.safeParse(raw);
}

export function safeParseTheme(raw: unknown) {
  return themeSchema.safeParse(raw);
}

/* ============================================================================
 * Backward-compatible logic helpers
 *
 * These thin wrappers preserve the API surface used by existing renderers
 * (conversational-form.tsx, form-runtime-preview.tsx) while delegating to
 * the new declarative condition/action model.
 * ========================================================================== */

export interface LogicContext {
  schema: FormSchema;
  answers: Record<string, unknown>;
  variables: Record<string, unknown>;
  hidden: Record<string, unknown>;
}

export interface LogicOutcome {
  jumpTo: string | "thankyou" | undefined;
  thankyouRef: string | undefined;
  variables: Record<string, unknown>;
  /** Field refs explicitly shown by logic rules */
  shownFields: Set<string>;
  /** Field refs explicitly hidden by logic rules */
  hiddenFields: Set<string>;
  /** Group refs explicitly hidden by logic rules */
  hiddenGroups: Set<string>;
  /** Fields made required by logic rules */
  requiredFields: Set<string>;
  /** Fields made optional by logic rules */
  optionalFields: Set<string>;
  /** Fields explicitly disabled by logic rules */
  disabledFields: Set<string>;
  /** Fields explicitly enabled by logic rules */
  enabledFields: Set<string>;
  /** Field/group refs to skip */
  skipRefs: string[];
}

function resolveConditionValue(ref: ValueReference, ctx: LogicContext): unknown {
  switch (ref.type) {
    case "field":
      return ctx.answers[ref.ref];
    case "variable":
      return ctx.variables[ref.ref];
    case "constant":
      return ref.value;
    case "choice":
      return ctx.answers[ref.fieldRef] === ref.choiceRef;
    case "score":
      return 0;
    case "system":
      return undefined;
    default:
      return undefined;
  }
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return Array.isArray(v) ? v.join(",") : String(v);
}

function evaluateLeafCondition(
  source: ValueReference,
  operator: string,
  value: ValueReference | undefined,
  ctx: LogicContext,
): boolean {
  const left = resolveConditionValue(source, ctx);
  const right = value ? resolveConditionValue(value, ctx) : undefined;

  switch (operator) {
    case "always":
      return true;
    case "never":
      return false;
    case "equals":
    case "is":
      return asString(left) === asString(right);
    case "not_equals":
    case "is_not":
      return asString(left) !== asString(right);
    case "contains":
      return asString(left).toLowerCase().includes(asString(right).toLowerCase());
    case "not_contains":
      return !asString(left).toLowerCase().includes(asString(right).toLowerCase());
    case "starts_with":
      return asString(left).toLowerCase().startsWith(asString(right).toLowerCase());
    case "ends_with":
      return asString(left).toLowerCase().endsWith(asString(right).toLowerCase());
    case "is_empty":
      return (
        left === undefined ||
        left === null ||
        left === "" ||
        (Array.isArray(left) && left.length === 0)
      );
    case "is_not_empty":
      return !(
        left === undefined ||
        left === null ||
        left === "" ||
        (Array.isArray(left) && left.length === 0)
      );
    case "less_than": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a < b;
    }
    case "less_than_or_equal": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a <= b;
    }
    case "greater_than": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a > b;
    }
    case "greater_than_or_equal": {
      const a = asNumber(left);
      const b = asNumber(right);
      return a !== null && b !== null && a >= b;
    }
    case "is_true":
      return left === true || left === "yes";
    case "is_false":
      return left === false || left === "no";
    case "is_selected":
      return Array.isArray(left) ? left.includes(right) : left === right;
    case "is_not_selected":
      return Array.isArray(left) ? !left.includes(right) : left !== right;
    default:
      return false;
  }
}

function evaluateConditionTree(condition: Condition, ctx: LogicContext): boolean {
  switch (condition.type) {
    case "condition":
      return evaluateLeafCondition(condition.source, condition.operator, condition.value, ctx);
    case "group": {
      if (condition.operator === "and") {
        return condition.conditions.every((c: Condition) => evaluateConditionTree(c, ctx));
      }
      return condition.conditions.some((c: Condition) => evaluateConditionTree(c, ctx));
    }
    case "not":
      return !evaluateConditionTree(condition.condition, ctx);
    default:
      return false;
  }
}

function applyLogicAction(action: LogicAction, ctx: LogicContext, outcome: LogicOutcome): void {
  switch (action.type) {
    case "jump": {
      const t = action.target;
      if (t.type === "thankyou" || t.type === "outcome") {
        outcome.jumpTo = "thankyou";
        outcome.thankyouRef = t.ref;
      } else {
        outcome.jumpTo = t.ref;
      }
      break;
    }
    case "set_variable":
      outcome.variables[action.target] = resolveConditionValue(action.value, ctx);
      break;
    case "add_variable":
    case "subtract_variable":
    case "multiply_variable":
    case "divide_variable": {
      const cur = asNumber(outcome.variables[action.target]) ?? 0;
      const val = asNumber(resolveConditionValue(action.value, ctx)) ?? 0;
      if (action.type === "add_variable") outcome.variables[action.target] = cur + val;
      else if (action.type === "subtract_variable") outcome.variables[action.target] = cur - val;
      else if (action.type === "multiply_variable") outcome.variables[action.target] = cur * val;
      else if (action.type === "divide_variable")
        outcome.variables[action.target] = val === 0 ? cur : cur / val;
      break;
    }
    case "increment_variable": {
      const cur = asNumber(outcome.variables[action.target]) ?? 0;
      outcome.variables[action.target] = cur + 1;
      break;
    }
    case "decrement_variable": {
      const cur = asNumber(outcome.variables[action.target]) ?? 0;
      outcome.variables[action.target] = cur - 1;
      break;
    }
    // Visibility
    case "show_field":
      outcome.shownFields.add(action.target.ref);
      outcome.hiddenFields.delete(action.target.ref);
      break;
    case "hide_field":
      outcome.hiddenFields.add(action.target.ref);
      outcome.shownFields.delete(action.target.ref);
      break;
    case "show_group":
      outcome.hiddenGroups.delete(action.target.ref);
      break;
    case "hide_group":
      outcome.hiddenGroups.add(action.target.ref);
      break;
    // Field behavior
    case "make_required":
      outcome.requiredFields.add(action.target.ref);
      outcome.optionalFields.delete(action.target.ref);
      break;
    case "make_optional":
      outcome.optionalFields.add(action.target.ref);
      outcome.requiredFields.delete(action.target.ref);
      break;
    case "enable_field":
      outcome.enabledFields.add(action.target.ref);
      outcome.disabledFields.delete(action.target.ref);
      break;
    case "disable_field":
      outcome.disabledFields.add(action.target.ref);
      outcome.enabledFields.delete(action.target.ref);
      break;
    // Skip
    case "skip_field":
      outcome.skipRefs.push(action.target.ref);
      break;
    case "skip_group":
      outcome.skipRefs.push(action.target.ref);
      break;
  }
}

/**
 * Evaluate all rules against the current context.
 * Backward-compatible with the old API — returns jump target and variables.
 */
export function evaluateLogic(ctx: LogicContext): LogicOutcome {
  const outcome: LogicOutcome = {
    jumpTo: undefined,
    thankyouRef: undefined,
    variables: { ...ctx.variables },
    shownFields: new Set(),
    hiddenFields: new Set(),
    hiddenGroups: new Set(),
    requiredFields: new Set(),
    optionalFields: new Set(),
    disabledFields: new Set(),
    enabledFields: new Set(),
    skipRefs: [],
  };

  for (const rule of ctx.schema.logic ?? []) {
    if (outcome.jumpTo !== undefined) break;

    // Build a LogicContext with updated variables for cascading
    const ruleCtx = { ...ctx, variables: { ...outcome.variables } };
    if (evaluateConditionTree(rule.when, ruleCtx)) {
      for (const action of rule.then) {
        applyLogicAction(action, ruleCtx, outcome);
      }
    }
  }
  return outcome;
}

export interface FlowResult {
  visibleFieldRefs: string[];
  thankyouRef: string | undefined;
  requiredOverrides: Record<string, boolean>;
  disabledFields: Set<string>;
}

/**
 * Compute which fields are visible and in what order.
 * Fields are always shown in definition order; logic produces jumps,
 * show/hide, skip, required, disable actions.
 */
export function computeFlow(
  schema: FormSchema,
  answers: Record<string, unknown>,
  hidden: Record<string, unknown> = {},
  variables: Record<string, unknown> = {},
): FlowResult {
  const visibilityResult = computeFieldVisibility(schema, answers, hidden, variables);

  // Build the visible field list in definition order, applying visibility + skip
  const fields = schema.fields ?? [];
  const visibleFieldRefs: string[] = [];
  const disabledSet = new Set<string>();

  for (const field of fields) {
    const ref = field.ref ?? "";
    if (!ref) continue;
    const vis = visibilityResult.visibility[ref];
    if (vis && vis.visible) {
      visibleFieldRefs.push(ref);
    }
    if (vis && vis.disabled) {
      disabledSet.add(ref);
    }
  }

  // Apply jump: if jumpTo targets a specific field, slice from that point
  if (visibilityResult.jumpTo === "thankyou") {
    return {
      visibleFieldRefs,
      thankyouRef: visibilityResult.thankyouRef ?? "default",
      requiredOverrides: visibilityResult.requiredOverrides,
      disabledFields: disabledSet,
    };
  }
  if (visibilityResult.jumpTo) {
    const jumpIndex = visibleFieldRefs.indexOf(visibilityResult.jumpTo);
    if (jumpIndex >= 0) {
      return {
        visibleFieldRefs: visibleFieldRefs.slice(jumpIndex),
        thankyouRef: undefined,
        requiredOverrides: visibilityResult.requiredOverrides,
        disabledFields: disabledSet,
      };
    }
  }

  return {
    visibleFieldRefs,
    thankyouRef: undefined,
    requiredOverrides: visibilityResult.requiredOverrides,
    disabledFields: disabledSet,
  };
}

export interface FieldVisibilityMap {
  [fieldRef: string]: { visible: boolean; disabled: boolean };
}

/**
 * Compute per-field visibility, disabled state, and required overrides
 * by evaluating all logic rules against the current answers.
 *
 * Rules evaluated (in definition order):
 * - show_field / hide_field
 * - hide_group (all fields in hidden groups are hidden)
 * - skip_field / skip_group
 * - make_required / make_optional
 * - enable_field / disable_field
 * - jump (stops evaluation — subsequent fields hidden)
 */
export function computeFieldVisibility(
  schema: FormSchema,
  answers: Record<string, unknown>,
  hidden: Record<string, unknown> = {},
  variables: Record<string, unknown> = {},
): {
  visibility: FieldVisibilityMap;
  requiredOverrides: Record<string, boolean>;
  jumpTo: string | "thankyou" | undefined;
  thankyouRef: string | undefined;
  variables: Record<string, unknown>;
  logicMessages: string[];
} {
  const ctx: LogicContext = { schema, answers, variables, hidden };
  const outcome = evaluateLogic(ctx);

  const hiddenRefs = new Set<string>(getUrlParams(schema));
  const fields = schema.fields ?? [];
  const groups = schema.groups ?? [];

  // Collect fields that belong to hidden groups
  const hiddenGroupFieldRefs = new Set<string>();
  for (const group of groups) {
    if (outcome.hiddenGroups.has(group.id ?? "")) {
      for (const fieldId of group.fieldIds ?? []) {
        hiddenGroupFieldRefs.add(fieldId);
      }
    }
  }

  // Collect all skip refs (fields + groups)
  const skipRefs = new Set(outcome.skipRefs);

  // Build per-group field lookup for skip_group
  const groupFieldRefs = new Set<string>();
  for (const group of groups) {
    if (skipRefs.has(group.id ?? "")) {
      for (const fieldId of group.fieldIds ?? []) {
        groupFieldRefs.add(fieldId);
      }
    }
  }

  // Build visibility map
  const visibility: FieldVisibilityMap = {};
  const requiredOverrides: Record<string, boolean> = {};
  const logicMessages: string[] = [];

  for (const field of fields) {
    const ref = field.ref ?? "";
    if (!ref) continue;

    let visible = true;
    let disabled = false;

    // Hidden by schema definition
    if (hiddenRefs.has(ref)) {
      visible = false;
    }

    // Hidden by hide_field logic
    if (outcome.hiddenFields.has(ref)) {
      visible = false;
    }

    // Explicitly shown by show_field (overrides hide_field)
    if (outcome.shownFields.has(ref)) {
      visible = true;
    }

    // Hidden by hide_group
    if (hiddenGroupFieldRefs.has(ref)) {
      visible = false;
    }

    // Skipped by skip_field
    if (skipRefs.has(ref)) {
      visible = false;
    }

    // Skipped by skip_group
    if (groupFieldRefs.has(ref)) {
      visible = false;
    }

    // Disabled
    if (outcome.disabledFields.has(ref)) {
      disabled = true;
    }
    if (outcome.enabledFields.has(ref)) {
      disabled = false;
    }

    visibility[ref] = { visible, disabled };

    // Required overrides
    if (outcome.requiredFields.has(ref)) {
      requiredOverrides[ref] = true;
    } else if (outcome.optionalFields.has(ref)) {
      requiredOverrides[ref] = false;
    }
  }

  // If jump goes to thankyou, hide all fields after the jump target
  if (outcome.jumpTo === "thankyou") {
    for (const field of fields) {
      const ref = field.ref ?? "";
      if (ref && visibility[ref]?.visible) {
        // Keep all visible — the thank-you screen will be shown
      }
    }
  } else if (outcome.jumpTo) {
    // Hide all fields before the jump target
    const jumpIndex = fields.findIndex((f) => f.ref === outcome.jumpTo);
    if (jumpIndex >= 0) {
      for (let i = 0; i < jumpIndex; i++) {
        const ref = fields[i]?.ref ?? "";
        if (ref && visibility[ref]?.visible) {
          visibility[ref] = { visible: false, disabled: visibility[ref]?.disabled ?? false };
        }
      }
    }
  }

  return {
    visibility,
    requiredOverrides,
    jumpTo: outcome.jumpTo,
    thankyouRef: outcome.thankyouRef,
    variables: outcome.variables,
    logicMessages,
  };
}

/* ============================================================================
 * Step routing (multi-step navigation)
 *
 * A small, plain-language layer over the logic engine: rules that "jump" to a
 * group (step) or "skip_group" decide which step a respondent sees next.
 * ========================================================================== */

export interface StepRouting {
  /** Explicit step a matching rule wants to jump to. */
  targetStepId: string | null;
  /** Steps that matching rules say to skip during normal advance. */
  skipStepIds: Set<string>;
}

/**
 * Evaluate all logic rules against the current answers and collect the step
 * navigation they imply (jump target + skipped steps).
 */
export function resolveStepRouting(
  schema: FormSchema,
  answers: Record<string, unknown>,
  variables: Record<string, unknown> = {},
  hidden: Record<string, unknown> = {},
): StepRouting {
  const routing: StepRouting = { targetStepId: null, skipStepIds: new Set() };
  const ctx: LogicContext = { schema, answers, variables, hidden };

  for (const rule of schema.logic ?? []) {
    if (!evaluateConditionTree(rule.when as Condition, ctx)) continue;
    for (const action of rule.then) {
      if (action.type === "jump" && action.target.type === "group") {
        routing.targetStepId = action.target.ref;
      } else if (action.type === "skip_group" || action.type === "hide_group") {
        routing.skipStepIds.add(action.target.ref);
      }
    }
  }

  return routing;
}

/**
 * The step to show after the one at `currentIndex`.
 *
 * Honours an explicit jump target when it moves forward, otherwise returns the
 * next step that no rule asked to skip. Returns `null` when the form should end.
 */
export function getNextStepIndex(
  schema: FormSchema,
  currentIndex: number,
  routing: StepRouting,
): number | null {
  const groups = schema.groups ?? [];

  if (routing.targetStepId) {
    const target = groups.findIndex((group) => group.id === routing.targetStepId);
    if (target > currentIndex) return target;
  }

  for (let i = currentIndex + 1; i < groups.length; i++) {
    const group = groups[i];
    if (group && !routing.skipStepIds.has(group.id ?? "")) return i;
  }

  return null;
}

export type {
  FormSchema,
  FormField,
  FieldOption,
  Choice,
  ThankyouScreen,
  WelcomeScreen,
  FormSettings,
  Theme,
  Condition,
  ValueReference,
};
