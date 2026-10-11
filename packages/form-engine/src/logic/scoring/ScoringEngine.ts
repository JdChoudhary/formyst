/**
 * Scoring Engine
 *
 * Handles quiz scoring, points calculation, and score variables.
 * This is a separate service that consumes the same submission state
 * as the logic engine.
 */

import type {
  ScoringRule,
  FormRuntimeState,
  Condition,
} from "../../types";
import { evaluateCondition } from "../conditions/evaluateCondition";
import { asNumber } from "../conditions/valueResolver";

// ---------------------------------------------------------------------------
// Scoring result
// ---------------------------------------------------------------------------

export interface ScoringResult {
  /** Total score accumulated */
  score: number;
  /** Maximum possible score */
  totalPossible: number;
  /** Percentage (0-100) */
  percentage: number;
  /** Whether the score meets the passing threshold */
  passed: boolean;
  /** Per-field scoring details */
  fieldScores: FieldScore[];
}

export interface FieldScore {
  fieldRef: string;
  points: number;
  maxPoints: number;
  isCorrect: boolean;
  userAnswer: unknown;
  correctAnswers: (string | number)[];
}

// ---------------------------------------------------------------------------
// Scoring Engine
// ---------------------------------------------------------------------------

export class ScoringEngine {
  private rules: ScoringRule[];
  private passingScore: number;

  constructor(rules: ScoringRule[] = [], passingScore = 70) {
    this.rules = rules;
    this.passingScore = passingScore;
  }

  /**
   * Calculate the score for a set of answers.
   */
  calculate(
    answers: Record<string, unknown>,
    state?: FormRuntimeState,
  ): ScoringResult {
    let score = 0;
    let totalPossible = 0;
    const fieldScores: FieldScore[] = [];

    for (const rule of this.rules) {
      const userAnswer = answers[rule.fieldRef];
      const { points, isCorrect } = this.scoreField(rule, userAnswer);

      score += points;
      totalPossible += rule.points;

      fieldScores.push({
        fieldRef: rule.fieldRef,
        points,
        maxPoints: rule.points,
        isCorrect,
        userAnswer,
        correctAnswers: rule.correctAnswers,
      });
    }

    const percentage =
      totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
    const passed = percentage >= this.passingScore;

    return {
      score,
      totalPossible,
      percentage,
      passed,
      fieldScores,
    };
  }

  /**
   * Score a single field against its scoring rule.
   */
  private scoreField(
    rule: ScoringRule,
    userAnswer: unknown,
  ): { points: number; isCorrect: boolean } {
    const isCorrect = this.checkAnswer(rule, userAnswer);

    if (isCorrect) {
      return { points: rule.points, isCorrect: true };
    }

    // Apply negative points for wrong answers
    const negativePoints = rule.negativePoints ?? 0;
    return {
      points: -negativePoints,
      isCorrect: false,
    };
  }

  /**
   * Check if an answer is correct.
   */
  private checkAnswer(
    rule: ScoringRule,
    userAnswer: unknown,
  ): boolean {
    if (userAnswer === undefined || userAnswer === null || userAnswer === "") {
      return false;
    }

    const correctAnswers = rule.correctAnswers;

    // Single correct answer
    if (!Array.isArray(userAnswer)) {
      return correctAnswers.some(
        (correct) =>
          String(userAnswer).toLowerCase().trim() ===
          String(correct).toLowerCase().trim(),
      );
    }

    // Multiple correct answers (checkbox/multi-select)
    if (rule.partialPoints) {
      // Partial scoring: at least one correct answer selected
      return userAnswer.some((answer) =>
        correctAnswers.some(
          (correct) =>
            String(answer).toLowerCase().trim() ===
            String(correct).toLowerCase().trim(),
        ),
      );
    }

    // Full match required: all correct answers selected, no extras
    const normalizedUser = [...userAnswer]
      .map((a) => String(a).toLowerCase().trim())
      .sort();
    const normalizedCorrect = [...correctAnswers]
      .map((c) => String(c).toLowerCase().trim())
      .sort();

    return (
      normalizedUser.length === normalizedCorrect.length &&
      normalizedUser.every((a, i) => a === normalizedCorrect[i])
    );
  }

  /**
   * Update scoring rules.
   */
  setRules(rules: ScoringRule[]): void {
    this.rules = rules;
  }

  /**
   * Update passing score threshold.
   */
  setPassingScore(score: number): void {
    this.passingScore = score;
  }
}
