/**
 * Outcome Engine
 *
 * Evaluates outcomes based on conditions and determines which result
 * page the user should see. Outcomes are evaluated in deterministic
 * order (by priority, then by array position).
 */

import type {
  Outcome,
  FormRuntimeState,
  Condition,
} from "../../types";
import { evaluateCondition, ConditionContext } from "../conditions/evaluateCondition";

// ---------------------------------------------------------------------------
// Outcome result
// ---------------------------------------------------------------------------

export interface OutcomeResult {
  /** The matched outcome ID, or undefined if no match */
  outcomeId?: string;
  /** The matched outcome object */
  outcome?: Outcome;
  /** Whether the default outcome was used */
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Outcome Engine
// ---------------------------------------------------------------------------

export class OutcomeEngine {
  private outcomes: Outcome[];
  private defaultOutcomeId?: string;

  constructor(outcomes: Outcome[] = [], defaultOutcomeId?: string) {
    this.outcomes = outcomes;
    this.defaultOutcomeId = defaultOutcomeId;
  }

  /**
   * Evaluate all outcomes and return the first match.
   *
   * Outcomes are evaluated in order:
   * 1. Sort by priority (lower number = higher priority)
   * 2. Then by array position (first defined wins)
   * 3. Fall back to default outcome
   */
  evaluate(
    state: FormRuntimeState,
    fieldAnswerGetter?: (ref: string) => unknown,
  ): OutcomeResult {
    // Sort outcomes by priority (lower = higher priority)
    const sorted = [...this.outcomes].sort((a, b) => {
      const pa = a.priority ?? 1000;
      const pb = b.priority ?? 1000;
      return pa - pb;
    });

    const ctx: ConditionContext = {
      state,
      fieldAnswerGetter,
    };

    // Evaluate each outcome
    for (const outcome of sorted) {
      if (!outcome.conditions) {
        // No conditions = always matches (but shouldn't be first usually)
        continue;
      }

      if (evaluateCondition(outcome.conditions, ctx)) {
        return {
          outcomeId: outcome.id,
          outcome,
          isDefault: false,
        };
      }
    }

    // Fall back to default outcome
    if (this.defaultOutcomeId) {
      const defaultOutcome = this.outcomes.find(
        (o) => o.id === this.defaultOutcomeId,
      );
      return {
        outcomeId: this.defaultOutcomeId,
        outcome: defaultOutcome,
        isDefault: true,
      };
    }

    return {
      outcomeId: undefined,
      outcome: undefined,
      isDefault: false,
    };
  }

  /**
   * Update outcomes.
   */
  setOutcomes(outcomes: Outcome[]): void {
    this.outcomes = outcomes;
  }

  /**
   * Set the default outcome ID.
   */
  setDefaultOutcome(id: string): void {
    this.defaultOutcomeId = id;
  }
}
