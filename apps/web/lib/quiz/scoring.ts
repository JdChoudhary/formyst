import { getFields, normalizeFormSchemaSafe } from "@repo/shared";
import type { FormField, FormSchema, FormSubmission } from "@repo/shared/form/form-types";

export interface QuizResult {
  score: number;
  totalPossible: number;
  percentage: number;
  passed: boolean;
  answeredQuestions: number;
  totalQuestions: number;
  fieldResults: QuizFieldResult[];
}

export interface QuizFieldResult {
  fieldId: string;
  fieldLabel: string;
  /** Human-readable answer (choice label / Yes-No label), not the stored ref. */
  userAnswer: string | string[];
  /** Human-readable correct answer, matching the stored scoring rule. */
  correctAnswer: string | string[];
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  explanation?: string;
}

/** The new schema has no quiz-specific field properties — quiz scoring is
 *  expressed with the logic engine (variables + set/add/subtract actions).
 *  These helpers keep the analytics surface stable while returning empty
 *  results unless a quiz configuration is present. */
function quizOf(field: FormField): {
  isQuizField: boolean;
  correctAnswer?: string | string[];
  points?: number;
  explanation?: string;
} {
  const props = (field.properties ?? {}) as Record<string, any>;
  return {
    isQuizField: props.isQuizField ?? false,
    correctAnswer: props.correctAnswer,
    points: props.points,
    explanation: props.explanation,
  };
}

/* ============================================================================
 * Answer resolution
 *
 * Submissions store the value the control emitted: a choice's `ref` (e.g.
 * `option_1`), a boolean for yes/no, a number for rating. The builder, on the
 * other hand, stores the *label* in `scoring[].correctAnswers`. Comparing the
 * two raw strings made every answer look wrong and rendered refs in the
 * results screen, so both sides are resolved through the field definition:
 * every choice is known by all of its identities (ref, label, text, index),
 * and yes/no answers are known by both their boolean and their label.
 * ========================================================================== */

interface ChoiceLike {
  id?: string;
  ref?: string;
  label?: string;
  text?: string;
}

const normalize = (value: unknown): string => String(value).toLowerCase().trim();

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

function getChoices(field: FormField | undefined): ChoiceLike[] {
  const choices = (field?.properties as Record<string, unknown> | undefined)?.choices;
  return Array.isArray(choices) ? (choices as ChoiceLike[]) : [];
}

function isYesNoField(field: FormField | undefined): boolean {
  return field?.type === "yes_no";
}

/** Custom yes/no wording when the author set it, otherwise the defaults. */
function yesNoLabels(field: FormField | undefined): { yes: string; no: string } {
  const props = (field?.properties ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = props[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
  };

  // The yes/no editor stores its wording under `labels: { right, left }`,
  // where the right-hand label is the affirmative one.
  const labels = (props.labels ?? {}) as Record<string, unknown>;
  const label = (key: "right" | "left"): string | undefined => {
    const value = labels[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  return {
    yes:
      pick("yes_label", "yesLabel", "trueLabel") ?? label("right") ?? "Yes",
    no: pick("no_label", "noLabel", "falseLabel") ?? label("left") ?? "No",
  };
}

/** All normalized identities a single choice can be referred to by. */
function choiceIdentities(choice: ChoiceLike, index: number): string[] {
  return [choice.ref, choice.label, choice.text, choice.id, String(index)]
    .filter((value) => value !== undefined && value !== null && String(value) !== "")
    .map(normalize);
}

/** The truthy/falsey spellings a boolean-like answer can arrive as. */
const TRUE_TOKENS = new Set(["true", "yes", "1", "on"]);
const FALSE_TOKENS = new Set(["false", "no", "0", "off"]);

/**
 * Every normalized token an answer value can be identified by for this field.
 * Used for comparison, so a submitted `option_1` matches a stored `CSS` and a
 * submitted `true` matches a stored `Yes`.
 */
function answerTokens(field: FormField | undefined, value: unknown): string[] {
  if (isEmpty(value)) return [];
  const raw = normalize(value);
  const tokens = new Set<string>([raw]);

  if (isYesNoField(field)) {
    const { yes, no } = yesNoLabels(field);
    if (TRUE_TOKENS.has(raw)) {
      ["true", "yes", "1", normalize(yes)].forEach((token) => tokens.add(token));
    } else if (FALSE_TOKENS.has(raw)) {
      ["false", "no", "0", normalize(no)].forEach((token) => tokens.add(token));
    }
  }

  const choices = getChoices(field);
  for (let index = 0; index < choices.length; index += 1) {
    const identities = choiceIdentities(choices[index]!, index);
    if (identities.includes(raw)) {
      identities.forEach((token) => tokens.add(token));
    }
  }

  return [...tokens];
}

/** True when two answer values refer to the same option / boolean / scalar. */
function valuesMatch(field: FormField | undefined, a: unknown, b: unknown): boolean {
  const aTokens = answerTokens(field, a);
  const bTokens = answerTokens(field, b);
  if (aTokens.length === 0 || bTokens.length === 0) return false;
  return aTokens.some((token) => bTokens.includes(token));
}

/** The label a respondent should see for a stored answer value. */
function displayValue(field: FormField | undefined, value: unknown): string {
  if (isEmpty(value)) return "";

  if (isYesNoField(field)) {
    const raw = normalize(value);
    const { yes, no } = yesNoLabels(field);
    if (TRUE_TOKENS.has(raw)) return yes;
    if (FALSE_TOKENS.has(raw)) return no;
  }

  const choices = getChoices(field);
  const raw = normalize(value);
  for (let index = 0; index < choices.length; index += 1) {
    const choice = choices[index]!;
    if (choiceIdentities(choice, index).includes(raw)) {
      return choice.label ?? choice.text ?? choice.ref ?? String(value);
    }
  }

  // Fall back to a plain rendering — booleans read better as Yes/No than "true".
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/** Render one or many stored values as labels (or raw strings). */
function displayAnswer(
  field: FormField | undefined,
  value: unknown,
): string | string[] {
  if (Array.isArray(value)) {
    const labels = value
      .filter((entry) => !isEmpty(entry))
      .map((entry) => displayValue(field, entry));
    // A single item reads better as a string than as a one-element list.
    return labels.length === 1 ? labels[0]! : labels;
  }
  return displayValue(field, value);
}

/** Normalize a value into the list of individual answers it contains. */
function toAnswerList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.filter((entry) => !isEmpty(entry));
  return isEmpty(value) ? [] : [value];
}

/**
 * One-to-one comparison of a respondent's answers against the rule's correct
 * answers, resolving choice refs, labels, indices and booleans.
 */
function isAnswerCorrect(
  field: FormField | undefined,
  userAnswer: unknown,
  correctAnswers: unknown[],
): boolean {
  const expected = correctAnswers.filter((value) => !isEmpty(value));
  if (expected.length === 0) return false;

  const actual = toAnswerList(userAnswer);
  if (actual.length !== expected.length) return false;

  const usedCorrect = new Set<number>();
  for (const answer of actual) {
    const matchIndex = expected.findIndex(
      (correct, index) => !usedCorrect.has(index) && valuesMatch(field, answer, correct),
    );
    if (matchIndex === -1) return false;
    usedCorrect.add(matchIndex);
  }
  return true;
}

/** "At least one selected answer is correct" (used by partial-credit rules). */
function hasAnyCorrectAnswer(
  field: FormField | undefined,
  userAnswer: unknown,
  correctAnswers: unknown[],
): boolean {
  const expected = correctAnswers.filter((value) => !isEmpty(value));
  return toAnswerList(userAnswer).some((answer) =>
    expected.some((correct) => valuesMatch(field, answer, correct)),
  );
}

export function calculateQuizScore(
  schema: FormSchema,
  submissionData: Record<string, any>,
): QuizResult {
  const allFields = getAllFields(schema);

  // Prefer the current Logic → Scoring rules. The builder writes these to
  // `schema.scoring`; field-level quiz properties are retained as a legacy
  // fallback for forms created before the scoring panel existed.
  const scoringRules = schema.scoring ?? [];
  if (scoringRules.length > 0) {
    let totalScore = 0;
    let totalPossible = 0;
    let answeredQuestions = 0;

    const fieldResults: QuizFieldResult[] = scoringRules.map((rule) => {
      const field = allFields.find((candidate) => candidate.ref === rule.fieldRef);
      const userAnswer = submissionData[rule.fieldRef];
      const isAnswered = !isEmpty(userAnswer);
      const correctAnswers = rule.correctAnswers.map(String);
      const isCorrect =
        isAnswered &&
        (rule.partialPoints
          ? hasAnyCorrectAnswer(field, userAnswer, correctAnswers)
          : isAnswerCorrect(field, userAnswer, correctAnswers));
      // Avoid `-0` for questions without a penalty — it reads as a bug.
      const penalty = rule.negativePoints ?? 0;
      const points = isCorrect ? rule.points : penalty > 0 ? -penalty : 0;

      if (isAnswered) answeredQuestions++;
      totalScore += points;
      totalPossible += rule.points;

      return {
        fieldId: rule.fieldRef,
        fieldLabel: field?.title || rule.fieldRef,
        // Resolve both sides to labels so the results screen never shows a
        // stored ref such as "option_1" or a raw "true".
        userAnswer: displayAnswer(field, userAnswer),
        correctAnswer: displayAnswer(field, correctAnswers),
        isCorrect,
        points,
        maxPoints: rule.points,
        explanation: field ? quizOf(field).explanation : undefined,
      };
    });

    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    const passingScore = schema.settings?.quiz?.passingScore || 70;

    return {
      score: totalScore,
      totalPossible,
      percentage,
      passed: percentage >= passingScore,
      answeredQuestions,
      totalQuestions: scoringRules.length,
      fieldResults,
    };
  }

  const quizFields = allFields.filter((field) => quizOf(field).isQuizField);

  if (quizFields.length === 0) {
    return {
      score: 0,
      totalPossible: 0,
      percentage: 0,
      passed: true,
      answeredQuestions: 0,
      totalQuestions: 0,
      fieldResults: [],
    };
  }

  let totalScore = 0;
  let totalPossible = 0;
  let answeredQuestions = 0;
  const fieldResults: QuizFieldResult[] = [];

  for (const field of quizFields) {
    const userAnswer = submissionData[field.ref ?? ""];
    const quiz = quizOf(field);
    const correctAnswer = quiz.correctAnswer;
    const points = quiz.points || 1;
    const explanation = quiz.explanation;

    totalPossible += points;

    const isAnswered = !isEmpty(userAnswer);
    if (isAnswered) {
      answeredQuestions++;
    }

    const correctList = toAnswerList(correctAnswer);
    const isCorrect =
      isAnswered && correctList.length > 0 && isAnswerCorrect(field, userAnswer, correctList);

    if (isCorrect) {
      totalScore += points;
    }

    fieldResults.push({
      fieldId: field.ref ?? "",
      fieldLabel: field.title,
      userAnswer: displayAnswer(field, userAnswer),
      correctAnswer: displayAnswer(field, correctList),
      isCorrect,
      points: isCorrect ? points : 0,
      maxPoints: points,
      explanation,
    });
  }

  const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  const passingScore = schema.settings?.quiz?.passingScore || 70;
  const passed = percentage >= passingScore;

  return {
    score: totalScore,
    totalPossible,
    percentage,
    passed,
    answeredQuestions,
    totalQuestions: quizFields.length,
    fieldResults,
  };
}

function getAllFields(schema: FormSchema): FormField[] {
  const v2 = normalizeFormSchemaSafe(schema);
  if (v2) return getFields(v2);
  return [];
}

export function generateQuizResultMessage(result: QuizResult, schema: FormSchema): string {
  const { passed, percentage, score, totalPossible } = result;
  const quizSettings = schema.settings?.quiz;

  if (passed && quizSettings?.resultMessage?.pass) {
    return quizSettings.resultMessage.pass
      .replace("{score}", String(score))
      .replace("{percentage}", String(percentage))
      .replace("{total}", String(totalPossible));
  }

  if (!passed && quizSettings?.resultMessage?.fail) {
    return quizSettings.resultMessage.fail
      .replace("{score}", String(score))
      .replace("{percentage}", String(percentage))
      .replace("{total}", String(totalPossible));
  }

  if (passed) {
    return `Congratulations! You passed with ${percentage}% (${score}/${totalPossible} points).`;
  }
  const passingScore = quizSettings?.passingScore || 70;
  return `You scored ${percentage}% (${score}/${totalPossible} points). You need ${passingScore}% to pass.`;
}

export function isQuizField(field: FormField): boolean {
  return quizOf(field).isQuizField;
}

export function isQuizForm(schema: FormSchema): boolean {
  return Boolean(schema.settings?.quiz?.enabled);
}

export function getQuizStatistics(
  schema: FormSchema,
  submissions: FormSubmission[],
): {
  averageScore: number;
  passRate: number;
  totalAttempts: number;
  questionStats: Array<{
    fieldId: string;
    fieldLabel: string;
    correctRate: number;
    totalAnswers: number;
  }>;
} {
  if (!isQuizForm(schema) || submissions.length === 0) {
    return {
      averageScore: 0,
      passRate: 0,
      totalAttempts: 0,
      questionStats: [],
    };
  }

  let totalScore = 0;
  let passedCount = 0;
  const questionCorrectCounts: Record<string, { correct: number; total: number; label: string }> =
    {};

  const allFields = getAllFields(schema);
  const scoringRules = schema.scoring ?? [];
  const quizFields =
    scoringRules.length > 0
      ? scoringRules
          .map((rule) => allFields.find((field) => field.ref === rule.fieldRef))
          .filter((field): field is FormField => Boolean(field))
      : allFields.filter((field) => quizOf(field).isQuizField);

  for (const field of quizFields) {
    questionCorrectCounts[field.ref ?? ""] = {
      correct: 0,
      total: 0,
      label: field.title,
    };
  }

  for (const submission of submissions) {
    const result = calculateQuizScore(schema, submission.submission_data);
    totalScore += result.percentage;

    if (result.passed) {
      passedCount++;
    }

    for (const fieldResult of result.fieldResults) {
      if (questionCorrectCounts[fieldResult.fieldId]) {
        questionCorrectCounts[fieldResult.fieldId].total++;
        if (fieldResult.isCorrect) {
          questionCorrectCounts[fieldResult.fieldId].correct++;
        }
      }
    }
  }

  const averageScore = submissions.length > 0 ? Math.round(totalScore / submissions.length) : 0;
  const passRate =
    submissions.length > 0 ? Math.round((passedCount / submissions.length) * 100) : 0;

  const questionStats = Object.entries(questionCorrectCounts).map(([fieldId, stats]) => ({
    fieldId,
    fieldLabel: stats.label,
    correctRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    totalAnswers: stats.total,
  }));

  return {
    averageScore,
    passRate,
    totalAttempts: submissions.length,
    questionStats,
  };
}
