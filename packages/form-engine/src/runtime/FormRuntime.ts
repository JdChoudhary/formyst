/**
 * Form Runtime
 *
 * Manages the runtime state of a form during execution.
 * Provides a clean interface for renderers to consume
 * and for the logic engine to update.
 */

import type {
  FormRuntimeState,
  EvaluationResult,
  LogicEngineConfig,
  LogicTrigger,
} from "../types";
import { LogicEngine, createLogicEngine } from "../logic/engine/LogicEngine";
import { NavigationEngine, NavigationContext } from "../logic/navigation/NavigationEngine";
import { ScoringEngine } from "../logic/scoring/ScoringEngine";
import { OutcomeEngine } from "../logic/outcomes/OutcomeEngine";

// ---------------------------------------------------------------------------
// Form Runtime
// ---------------------------------------------------------------------------

export class FormRuntime {
  private state: FormRuntimeState;
  private logicEngine: LogicEngine;
  private navigationEngine: NavigationEngine;
  private config: LogicEngineConfig;
  private fieldAnswerGetter?: (ref: string) => unknown;

  constructor(
    config: LogicEngineConfig,
    initialState?: Partial<FormRuntimeState>,
  ) {
    this.config = config;
    this.logicEngine = createLogicEngine(config);

    // Initialize state FIRST so navigation context has valid state
    this.state = this.createInitialState(initialState);

    // Build navigation context
    const navContext = this.buildNavigationContext();
    this.navigationEngine = new NavigationEngine(navContext);

    // Set scoring engine config
    const scoringEngine = this.logicEngine.getScoringEngine();
    const quizSettings = (config.form.settings as any)?.quiz;
    if (quizSettings?.passingScore) {
      scoringEngine.setPassingScore(quizSettings.passingScore);
    }
  }

  // -------------------------------------------------------------------------
  // State management
  // -------------------------------------------------------------------------

  /**
   * Get the current runtime state (read-only snapshot).
   */
  getState(): FormRuntimeState {
    return { ...this.state };
  }

  /**
   * Update the field answer getter for resolving field values.
   */
  setFieldAnswerGetter(getter: (ref: string) => unknown): void {
    this.fieldAnswerGetter = getter;
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  /**
   * Handle a field value change.
   */
  onFieldChange(ref: string, value: unknown): EvaluationResult {
    // Update state
    this.state.answers[ref] = value;

    // Evaluate logic
    const result = this.logicEngine.onFieldChange(
      ref,
      value,
      this.state,
      this.fieldAnswerGetter,
    );

    // Apply result
    this.applyResult(result);

    return result;
  }

  /**
   * Handle a field being answered (completed).
   */
  onFieldAnswered(ref: string): EvaluationResult {
    if (!this.state.completedFields.includes(ref)) {
      this.state.completedFields.push(ref);
    }

    const result = this.logicEngine.onFieldAnswered(
      ref,
      this.state,
      this.fieldAnswerGetter,
    );

    this.applyResult(result);
    return result;
  }

  /**
   * Handle a group being entered.
   */
  onGroupEnter(ref: string): EvaluationResult {
    this.state.currentGroupRef = ref;

    const result = this.logicEngine.onGroupEnter(ref, this.state);
    this.applyResult(result);
    return result;
  }

  /**
   * Handle a group being completed.
   */
  onGroupComplete(ref: string): EvaluationResult {
    const result = this.logicEngine.onGroupComplete(ref, this.state);
    this.applyResult(result);
    return result;
  }

  /**
   * Handle form start.
   */
  onFormStart(): EvaluationResult {
    const result = this.logicEngine.evaluate("form_started", this.state);
    this.applyResult(result);
    return result;
  }

  /**
   * Handle before submit.
   */
  beforeSubmit(): EvaluationResult {
    const result = this.logicEngine.beforeSubmit(
      this.state,
      this.fieldAnswerGetter,
    );
    this.applyResult(result);
    return result;
  }

  /**
   * Handle after submit.
   */
  afterSubmit(): EvaluationResult {
    const result = this.logicEngine.afterSubmit(
      this.state,
      this.fieldAnswerGetter,
    );
    this.applyResult(result);
    return result;
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  /**
   * Get the next visible field after the current one.
   */
  getNextField(): string | undefined {
    if (!this.state.currentFieldRef) {
      // Return first visible field
      const visible = this.navigationEngine.getVisibleFieldRefs(
        this.state.skipRefs ?? [],
      );
      return visible[0];
    }

    const result = this.navigationEngine.getNextField(
      this.state.currentFieldRef,
      this.state.skipRefs ?? [],
    );

    if (result.showThankyou) return undefined;
    return result.nextFieldRef;
  }

  /**
   * Get the previous visible field.
   */
  getPreviousField(): string | undefined {
    if (!this.state.currentFieldRef) return undefined;

    const result = this.navigationEngine.getPreviousField(
      this.state.currentFieldRef,
      this.state.skipRefs ?? [],
    );

    return result.nextFieldRef;
  }

  /**
   * Jump to a specific field or group.
   */
  jumpTo(ref: string, type: "field" | "group" | "thankyou"): void {
    const result = this.navigationEngine.jumpTo(
      ref,
      type,
      this.state.skipRefs ?? [],
    );

    if (result.showThankyou) {
      this.state.navigationOverride = "thankyou";
    } else if (result.nextFieldRef) {
      this.state.currentFieldRef = result.nextFieldRef;
      this.state.currentGroupRef = result.nextGroupRef;
    }
  }

  /**
   * Get all visible field refs.
   */
  getVisibleFieldRefs(): string[] {
    return this.navigationEngine.getVisibleFieldRefs(
      this.state.skipRefs ?? [],
    );
  }

  /**
   * Navigate to the next field.
   */
  goNext(): string | undefined {
    const nextRef = this.getNextField();
    if (nextRef) {
      this.state.currentFieldRef = nextRef;
      this.state.visitedFields.push(nextRef);
    }
    return nextRef;
  }

  /**
   * Navigate to the previous field.
   */
  goPrevious(): string | undefined {
    const prevRef = this.getPreviousField();
    if (prevRef) {
      this.state.currentFieldRef = prevRef;
    }
    return prevRef;
  }

  // -------------------------------------------------------------------------
  // Scoring & Outcomes
  // -------------------------------------------------------------------------

  /**
   * Calculate the current score.
   */
  calculateScore(): number {
    const scoringEngine = this.logicEngine.getScoringEngine();
    const result = scoringEngine.calculate(
      this.state.answers,
      this.state,
    );
    this.state.score = result.score;
    return result.score;
  }

  /**
   * Evaluate outcomes and return the matched outcome.
   */
  evaluateOutcome(): { outcomeId?: string; isDefault: boolean } {
    const outcomeEngine = this.logicEngine.getOutcomeEngine();
    const result = outcomeEngine.evaluate(
      this.state,
      this.fieldAnswerGetter,
    );
    if (result.outcomeId) {
      this.state.outcome = result.outcomeId;
    }
    return {
      outcomeId: result.outcomeId,
      isDefault: result.isDefault,
    };
  }

  // -------------------------------------------------------------------------
  // Progress
  // -------------------------------------------------------------------------

  /**
   * Update progress based on completed fields.
   */
  updateProgress(): void {
    const totalFields = this.config.form.fields.filter(
      (f) => f.type !== "statement",
    ).length;
    const completedCount = this.state.completedFields.length;
    this.state.progress =
      totalFields > 0
        ? Math.min(100, Math.round((completedCount / totalFields) * 100))
        : 0;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Create the initial runtime state.
   */
  private createInitialState(
    override?: Partial<FormRuntimeState>,
  ): FormRuntimeState {
    return {
      answers: {},
      variables: {},
      visibility: {},
      enabled: {},
      required: {},
      visitedFields: [],
      completedFields: [],
      score: 0,
      progress: 0,
      skipRefs: [],
      ...override,
    };
  }

  /**
   * Build navigation context from the form config.
   */
  private buildNavigationContext(): NavigationContext {
    const fieldRefs = this.config.form.fields
      .map((f) => f.ref ?? "")
      .filter(Boolean);

    const groups = this.config.form.groups ?? [];
    const groupRefs = groups.map((g) => g.ref ?? g.id).filter(Boolean);

    const groupFields: Record<string, string[]> = {};
    for (const group of groups) {
      const groupRef = group.ref ?? group.id;
      groupFields[groupRef] = group.fieldIds.filter(Boolean);
    }

    return {
      fieldRefs,
      groupRefs,
      groupFields,
      state: this.state,
    };
  }

  /**
   * Apply an evaluation result to the runtime state.
   */
  private applyResult(result: EvaluationResult): void {
    // Merge variables
    this.state.variables = {
      ...this.state.variables,
      ...result.variables,
    };

    // Merge visibility
    this.state.visibility = {
      ...this.state.visibility,
      ...result.visibility,
    };

    // Merge enabled
    this.state.enabled = {
      ...this.state.enabled,
      ...result.enabled,
    };

    // Merge required
    this.state.required = {
      ...this.state.required,
      ...result.required,
    };

    // Apply field values
    for (const [ref, value] of Object.entries(result.fieldValues)) {
      this.state.answers[ref] = value;
    }

    // Apply skip refs
    if (result.skipRefs.length > 0) {
      this.state.skipRefs = [
        ...(this.state.skipRefs ?? []),
        ...result.skipRefs,
      ];
    }

    // Apply navigation
    if (result.navigation) {
      if (result.navigation === "thankyou") {
        this.state.navigationOverride = "thankyou";
      } else {
        this.state.currentFieldRef = result.navigation;
      }
    }

    // Apply score
    this.state.score = result.score;

    // Apply outcome
    if (result.outcome) {
      this.state.outcome = result.outcome;
    }

    // Update navigation engine context
    this.navigationEngine.updateContext(this.buildNavigationContext());
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Create a new FormRuntime instance.
 */
export function createFormRuntime(
  config: LogicEngineConfig,
  initialState?: Partial<FormRuntimeState>,
): FormRuntime {
  return new FormRuntime(config, initialState);
}
