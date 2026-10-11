/**
 * Recall Engine
 *
 * A first-class reference + resolution system for recalling previously
 * collected information inside form content. Shares the same ValueResolver
 * as the Logic engine to avoid duplication.
 *
 * Supports:
 * - Field answers (previous questions)
 * - Custom variables
 * - URL parameters
 * - Score
 * - Price
 *
 * Runtime flow:
 *   Form → Submission State → Variable State → URL Parameters → Score → Price
 *   → RecallEngine → Rendered Content
 */

import type {
  ValueReference,
  FormRuntimeState,
  Condition,
} from "../types";

// ---------------------------------------------------------------------------
// Recall Reference — canonical schema for all recall sources
// ---------------------------------------------------------------------------

export type RecallReference =
  | { type: "field"; ref: string }
  | { type: "variable"; ref: string }
  | { type: "url_param"; key: string }
  | { type: "score" }
  | { type: "price" };

// ---------------------------------------------------------------------------
// Text segments — structured content representation
// ---------------------------------------------------------------------------

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "recall"; reference: RecallReference };

// ---------------------------------------------------------------------------
// Recall source — metadata for the @ menu
// ---------------------------------------------------------------------------

export interface RecallSource {
  id: string;
  label: string;
  description?: string;
  reference: RecallReference;
  category: "field" | "variable" | "url_param" | "score" | "price";
  /** Whether this source is guaranteed to exist at the given location */
  guaranteed?: boolean;
}

// ---------------------------------------------------------------------------
// Recall context — everything needed to resolve references
// ---------------------------------------------------------------------------

export interface RecallContext {
  /** Current submission answers */
  answers: Record<string, unknown>;
  /** Current variable state */
  variables: Record<string, unknown>;
  /** URL parameters */
  urlParams: Record<string, string>;
  /** Current score */
  score: number;
  /** Current price */
  price: number;
  /** Currency code for price formatting */
  currency?: string;
  /** Locale for formatting */
  locale?: string;
  /** Field answer getter (for lazy resolution) */
  fieldAnswerGetter?: (ref: string) => unknown;
}

// ---------------------------------------------------------------------------
// Recall validation warning
// ---------------------------------------------------------------------------

export interface RecallWarning {
  /** The recall reference that may be unsafe */
  reference: RecallReference;
  /** Human-readable warning message */
  message: string;
  /** Severity: "warning" or "error" */
  severity: "warning" | "error";
}

// ---------------------------------------------------------------------------
// Form definition needed for availability analysis
// ---------------------------------------------------------------------------

export interface RecallFormDef {
  fields: Array<{
    ref?: string;
    title: string;
    type: string;
    properties?: Record<string, unknown>;
  }>;
  groups?: Array<{
    id: string;
    ref?: string;
    title: string;
    fieldIds: string[];
  }>;
  logic?: Array<{
    id: string;
    when: Condition;
    then: Array<{ type: string; target?: { type: string; ref: string } }>;
    sourceRefs?: string[];
  }>;
  variables?: Record<string, unknown>;
  variableDefinitions?: Array<{ key: string; type: string }>;
  hidden?: string[];
  /** URL parameters captured from the published form URL. */
  urlParams?: string[];
  settings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// RecallEngine
// ---------------------------------------------------------------------------

export class RecallEngine {
  // -------------------------------------------------------------------------
  // Get available recall sources at a given location
  // -------------------------------------------------------------------------

  /**
   * Determine which recall sources are available at a given position in the form.
   *
   * For sequential conversational forms: uses current field index.
   * For classic/page-based forms: uses current group/page position.
   * For branching forms: analyzes the navigation graph.
   *
   * @param form - The form definition
   * @param currentFieldRef - The field ref where the recall is being inserted
   * @param currentGroupRef - Optional group ref for page-based forms
   * @param isPostSubmit - Whether this is after submission (e.g., notifications)
   */
  static getAvailableSources(
    form: RecallFormDef,
    currentFieldRef?: string,
    currentGroupRef?: string,
    isPostSubmit = false,
  ): RecallSource[] {
    const sources: RecallSource[] = [];
    const fields = form.fields ?? [];

    // --- Previous answers ---
    // After submission, ALL fields are available
    // During form filling, only fields before the current location
    const availableFieldRefs = isPostSubmit
      ? fields.map((f) => f.ref ?? "").filter(Boolean)
      : this.getFieldsAvailableBefore(form, currentFieldRef, currentGroupRef);

    for (const fieldRef of availableFieldRefs) {
      const field = fields.find((f) => f.ref === fieldRef);
      if (!field) continue;
      // Skip statement fields — they don't collect answers
      if (field.type === "statement") continue;

      sources.push({
        id: `field-${fieldRef}`,
        label: field.title || fieldRef,
        description: `${field.type.replace(/_/g, " ")}`,
        reference: { type: "field", ref: fieldRef },
        category: "field",
        guaranteed: isPostSubmit || this.isFieldGuaranteed(form, fieldRef, currentFieldRef),
      });
    }

    // --- Variables ---
    // 1. From variableDefinitions array (typed variables)
    const variableDefs = form.variableDefinitions ?? [];
    for (const v of variableDefs) {
      sources.push({
        id: `variable-${v.key}`,
        label: v.key,
        description: `${v.type} variable`,
        reference: { type: "variable", ref: v.key },
        category: "variable",
        guaranteed: true,
      });
    }

    // 2. From variables Record (untyped variables — common in most forms)
    const variablesRecord = form.variables ?? {};
    for (const varKey of Object.keys(variablesRecord)) {
      if (!sources.some((s) => s.id === `variable-${varKey}`)) {
        sources.push({
          id: `variable-${varKey}`,
          label: varKey,
          description: "variable",
          reference: { type: "variable", ref: varKey },
          category: "variable",
          guaranteed: true,
        });
      }
    }

    // 3. From logic rules (implicitly created variables)
    const logicVars = this.extractVariableRefsFromLogic(form);
    for (const varKey of logicVars) {
      if (!sources.some((s) => s.id === `variable-${varKey}`)) {
        sources.push({
          id: `variable-${varKey}`,
          label: varKey,
          description: "variable",
          reference: { type: "variable", ref: varKey },
          category: "variable",
          guaranteed: false,
        });
      }
    }

    // --- URL parameters ---
    // `urlParams` is canonical; `hidden` is the legacy alias. Merge both so
    // forms saved under either key expose their parameters here.
    const hiddenFields = Array.from(
      new Set([...(form.urlParams ?? []), ...(form.hidden ?? [])]),
    );
    for (const key of hiddenFields) {
      if (!key) continue;
      if (sources.some((s) => s.id === `url_param-${key}`)) continue;
      sources.push({
        id: `url_param-${key}`,
        label: key,
        description: "URL parameter",
        reference: { type: "url_param", key },
        category: "url_param",
        guaranteed: false,
      });
    }

    // --- Score ---
    const settings = form.settings as Record<string, unknown> | undefined;
    const hasScoring = (form as any).scoring?.length > 0;
    if (hasScoring) {
      sources.push({
        id: "system-score",
        label: "Score",
        description: "Current total score",
        reference: { type: "score" },
        category: "score",
        guaranteed: true,
      });
    }

    // --- Price ---
    const hasPrice = fields.some(
      (f) => f.type === "payment" || (f.properties?.price as any)?.value?.amount,
    );
    if (hasPrice) {
      sources.push({
        id: "system-price",
        label: "Price",
        description: "Current total price",
        reference: { type: "price" },
        category: "price",
        guaranteed: true,
      });
    }

    return sources;
  }

  // -------------------------------------------------------------------------
  // Resolve a recall reference to its actual value
  // -------------------------------------------------------------------------

  /**
   * Resolve a RecallReference to its actual value at runtime.
   * Returns undefined for missing values (never throws).
   */
  static resolve(
    reference: RecallReference,
    context: RecallContext,
  ): string | number | boolean | undefined {
    try {
      switch (reference.type) {
        case "field": {
          const value = context.fieldAnswerGetter
            ? context.fieldAnswerGetter(reference.ref)
            : context.answers[reference.ref];
          return value !== undefined && value !== null ? (value as string | number | boolean) : undefined;
        }

        case "variable": {
          const value = context.variables[reference.ref];
          return value !== undefined && value !== null ? (value as string | number | boolean) : undefined;
        }

        case "url_param": {
          const value = context.urlParams[reference.key] as string | undefined;
          return value !== undefined ? value : undefined;
        }

        case "score":
          return context.score as number;

        case "price":
          return context.price as number;

        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }

  // -------------------------------------------------------------------------
  // Interpolate text with recall references
  // -------------------------------------------------------------------------

  /**
   * Replace recall tokens in a text string with resolved values.
   *
   * Supports token formats:
   *   {{field:ref}}
   *   {{variable:key}} or {{var:key}}
   *   {{url_param:key}} or {{url:key}}
   *   {{score}}
   *   {{price}}
   *
   * @param text - The text containing recall tokens
   * @param context - Runtime context for resolution
   * @returns The interpolated text with tokens replaced by values
   */
  static interpolate(text: string, context: RecallContext): string {
    if (!text) return "";

    // Token pattern: {{type:key}} or {{type}}
    const tokenRegex = /\{\{(field|variable|var|url_param|url|score|price)(?::([^}]+))?\}\}/g;

    return text.replace(tokenRegex, (match, type: string, key: string) => {
      const reference = this.parseTokenToReference(type, key);
      if (!reference) return match; // Unknown token — leave as-is

      const value = this.resolve(reference, context);
      return this.formatValue(value, reference, context);
    });
  }

  // -------------------------------------------------------------------------
  // Interpolate structured text segments
  // -------------------------------------------------------------------------

  /**
   * Resolve an array of text segments to a single string.
   */
  static interpolateSegments(
    segments: TextSegment[],
    context: RecallContext,
  ): string {
    return segments
      .map((seg) => {
        if (seg.type === "text") return seg.value;
        const value = this.resolve(seg.reference, context);
        return this.formatValue(value, seg.reference, context);
      })
      .join("");
  }

  // -------------------------------------------------------------------------
  // Parse text into segments
  // -------------------------------------------------------------------------

  /**
   * Parse a string with recall tokens into structured TextSegments.
   */
  static parseSegments(text: string): TextSegment[] {
    if (!text) return [{ type: "text", value: "" }];

    const segments: TextSegment[] = [];
    const tokenRegex = /\{\{(field|variable|var|url_param|url|score|price)(?::([^}]+))?\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      // Add text before this token
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          value: text.slice(lastIndex, match.index),
        });
      }

      // Add the recall token
      const type = match[1] ?? "";
      const key = match[2];
      const reference = this.parseTokenToReference(type, key);
      if (reference) {
        segments.push({ type: "recall", reference });
      } else {
        // Unknown token — treat as text
        segments.push({ type: "text", value: match[0] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      segments.push({ type: "text", value: text.slice(lastIndex) });
    }

    if (segments.length === 0) {
      segments.push({ type: "text", value: text });
    }

    return segments;
  }

  // -------------------------------------------------------------------------
  // Validate recall references
  // -------------------------------------------------------------------------

  /**
   * Validate that all recall references in text are safe and available.
   * Returns warnings for branch-dependent or forward references.
   */
  static validateReferences(
    text: string,
    form: RecallFormDef,
    currentFieldRef?: string,
    currentGroupRef?: string,
  ): RecallWarning[] {
    const warnings: RecallWarning[] = [];
    const segments = this.parseSegments(text);

    for (const seg of segments) {
      if (seg.type !== "recall") continue;

      const ref = seg.reference;

      // Check field availability
      if (ref.type === "field") {
        const availableFields = this.getFieldsAvailableBefore(
          form,
          currentFieldRef,
          currentGroupRef,
        );

        if (!availableFields.includes(ref.ref)) {
          const field = form.fields.find((f) => f.ref === ref.ref);
          warnings.push({
            reference: ref,
            message: field
              ? `"${field.title}" is not available at this location. It may appear after the current question.`
              : `Field "${ref.ref}" is not available at this location.`,
            severity: "warning",
          });
        } else if (!this.isFieldGuaranteed(form, ref.ref, currentFieldRef)) {
          const field = form.fields.find((f) => f.ref === ref.ref);
          warnings.push({
            reference: ref,
            message: field
              ? `"${field.title}" may not have an answer for all respondents because it appears on a conditional branch.`
              : `Field "${ref.ref}" may not have an answer for all respondents.`,
            severity: "warning",
          });
        }
      }
    }

    return warnings;
  }

  // -------------------------------------------------------------------------
  // Get dependencies of recall references in text
  // -------------------------------------------------------------------------

  /**
   * Extract all field/variable refs that text depends on.
   */
  static getDependencies(
    text: string,
  ): { fields: string[]; variables: string[]; urlParams: string[]; hasScore: boolean; hasPrice: boolean } {
    const segments = this.parseSegments(text);
    const fields: string[] = [];
    const variables: string[] = [];
    const urlParams: string[] = [];
    let hasScore = false;
    let hasPrice = false;

    for (const seg of segments) {
      if (seg.type !== "recall") continue;

      switch (seg.reference.type) {
        case "field":
          fields.push(seg.reference.ref);
          break;
        case "variable":
          variables.push(seg.reference.ref);
          break;
        case "url_param":
          urlParams.push(seg.reference.key);
          break;
        case "score":
          hasScore = true;
          break;
        case "price":
          hasPrice = true;
          break;
      }
    }

    return { fields, variables, urlParams, hasScore, hasPrice };
  }

  // -------------------------------------------------------------------------
  // Convert RecallReference to token string
  // -------------------------------------------------------------------------

  /**
   * Convert a RecallReference to its token string representation.
   */
  static referenceToToken(reference: RecallReference): string {
    switch (reference.type) {
      case "field":
        return `{{field:${reference.ref}}}`;
      case "variable":
        return `{{variable:${reference.ref}}}`;
      case "url_param":
        return `{{url_param:${reference.key}}}`;
      case "score":
        return `{{score}}`;
      case "price":
        return `{{price}}`;
    }
  }

  // -------------------------------------------------------------------------
  // Insert recall token into text at cursor position
  // -------------------------------------------------------------------------

  /**
   * Insert a recall token into text at the given cursor position.
   * Replaces from the @ symbol to the cursor with the token.
   */
  static insertToken(
    text: string,
    cursorPos: number,
    atPosition: number,
    reference: RecallReference,
  ): { text: string; newCursorPos: number } {
    const token = this.referenceToToken(reference);
    const beforeAt = text.substring(0, atPosition - 1); // before the @
    const afterCursor = text.substring(cursorPos);

    const newText = beforeAt + token + afterCursor;
    const newCursorPos = beforeAt.length + token.length;

    return { text: newText, newCursorPos };
  }

  // -------------------------------------------------------------------------
  // Format a recalled value for display
  // -------------------------------------------------------------------------

  /**
   * Format a recalled value for human-readable display.
   * Handles strings, numbers, booleans, dates, arrays, etc.
   */
  static formatValue(
    value: unknown,
    reference: RecallReference,
    context?: RecallContext,
  ): string {
    if (value === undefined || value === null || value === "") {
      return "";
    }

    // Boolean
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    // Number
    if (typeof value === "number") {
      // Price formatting
      if (reference.type === "price" && context?.currency) {
        try {
          return new Intl.NumberFormat(context.locale ?? "en-US", {
            style: "currency",
            currency: context.currency,
          }).format(value);
        } catch {
          return `$${value.toFixed(2)}`;
        }
      }
      return String(value);
    }

    // Array (multiple choice)
    if (Array.isArray(value)) {
      return value.map((v) => String(v)).join(", ");
    }

    // Object (shouldn't normally appear, but handle gracefully)
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }

    // String (default)
    return String(value);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Parse a token type + key into a RecallReference.
   */
  private static parseTokenToReference(
    type: string,
    key?: string,
  ): RecallReference | null {
    switch (type) {
      case "field":
        return key ? { type: "field", ref: key } : null;
      case "variable":
      case "var":
        return key ? { type: "variable", ref: key } : null;
      case "url_param":
      case "url":
        return key ? { type: "url_param", key } : null;
      case "score":
        return { type: "score" };
      case "price":
        return { type: "price" };
      default:
        return null;
    }
  }

  /**
   * Get fields that are available before a given location.
   * Uses field order in the fields array as the primary heuristic,
   * with logic rules for branch-aware analysis.
   */
  private static getFieldsAvailableBefore(
    form: RecallFormDef,
    currentFieldRef?: string,
    currentGroupRef?: string,
  ): string[] {
    const fields = form.fields ?? [];

    if (!currentFieldRef) {
      // No current location — nothing is available (or everything if post-submit)
      return [];
    }

    // Simple sequential: all fields before the current one
    const currentIndex = fields.findIndex((f) => f.ref === currentFieldRef);
    if (currentIndex < 0) return [];

    // Return refs of all fields before the current one (excluding statements)
    return fields
      .slice(0, currentIndex)
      .filter((f) => f.type !== "statement")
      .map((f) => f.ref ?? "")
      .filter(Boolean);
  }

  /**
   * Determine if a field is guaranteed to have been answered
   * on every possible path to the current location.
   *
   * Conservative heuristic: if the field is before the current field
   * in the raw order and not behind a conditional branch, it's guaranteed.
   */
  private static isFieldGuaranteed(
    form: RecallFormDef,
    fieldRef: string,
    currentFieldRef?: string,
  ): boolean {
    if (!currentFieldRef) return false;

    const fields = form.fields ?? [];
    const fieldIndex = fields.findIndex((f) => f.ref === fieldRef);
    const currentIndex = fields.findIndex((f) => f.ref === currentFieldRef);

    // Field is after current — definitely not guaranteed
    if (fieldIndex >= currentIndex) return false;

    // Check if any logic rules skip this field conditionally
    const logic = form.logic ?? [];
    for (const rule of logic) {
      // If a rule can skip to a field AFTER our target, the target may be skipped
      for (const action of rule.then) {
        if (
          action.type === "jump" &&
          action.target?.type === "field"
        ) {
          const jumpTargetIndex = fields.findIndex(
            (f) => f.ref === action.target!.ref,
          );
          const skippedFieldIndex = fieldIndex;
          // If the jump lands after our field but before current,
          // our field might be skipped
          if (
            jumpTargetIndex > skippedFieldIndex &&
            jumpTargetIndex < currentIndex
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Extract variable references from logic rules.
   */
  private static extractVariableRefsFromLogic(form: RecallFormDef): Set<string> {
    const vars = new Set<string>();
    const logic = form.logic ?? [];

    for (const rule of logic) {
      for (const action of rule.then) {
        if (
          "target" in action &&
          typeof action.target === "string" &&
          ["set_variable", "add_variable", "subtract_variable", "multiply_variable", "divide_variable", "increment_variable", "decrement_variable"].includes(action.type)
        ) {
          vars.add(action.target as string);
        }
      }
    }

    return vars;
  }
}
