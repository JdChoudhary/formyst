import { describe, expect, it } from "vitest";
import { createDefaultFormSchema, formSchema } from "@repo/shared";
import type { FormField, FormSchema } from "@repo/shared";
import { calculateQuizScore, isQuizForm } from "./scoring";

/**
 * Fixture mirroring the real "Scoring Test: Web Fundamentals" form:
 * choices carry a `ref` (`option_1`) and a human `label` (`CSS`), the builder
 * writes *labels* into `schema.scoring[].correctAnswers`, and the respondent's
 * submission stores the choice ref plus a boolean for the yes/no question.
 */
function buildSchema(overrides: Partial<FormSchema> = {}): FormSchema {
  const base = createDefaultFormSchema({ title: "Scoring Test: Web Fundamentals" });

  const fields: FormField[] = [
    {
      ref: "field_q1",
      type: "multiple_choice",
      title: "Which language adds visual styles to a web page?",
      properties: {
        choices: [
          { ref: "option_1", label: "CSS" },
          { ref: "option_2", label: "HTML" },
          { ref: "option_3", label: "JavaScript" },
          { ref: "option_4", label: "Python" },
        ],
      },
      validations: {},
    },
    {
      ref: "field_q2",
      type: "multiple_choice",
      title: "What does HTML stand for?",
      properties: {
        choices: [
          { ref: "option_1", label: "HyperText Markup Language" },
          { ref: "option_2", label: "HighText Machine Language" },
        ],
      },
      validations: {},
    },
    {
      ref: "field_q3",
      type: "yes_no",
      title: "Is HTTP a stateless protocol?",
      properties: {
        labels: { left: "No", right: "Yes" },
        explanation:
          "HTTP treats each request independently; state is added by applications through cookies or tokens.",
      },
      validations: {},
    },
  ] as FormField[];

  return {
    ...base,
    fields,
    scoring: [
      { id: "s1", fieldRef: "field_q1", correctAnswers: ["CSS"], points: 1 },
      { id: "s2", fieldRef: "field_q2", correctAnswers: ["HyperText Markup Language"], points: 1 },
      { id: "s3", fieldRef: "field_q3", correctAnswers: ["Yes"], points: 1 },
    ],
    settings: {
      ...base.settings,
      quiz: {
        enabled: true,
        showScore: true,
        showCorrectAnswers: true,
        passingScore: 70,
      },
    },
    ...overrides,
  } as FormSchema;
}

describe("calculateQuizScore", () => {
  it("scores ref-based submissions against label-based correct answers", () => {
    const result = calculateQuizScore(buildSchema(), {
      field_q1: "option_1",
      field_q2: "option_1",
      field_q3: true,
    });

    expect(result.score).toBe(3);
    expect(result.totalPossible).toBe(3);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.fieldResults.every((field) => field.isCorrect)).toBe(true);
  });

  it("renders human labels instead of stored refs and booleans", () => {
    const result = calculateQuizScore(buildSchema(), {
      field_q1: "option_1",
      field_q2: "option_1",
      field_q3: true,
    });

    expect(result.fieldResults[0]!.userAnswer).toBe("CSS");
    expect(result.fieldResults[0]!.correctAnswer).toBe("CSS");
    expect(result.fieldResults[1]!.userAnswer).toBe("HyperText Markup Language");
    expect(result.fieldResults[2]!.userAnswer).toBe("Yes");
    expect(result.fieldResults[2]!.correctAnswer).toBe("Yes");
  });

  it("shows the label of a wrong answer and applies zero points", () => {
    const result = calculateQuizScore(buildSchema(), {
      field_q1: "option_2",
      field_q2: "option_1",
      field_q3: true,
    });

    const first = result.fieldResults[0]!;
    expect(first.userAnswer).toBe("HTML");
    expect(first.correctAnswer).toBe("CSS");
    expect(first.isCorrect).toBe(false);
    expect(first.points).toBe(0);
    expect(result.score).toBe(2);
    expect(result.percentage).toBe(67);
  });

  it("resolves a stored ref and its label to the same answer", () => {
    const schema = buildSchema({
      scoring: [{ id: "s1", fieldRef: "field_q1", correctAnswers: ["option_1"], points: 5 }],
    });

    // Rule stores the ref, respondent submits the ref.
    expect(calculateQuizScore(schema, { field_q1: "option_1" }).score).toBe(5);
    // Rule stores the ref, respondent submits the label (older submissions).
    expect(calculateQuizScore(schema, { field_q1: "CSS" }).score).toBe(5);
  });

  it("maps booleans onto the author's custom yes/no labels", () => {
    const result = calculateQuizScore(buildSchema(), {
      field_q1: "option_1",
      field_q2: "option_1",
      field_q3: false,
    });

    const third = result.fieldResults[2]!;
    expect(third.userAnswer).toBe("No");
    expect(third.isCorrect).toBe(false);
  });

  it("awards partial points when at least one selected option is correct", () => {
    const schema = buildSchema();
    const withMulti = {
      ...schema,
      fields: schema.fields.map((field) =>
        field.ref === "field_q1"
          ? { ...field, type: "checkbox" as const, properties: { ...field.properties, allow_multiple_selection: true } }
          : field,
      ),
      scoring: [
        { id: "s1", fieldRef: "field_q1", correctAnswers: ["CSS"], points: 2, partialPoints: true },
      ],
    } as FormSchema;

    const result = calculateQuizScore(withMulti, { field_q1: ["option_2", "option_1"] });
    expect(result.score).toBe(2);
    expect(result.fieldResults[0]!.userAnswer).toEqual(["HTML", "CSS"]);
  });

  it("deducts negative points for a wrong answer", () => {
    const schema = buildSchema({
      scoring: [
        { id: "s1", fieldRef: "field_q1", correctAnswers: ["CSS"], points: 5, negativePoints: 2 },
      ],
    });

    const result = calculateQuizScore(schema, { field_q1: "option_3" });
    expect(result.fieldResults[0]!.points).toBe(-2);
    expect(result.score).toBe(-2);
    expect(result.fieldResults[0]!.userAnswer).toBe("JavaScript");
  });

  it("treats an unanswered question as incorrect without scoring it", () => {
    const result = calculateQuizScore(buildSchema(), {
      field_q1: "option_1",
      field_q2: "option_1",
      field_q3: "",
    });

    expect(result.answeredQuestions).toBe(2);
    expect(result.fieldResults[2]!.userAnswer).toBe("");
    expect(result.fieldResults[2]!.isCorrect).toBe(false);
  });
});

/**
 * Quiz settings are authored in the Logic tab and persisted on the schema, so
 * they must survive the form validator and still drive the grader. These tests
 * fail if `settings.quiz` is stripped or renamed anywhere along that path.
 */
describe("quiz settings round-trip", () => {
  it("keeps quiz settings when the form is validated", () => {
    const parsed = formSchema.parse({
      ...buildSchema(),
      settings: {
        ...buildSchema().settings,
        quiz: {
          enabled: true,
          passingScore: 50,
          showScore: true,
          showCorrectAnswers: false,
          allowRetake: true,
          timeLimit: 15,
          resultMessage: { pass: "Nice", fail: "Try again" },
        },
      },
    });

    expect(parsed.settings?.quiz).toMatchObject({
      enabled: true,
      passingScore: 50,
      showCorrectAnswers: false,
      allowRetake: true,
      timeLimit: 15,
    });
  });

  it("uses the configured passing score to decide the result", () => {
    const lenient = calculateQuizScore(
      { ...buildSchema(), settings: { ...buildSchema().settings, quiz: { enabled: true, passingScore: 50 } } },
      { field_q1: "option_1", field_q2: "option_1", field_q3: false },
    );
    const strict = calculateQuizScore(
      { ...buildSchema(), settings: { ...buildSchema().settings, quiz: { enabled: true, passingScore: 100 } } },
      { field_q1: "option_1", field_q2: "option_1", field_q3: false },
    );

    expect(lenient.percentage).toBe(67);
    expect(lenient.passed).toBe(true);
    expect(strict.passed).toBe(false);
  });

  it("reports quiz mode from the form-level setting", () => {
    expect(isQuizForm(buildSchema())).toBe(true);
    expect(
      isQuizForm({ ...buildSchema(), settings: { ...buildSchema().settings, quiz: undefined } }),
    ).toBe(false);
  });
});
