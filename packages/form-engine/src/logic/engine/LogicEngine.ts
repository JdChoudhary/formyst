/**
 * Logic Engine
 *
 * The central orchestrator for the declarative logic system.
 * Consumes form definitions and produces runtime state changes.
 *
 * Architecture:
 *   Form Definition
 *          │
 *          ▼
 *   Logic Engine
 *          │
 *   ┌──────┼──────┐
 *   ▼      ▼      ▼
 *  Rules  Scoring  Outcomes
 *   │      │      │
 *   └──────┼──────┘
 *          ▼
 *   Runtime State Changes
 *
 * The engine does NOT mutate the original form schema.
 * It returns state changes that the renderer applies.
 */

import type {
  LogicRule,
  LogicTrigger,
  Condition,
  LogicAction,
  FormRuntimeState,
  EvaluationResult,
  LogicEngineConfig,
  Outcome,
  ScoringRule,
} from "../../types";
import { evaluateCondition, ConditionContext } from "../conditions/evaluateCondition";
import { executeActions, ActionContext } from "../actions/executeAction";
import { ScoringEngine } from "../scoring/ScoringEngine";
import { OutcomeEngine } from "../outcomes/OutcomeEngine";
import { NavigationEngine, NavigationContext } from "../navigation/NavigationEngine";

// ---------------------------------------------------------------------------
// LogicEngine
// ---------------------------------------------------------------------------

export class LogicEngine {
  private rules: LogicRule[];
  private scoringEngine: ScoringEngine;
  private outcomeEngine: OutcomeEngine;
  private config: LogicEngineConfig;
  private maxCascadeDepth: number;

  constructor(config: LogicEngineConfig) {
    this.config = config;
    this.rules = this.prepareRules(config.form.logic ?? []);
    this.scoringEngine = new ScoringEngine(
      config.form.scoring ?? [],
      (config.form.settings as any)?.quiz?.passingScore ?? 70,
    );
    this.outcomeEngine = new OutcomeEngine(
      config.form.outcomes ?? [],
    );
    this.maxCascadeDepth = 10;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Evaluate all rules for a given trigger and return state changes.
   */
  evaluate(
    trigger: LogicTrigger,
    state: FormRuntimeState,
    options?: {
      changedFieldRef?: string;
      fieldAnswerGetter?: (ref: string) => unknown;
      submissionCount?: number;
    },
  ): EvaluationResult {
    // Initialize result with current state
    const result = this.createInitialResult(state);

    // 1. Filter rules by trigger and source refs
    const applicableRules = this.getApplicableRules(
      trigger,
      options?.changedFieldRef,
    );

    // 2. Evaluate rules in priority order
    const sortedRules = this.sortByPriority(applicableRules);

    // 3. Evaluate each rule and accumulate results
    const ctx: ConditionContext = {
      state,
      fieldAnswerGetter: options?.fieldAnswerGetter,
    };

    let cascadeCount = 0;
    let currentResult = { ...result };

    for (const rule of sortedRules) {
      if (cascadeCount >= this.maxCascadeDepth) {
        console.warn(
          `[FormEngine] Max cascade depth (${this.maxCascadeDepth}) reached. Stopping evaluation.`,
        );
        break;
      }

      // Update state with accumulated changes for cascading evaluation
      const evaluationState = this.mergeStateWithResult(state, currentResult);

      // Use updated state for condition evaluation so cascading works
      const cascadeCtx: ConditionContext = {
        state: evaluationState,
        fieldAnswerGetter: options?.fieldAnswerGetter,
      };

      // Evaluate the condition
      if (evaluateCondition(rule.when, cascadeCtx)) {
        // Execute actions
        const actionCtx: ActionContext = {
          state: evaluationState,
          result: currentResult,
          fieldAnswerGetter: options?.fieldAnswerGetter,
        };

        executeActions(rule.then, actionCtx);
        cascadeCount++;
      }
    }

    // 4. Recalculate score
    currentResult.score = this.calculateScore(
      state.answers,
      currentResult,
      options?.fieldAnswerGetter,
    );

    // 5. Evaluate outcomes
    const outcomeResult = this.outcomeEngine.evaluate(
      this.mergeStateWithResult(state, currentResult),
      options?.fieldAnswerGetter,
    );
    if (outcomeResult.outcomeId) {
      currentResult.outcome = outcomeResult.outcomeId;
    }

    return currentResult;
  }

  /**
   * Convenience method: field changed event.
   */
  onFieldChange(
    ref: string,
    value: unknown,
    state: FormRuntimeState,
    fieldAnswerGetter?: (ref: string) => unknown,
  ): EvaluationResult {
    // Update the answer in a temporary state for evaluation
    const updatedState: FormRuntimeState = {
      ...state,
      answers: { ...state.answers, [ref]: value },
    };

    return this.evaluate("field_changed", updatedState, {
      changedFieldRef: ref,
      fieldAnswerGetter: fieldAnswerGetter
        ? (r) => (r === ref ? value : fieldAnswerGetter(r))
        : (r) => updatedState.answers[r],
    });
  }

  /**
   * Convenience method: field answered event.
   */
  onFieldAnswered(
    ref: string,
    state: FormRuntimeState,
    fieldAnswerGetter?: (ref: string) => unknown,
  ): EvaluationResult {
    return this.evaluate("field_answered", state, {
      changedFieldRef: ref,
      fieldAnswerGetter,
    });
  }

  /**
   * Convenience method: group entered event.
   */
  onGroupEnter(
    groupRef: string,
    state: FormRuntimeState,
  ): EvaluationResult {
    return this.evaluate("group_entered", state);
  }

  /**
   * Convenience method: group completed event.
   */
  onGroupComplete(
    groupRef: string,
    state: FormRuntimeState,
  ): EvaluationResult {
    return this.evaluate("group_completed", state);
  }

  /**
   * Convenience method: before submit event.
   */
  beforeSubmit(
    state: FormRuntimeState,
    fieldAnswerGetter?: (ref: string) => unknown,
  ): EvaluationResult {
    return this.evaluate("before_submit", state, {
      fieldAnswerGetter,
    });
  }

  /**
   * Convenience method: after submit event.
   */
  afterSubmit(
    state: FormRuntimeState,
    fieldAnswerGetter?: (ref: string) => unknown,
  ): EvaluationResult {
    return this.evaluate("after_submit", state, {
      fieldAnswerGetter,
    });
  }

  /**
   * Get the scoring engine.
   */
  getScoringEngine(): ScoringEngine {
    return this.scoringEngine;
  }

  /**
   * Get the outcome engine.
   */
  getOutcomeEngine(): OutcomeEngine {
    return this.outcomeEngine;
  }

  /**
   * Update the logic rules.
   */
  setRules(rules: LogicRule[]): void {
    this.rules = this.prepareRules(rules);
  }

  /**
   * Get all rules.
   */
  getRules(): LogicRule[] {
    return [...this.rules];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Prepare rules by sorting and indexing.
   */
  private prepareRules(rules: LogicRule[]): LogicRule[] {
    return rules.map((rule, index) => ({
      ...rule,
      id: rule.id || `rule_${index}`,
      priority: rule.priority ?? 0,
    }));
  }

  /**
   * Get rules applicable to a specific trigger.
   */
  private getApplicableRules(
    trigger: LogicTrigger,
    changedFieldRef?: string,
  ): LogicRule[] {
    return this.rules.filter((rule) => {
      // Check trigger match
      if (rule.trigger && rule.trigger !== trigger) {
        return false;
      }

      // Check source refs match (if specified)
      if (changedFieldRef && rule.sourceRefs && rule.sourceRefs.length > 0) {
        if (!rule.sourceRefs.includes(changedFieldRef)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort rules by priority (higher priority first).
   */
  private sortByPriority(rules: LogicRule[]): LogicRule[] {
    return [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Create an initial result from the current state.
   */
  private createInitialResult(state: FormRuntimeState): EvaluationResult {
    return {
      variables: { ...state.variables },
      visibility: { ...state.visibility },
      enabled: { ...state.enabled },
      required: { ...state.required },
      navigation: null,
      score: state.score,
      outcome: state.outcome,
      skipRefs: [],
      fieldValues: {},
    };
  }

  /**
   * Merge state with evaluation result for cascading evaluation.
   */
  private mergeStateWithResult(
    state: FormRuntimeState,
    result: EvaluationResult,
  ): FormRuntimeState {
    return {
      ...state,
      variables: { ...state.variables, ...result.variables },
      visibility: { ...state.visibility, ...result.visibility },
      enabled: { ...state.enabled, ...result.enabled },
      required: { ...state.required, ...result.required },
      answers: { ...state.answers, ...result.fieldValues },
      score: result.score,
      outcome: result.outcome,
    };
  }

  /**
   * Calculate score from answers and current result.
   */
  private calculateScore(
    answers: Record<string, unknown>,
    result: EvaluationResult,
    fieldAnswerGetter?: (ref: string) => unknown,
  ): number {
    // Merge answers with any field value overrides
    const mergedAnswers = { ...answers, ...result.fieldValues };
    const scoringResult = this.scoringEngine.calculate(
      mergedAnswers,
    );
    return scoringResult.score;
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Create a new LogicEngine instance.
 */
export function createLogicEngine(config: LogicEngineConfig): LogicEngine {
  return new LogicEngine(config);
}
