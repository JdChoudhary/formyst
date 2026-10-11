/**
 * Logic Engine — Comprehensive Test Suite
 *
 * Tests cover:
 * - Simple equality conditions
 * - AND / OR / NOT logic
 * - Nested condition groups
 * - Numeric comparisons
 * - String comparisons
 * - Boolean comparisons
 * - Show/hide actions
 * - Jump actions
 * - Skip actions
 * - Variable arithmetic
 * - Multiple actions per rule
 * - Scoring engine
 * - Outcome evaluation
 * - Validation (references, types, cycles)
 * - Rule priority
 * - Realistic form flows
 */

import { describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Import engine components
// ---------------------------------------------------------------------------

import {
  evaluateCondition,
  evaluateOperator,
  resolveValue,
  executeActions,
  LogicEngine,
  createLogicEngine,
  NavigationEngine,
  ScoringEngine,
  OutcomeEngine,
  validateLogic,
  generateRuleSummary,
  evaluateExpression,
  FormRuntime,
  createFormRuntime,
} from "../index";

import type {
  Condition,
  LogicRule,
  LogicAction,
  FormRuntimeState,
  LogicEngineConfig,
  EvaluationResult,
  ValueReference,
} from "../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<FormRuntimeState> = {}): FormRuntimeState {
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
    ...overrides,
  };
}

function makeConfig(overrides: Partial<LogicEngineConfig["form"]> = {}): LogicEngineConfig {
  return {
    form: {
      fields: [
        { ref: "age", title: "Age", type: "number" },
        { ref: "name", title: "Name", type: "short_text" },
        { ref: "country", title: "Country", type: "dropdown" },
        { ref: "employed", title: "Employed?", type: "yes_no" },
        { ref: "parent_consent", title: "Parent Consent", type: "legal" },
        { ref: "employment_details", title: "Employment Details", type: "short_text" },
        { ref: "education_details", title: "Education Details", type: "short_text" },
      ],
      groups: [],
      logic: [],
      variables: {},
      thankyou_screens: [{ ref: "default_thankyou", title: "Thank you!" }],
      outcomes: [],
      scoring: [],
      settings: {},
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// Value Resolver Tests
// ---------------------------------------------------------------------------

describe("Value Resolver", () => {
  it("resolves field references", () => {
    const state = makeState({ answers: { age: 25 } });
    const result = resolveValue({ type: "field", ref: "age" }, state);
    expect(result).toBe(25);
  });

  it("resolves variable references", () => {
    const state = makeState({ variables: { score: 80 } });
    const result = resolveValue({ type: "variable", ref: "score" }, state);
    expect(result).toBe(80);
  });

  it("resolves constant references", () => {
    const state = makeState();
    const result = resolveValue({ type: "constant", value: 42 }, state);
    expect(result).toBe(42);
  });

  it("resolves system references", () => {
    const state = makeState({ progress: 75 });
    const result = resolveValue({ type: "system", key: "progress" }, state);
    expect(result).toBe(75);
  });

  it("resolves score references", () => {
    const state = makeState({ score: 90 });
    const result = resolveValue({ type: "score" }, state);
    expect(result).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// Operator Tests
// ---------------------------------------------------------------------------

describe("Operators", () => {
  describe("String operators", () => {
    it("equals", () => {
      expect(evaluateOperator({ operator: "equals", left: "hello", right: "hello" })).toBe(true);
      expect(evaluateOperator({ operator: "equals", left: "hello", right: "world" })).toBe(false);
    });

    it("not_equals", () => {
      expect(evaluateOperator({ operator: "not_equals", left: "a", right: "b" })).toBe(true);
      expect(evaluateOperator({ operator: "not_equals", left: "a", right: "a" })).toBe(false);
    });

    it("contains", () => {
      expect(evaluateOperator({ operator: "contains", left: "hello world", right: "world" })).toBe(true);
      expect(evaluateOperator({ operator: "contains", left: "hello", right: "world" })).toBe(false);
    });

    it("starts_with", () => {
      expect(evaluateOperator({ operator: "starts_with", left: "hello", right: "hel" })).toBe(true);
      expect(evaluateOperator({ operator: "starts_with", left: "hello", right: "world" })).toBe(false);
    });

    it("is_empty", () => {
      expect(evaluateOperator({ operator: "is_empty", left: "" })).toBe(true);
      expect(evaluateOperator({ operator: "is_empty", left: null })).toBe(true);
      expect(evaluateOperator({ operator: "is_empty", left: "hello" })).toBe(false);
    });
  });

  describe("Number operators", () => {
    it("less_than", () => {
      expect(evaluateOperator({ operator: "less_than", left: 5, right: 10 })).toBe(true);
      expect(evaluateOperator({ operator: "less_than", left: 10, right: 5 })).toBe(false);
      expect(evaluateOperator({ operator: "less_than", left: 5, right: 5 })).toBe(false);
    });

    it("greater_than_or_equal", () => {
      expect(evaluateOperator({ operator: "greater_than_or_equal", left: 10, right: 10 })).toBe(true);
      expect(evaluateOperator({ operator: "greater_than_or_equal", left: 11, right: 10 })).toBe(true);
      expect(evaluateOperator({ operator: "greater_than_or_equal", left: 9, right: 10 })).toBe(false);
    });
  });

  describe("Boolean operators", () => {
    it("is_true", () => {
      expect(evaluateOperator({ operator: "is_true", left: true })).toBe(true);
      expect(evaluateOperator({ operator: "is_true", left: false })).toBe(false);
      expect(evaluateOperator({ operator: "is_true", left: "yes" })).toBe(true);
    });

    it("is_false", () => {
      expect(evaluateOperator({ operator: "is_false", left: false })).toBe(true);
      expect(evaluateOperator({ operator: "is_false", left: true })).toBe(false);
    });
  });

  describe("General operators", () => {
    it("always", () => {
      expect(evaluateOperator({ operator: "always", left: undefined })).toBe(true);
    });

    it("never", () => {
      expect(evaluateOperator({ operator: "never", left: undefined })).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Condition Evaluator Tests
// ---------------------------------------------------------------------------

describe("Condition Evaluator", () => {
  const state = makeState({
    answers: { age: 17, country: "India", employed: "yes" },
    variables: { score: 50 },
  });

  describe("Simple conditions", () => {
    it("evaluates simple equality", () => {
      const cond: Condition = {
        type: "condition",
        source: { type: "field", ref: "country" },
        operator: "equals",
        value: { type: "constant", value: "India" },
      };
      expect(evaluateCondition(cond, { state })).toBe(true);
    });

    it("evaluates numeric comparison", () => {
      const cond: Condition = {
        type: "condition",
        source: { type: "field", ref: "age" },
        operator: "less_than",
        value: { type: "constant", value: 18 },
      };
      expect(evaluateCondition(cond, { state })).toBe(true);
    });

    it("evaluates 'always' operator", () => {
      const cond: Condition = {
        type: "condition",
        source: { type: "constant", value: null },
        operator: "always",
      };
      expect(evaluateCondition(cond, { state })).toBe(true);
    });
  });

  describe("AND conditions", () => {
    it("evaluates AND group (all true)", () => {
      const cond: Condition = {
        type: "group",
        operator: "and",
        conditions: [
          {
            type: "condition",
            source: { type: "field", ref: "age" },
            operator: "less_than",
            value: { type: "constant", value: 18 },
          },
          {
            type: "condition",
            source: { type: "field", ref: "country" },
            operator: "equals",
            value: { type: "constant", value: "India" },
          },
        ],
      };
      expect(evaluateCondition(cond, { state })).toBe(true);
    });

    it("evaluates AND group (one false)", () => {
      const cond: Condition = {
        type: "group",
        operator: "and",
        conditions: [
          {
            type: "condition",
            source: { type: "field", ref: "age" },
            operator: "less_than",
            value: { type: "constant", value: 18 },
          },
          {
            type: "condition",
            source: { type: "field", ref: "country" },
            operator: "equals",
            value: { type: "constant", value: "USA" },
          },
        ],
      };
      expect(evaluateCondition(cond, { state })).toBe(false);
    });
  });

  describe("OR conditions", () => {
    it("evaluates OR group (one true)", () => {
      const cond: Condition = {
        type: "group",
        operator: "or",
        conditions: [
          {
            type: "condition",
            source: { type: "field", ref: "country" },
            operator: "equals",
            value: { type: "constant", value: "USA" },
          },
          {
            type: "condition",
            source: { type: "field", ref: "country" },
            operator: "equals",
            value: { type: "constant", value: "India" },
          },
        ],
      };
      expect(evaluateCondition(cond, { state })).toBe(true);
    });

    it("evaluates OR group (all false)", () => {
      const cond: Condition = {
        type: "group",
        operator: "or",
        conditions: [
          {
            type: "condition",
            source: { type: "field", ref: "country" },
            operator: "equals",
            value: { type: "constant", value: "USA" },
          },
          {
            type: "condition",
            source: { type: "field", ref: "country" },
            operator: "equals",
            value: { type: "constant", value: "UK" },
          },
        ],
      };
      expect(evaluateCondition(cond, { state })).toBe(false);
    });
  });

  describe("NOT conditions", () => {
    it("evaluates NOT (inverts true to false)", () => {
      const cond: Condition = {
        type: "not",
        condition: {
          type: "condition",
          source: { type: "field", ref: "country" },
          operator: "equals",
          value: { type: "constant", value: "India" },
        },
      };
      expect(evaluateCondition(cond, { state })).toBe(false);
    });

    it("evaluates NOT (inverts false to true)", () => {
      const cond: Condition = {
        type: "not",
        condition: {
          type: "condition",
          source: { type: "field", ref: "country" },
          operator: "equals",
          value: { type: "constant", value: "USA" },
        },
      };
      expect(evaluateCondition(cond, { state })).toBe(true);
    });
  });

  describe("Nested conditions", () => {
    it("evaluates (A AND B) OR (C AND D)", () => {
      const cond: Condition = {
        type: "group",
        operator: "or",
        conditions: [
          {
            type: "group",
            operator: "and",
            conditions: [
              {
                type: "condition",
                source: { type: "field", ref: "age" },
                operator: "less_than",
                value: { type: "constant", value: 18 },
              },
              {
                type: "condition",
                source: { type: "field", ref: "country" },
                operator: "equals",
                value: { type: "constant", value: "USA" },
              },
            ],
          },
          {
            type: "group",
            operator: "and",
            conditions: [
              {
                type: "condition",
                source: { type: "field", ref: "age" },
                operator: "greater_than_or_equal",
                value: { type: "constant", value: 18 },
              },
              {
                type: "condition",
                source: { type: "field", ref: "country" },
                operator: "equals",
                value: { type: "constant", value: "India" },
              },
            ],
          },
        ],
      };
      // age=17, country=India → first group false (USA), second group false (age >= 18)
      expect(evaluateCondition(cond, { state })).toBe(false);
    });

    it("evaluates A AND (B OR C)", () => {
      const cond: Condition = {
        type: "group",
        operator: "and",
        conditions: [
          {
            type: "condition",
            source: { type: "field", ref: "age" },
            operator: "less_than",
            value: { type: "constant", value: 18 },
          },
          {
            type: "group",
            operator: "or",
            conditions: [
              {
                type: "condition",
                source: { type: "field", ref: "country" },
                operator: "equals",
                value: { type: "constant", value: "India" },
              },
              {
                type: "condition",
                source: { type: "field", ref: "country" },
                operator: "equals",
                value: { type: "constant", value: "USA" },
              },
            ],
          },
        ],
      };
      expect(evaluateCondition(cond, { state })).toBe(true);
    });

    it("evaluates NOT(A AND B)", () => {
      const cond: Condition = {
        type: "not",
        condition: {
          type: "group",
          operator: "and",
          conditions: [
            {
              type: "condition",
              source: { type: "field", ref: "age" },
              operator: "less_than",
              value: { type: "constant", value: 18 },
            },
            {
              type: "condition",
              source: { type: "field", ref: "country" },
              operator: "equals",
              value: { type: "constant", value: "India" },
            },
          ],
        },
      };
      // NOT(age < 18 AND country == India) = NOT(true AND true) = NOT(true) = false
      expect(evaluateCondition(cond, { state })).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Action Executor Tests
// ---------------------------------------------------------------------------

describe("Action Executor", () => {
  it("executes jump action", () => {
    const state = makeState();
    const result: EvaluationResult = {
      variables: {},
      visibility: {},
      enabled: {},
      required: {},
      navigation: null,
      score: 0,
      skipRefs: [],
      fieldValues: {},
    };
    const ctx = { state, result };

    executeActions(
      [
        {
          type: "jump",
          target: { type: "field", ref: "next_field" },
        },
      ],
      ctx,
    );

    expect(result.navigation).toBe("next_field");
  });

  it("executes show/hide actions", () => {
    const state = makeState();
    const result: EvaluationResult = {
      variables: {},
      visibility: {},
      enabled: {},
      required: {},
      navigation: null,
      score: 0,
      skipRefs: [],
      fieldValues: {},
    };
    const ctx = { state, result };

    executeActions(
      [
        { type: "show_field", target: { type: "field", ref: "field_a" } },
        { type: "hide_field", target: { type: "field", ref: "field_b" } },
      ],
      ctx,
    );

    expect(result.visibility["field_a"]).toBe(true);
    expect(result.visibility["field_b"]).toBe(false);
  });

  it("executes make_required/make_optional actions", () => {
    const state = makeState();
    const result: EvaluationResult = {
      variables: {},
      visibility: {},
      enabled: {},
      required: {},
      navigation: null,
      score: 0,
      skipRefs: [],
      fieldValues: {},
    };
    const ctx = { state, result };

    executeActions(
      [
        { type: "make_required", target: { type: "field", ref: "consent" } },
        { type: "make_optional", target: { type: "field", ref: "notes" } },
      ],
      ctx,
    );

    expect(result.required["consent"]).toBe(true);
    expect(result.required["notes"]).toBe(false);
  });

  it("executes variable arithmetic actions", () => {
    const state = makeState({ variables: { total: 0 } });
    const result: EvaluationResult = {
      variables: { total: 0 },
      visibility: {},
      enabled: {},
      required: {},
      navigation: null,
      score: 0,
      skipRefs: [],
      fieldValues: {},
    };
    const ctx = { state, result };

    executeActions(
      [
        { type: "set_variable", target: "total", value: { type: "constant", value: 100 } },
        { type: "add_variable", target: "total", value: { type: "constant", value: 50 } },
        { type: "subtract_variable", target: "total", value: { type: "constant", value: 25 } },
        { type: "multiply_variable", target: "total", value: { type: "constant", value: 2 } },
      ],
      ctx,
    );

    // 100 + 50 = 150, 150 - 25 = 125, 125 * 2 = 250
    expect(result.variables["total"]).toBe(250);
  });

  it("executes multiple actions in order", () => {
    const state = makeState({ variables: { minor: false } });
    const result: EvaluationResult = {
      variables: { minor: false },
      visibility: {},
      enabled: {},
      required: {},
      navigation: null,
      score: 0,
      skipRefs: [],
      fieldValues: {},
    };
    const ctx = { state, result };

    executeActions(
      [
        { type: "show_field", target: { type: "field", ref: "parent_consent" } },
        { type: "make_required", target: { type: "field", ref: "parent_consent" } },
        { type: "set_variable", target: "minor", value: { type: "constant", value: true } },
      ],
      ctx,
    );

    expect(result.visibility["parent_consent"]).toBe(true);
    expect(result.required["parent_consent"]).toBe(true);
    expect(result.variables["minor"]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Logic Engine Tests
// ---------------------------------------------------------------------------

describe("LogicEngine", () => {
  describe("Simple rule evaluation", () => {
    it("evaluates a rule that shows/hides a field", () => {
      const config = makeConfig({
        logic: [
          {
            id: "rule_1",
            trigger: "field_changed",
            sourceRefs: ["age"],
            priority: 0,
            when: {
              type: "condition",
              source: { type: "field", ref: "age" },
              operator: "less_than",
              value: { type: "constant", value: 18 },
            },
            then: [
              { type: "show_field", target: { type: "field", ref: "parent_consent" } },
              { type: "make_required", target: { type: "field", ref: "parent_consent" } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState();

      const result = engine.onFieldChange("age", 17, state);

      expect(result.visibility["parent_consent"]).toBe(true);
      expect(result.required["parent_consent"]).toBe(true);
    });

    it("evaluates a rule that does not match", () => {
      const config = makeConfig({
        logic: [
          {
            id: "rule_1",
            trigger: "field_changed",
            sourceRefs: ["age"],
            priority: 0,
            when: {
              type: "condition",
              source: { type: "field", ref: "age" },
              operator: "less_than",
              value: { type: "constant", value: 18 },
            },
            then: [
              { type: "show_field", target: { type: "field", ref: "parent_consent" } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState();

      const result = engine.onFieldChange("age", 25, state);

      expect(result.visibility["parent_consent"]).toBeUndefined();
    });
  });

  describe("Multiple actions", () => {
    it("executes multiple actions in priority order", () => {
      const config = makeConfig({
        logic: [
          {
            id: "rule_high",
            trigger: "field_changed",
            sourceRefs: ["age"],
            priority: 100,
            when: {
              type: "condition",
              source: { type: "field", ref: "age" },
              operator: "less_than",
              value: { type: "constant", value: 18 },
            },
            then: [
              { type: "show_field", target: { type: "field", ref: "parent_consent" } },
              { type: "make_required", target: { type: "field", ref: "parent_consent" } },
              { type: "set_variable", target: "minor", value: { type: "constant", value: true } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState();

      const result = engine.onFieldChange("age", 17, state);

      expect(result.visibility["parent_consent"]).toBe(true);
      expect(result.required["parent_consent"]).toBe(true);
      expect(result.variables["minor"]).toBe(true);
    });
  });

  describe("Variable operations", () => {
    it("sets and modifies variables", () => {
      const config = makeConfig({
        variables: { total: 0 },
        logic: [
          {
            id: "rule_calc",
            trigger: "form_started",
            priority: 0,
            when: {
              type: "condition",
              source: { type: "constant", value: null },
              operator: "always",
            },
            then: [
              { type: "set_variable", target: "total", value: { type: "constant", value: 100 } },
              { type: "add_variable", target: "total", value: { type: "constant", value: 50 } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState({ variables: { total: 0 } });

      const result = engine.evaluate("form_started", state);

      expect(result.variables["total"]).toBe(150);
    });
  });

  describe("Navigation actions", () => {
    it("evaluates jump to field", () => {
      const config = makeConfig({
        logic: [
          {
            id: "rule_jump",
            trigger: "field_changed",
            sourceRefs: ["employed"],
            priority: 0,
            when: {
              type: "condition",
              source: { type: "field", ref: "employed" },
              operator: "equals",
              value: { type: "constant", value: "yes" },
            },
            then: [
              {
                type: "jump",
                target: { type: "field", ref: "employment_details" },
              },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState({ answers: { employed: "yes" } });

      const result = engine.onFieldChange("employed", "yes", state);

      expect(result.navigation).toBe("employment_details");
    });

    it("evaluates jump to thankyou", () => {
      const config = makeConfig({
        logic: [
          {
            id: "rule_end",
            trigger: "field_changed",
            sourceRefs: ["age"],
            priority: 0,
            when: {
              type: "condition",
              source: { type: "field", ref: "age" },
              operator: "greater_than_or_equal",
              value: { type: "constant", value: 18 },
            },
            then: [
              {
                type: "end_form",
                target: { type: "thankyou", ref: "default_thankyou" },
              },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState();

      const result = engine.onFieldChange("age", 25, state);

      expect(result.navigation).toBe("thankyou");
    });
  });

  describe("Trigger model", () => {
    it("only evaluates rules matching the trigger", () => {
      const config = makeConfig({
        logic: [
          {
            id: "rule_form_start",
            trigger: "form_started",
            priority: 0,
            when: {
              type: "condition",
              source: { type: "constant", value: null },
              operator: "always",
            },
            then: [
              { type: "set_variable", target: "started", value: { type: "constant", value: true } },
            ],
          },
          {
            id: "rule_field_change",
            trigger: "field_changed",
            sourceRefs: ["age"],
            priority: 0,
            when: {
              type: "condition",
              source: { type: "constant", value: null },
              operator: "always",
            },
            then: [
              { type: "set_variable", target: "changed", value: { type: "constant", value: true } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState();

      // Form started — only form_start rule should fire
      const startResult = engine.evaluate("form_started", state);
      expect(startResult.variables["started"]).toBe(true);
      expect(startResult.variables["changed"]).toBeUndefined();

      // Field changed — only field_change rule should fire
      const changeResult = engine.evaluate("field_changed", state, {
        changedFieldRef: "age",
      });
      expect(changeResult.variables["changed"]).toBe(true);
    });
  });

  describe("Source refs filtering", () => {
    it("only evaluates rules whose sourceRefs match the changed field", () => {
      const config = makeConfig({
        logic: [
          {
            id: "rule_age",
            trigger: "field_changed",
            sourceRefs: ["age"],
            priority: 0,
            when: {
              type: "condition",
              source: { type: "constant", value: null },
              operator: "always",
            },
            then: [
              { type: "set_variable", target: "age_changed", value: { type: "constant", value: true } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);
      const state = makeState();

      // Change name — rule should NOT fire
      const nameResult = engine.onFieldChange("name", "John", state);
      expect(nameResult.variables["age_changed"]).toBeUndefined();

      // Change age — rule SHOULD fire
      const ageResult = engine.onFieldChange("age", 25, state);
      expect(ageResult.variables["age_changed"]).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Scoring Engine Tests
// ---------------------------------------------------------------------------

describe("ScoringEngine", () => {
  it("calculates score for correct answers", () => {
    const engine = new ScoringEngine([
      { id: "q1", fieldRef: "question_1", correctAnswers: ["paris"], points: 5 },
      { id: "q2", fieldRef: "question_2", correctAnswers: ["42"], points: 10 },
    ]);

    const result = engine.calculate({
      question_1: "paris",
      question_2: "42",
    });

    expect(result.score).toBe(15);
    expect(result.totalPossible).toBe(15);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("calculates partial score", () => {
    const engine = new ScoringEngine([
      { id: "q1", fieldRef: "question_1", correctAnswers: ["paris"], points: 10 },
      { id: "q2", fieldRef: "question_2", correctAnswers: ["london"], points: 10 },
    ]);

    const result = engine.calculate({
      question_1: "paris",
      question_2: "rome",
    });

    expect(result.score).toBe(10);
    expect(result.percentage).toBe(50);
    expect(result.passed).toBe(false); // 50 < 70 default
  });

  it("applies negative points for wrong answers", () => {
    const engine = new ScoringEngine([
      { id: "q1", fieldRef: "question_1", correctAnswers: ["a"], points: 10, negativePoints: 5 },
    ]);

    const result = engine.calculate({
      question_1: "b",
    });

    expect(result.score).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// Outcome Engine Tests
// ---------------------------------------------------------------------------

describe("OutcomeEngine", () => {
  it("evaluates outcomes by priority", () => {
    const engine = new OutcomeEngine([
      { id: "advanced", title: "Advanced", priority: 1, conditions: {
        type: "condition",
        source: { type: "variable", ref: "score" },
        operator: "greater_than_or_equal",
        value: { type: "constant", value: 80 },
      }},
      { id: "intermediate", title: "Intermediate", priority: 2, conditions: {
        type: "condition",
        source: { type: "variable", ref: "score" },
        operator: "greater_than_or_equal",
        value: { type: "constant", value: 50 },
      }},
      { id: "beginner", title: "Beginner", priority: 3, conditions: {
        type: "condition",
        source: { type: "constant", value: null },
        operator: "always",
      }},
    ]);

    const state = makeState({ variables: { score: 85 } });
    const result = engine.evaluate(state);

    expect(result.outcomeId).toBe("advanced");
  });

  it("falls back to default outcome", () => {
    const engine = new OutcomeEngine(
      [
        { id: "advanced", title: "Advanced", conditions: {
          type: "condition",
          source: { type: "variable", ref: "score" },
          operator: "greater_than_or_equal",
          value: { type: "constant", value: 80 },
        }},
      ],
      "beginner",
    );

    const state = makeState({ variables: { score: 50 } });
    const result = engine.evaluate(state);

    expect(result.outcomeId).toBe("beginner");
    expect(result.isDefault).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Navigation Engine Tests
// ---------------------------------------------------------------------------

describe("NavigationEngine", () => {
  it("finds next visible field", () => {
    const nav = new NavigationEngine({
      fieldRefs: ["a", "b", "c", "d"],
      groupRefs: [],
      groupFields: {},
      state: makeState(),
    });

    const result = nav.getNextField("a");
    expect(result.nextFieldRef).toBe("b");
  });

  it("skips hidden fields", () => {
    const nav = new NavigationEngine({
      fieldRefs: ["a", "b", "c", "d"],
      groupRefs: [],
      groupFields: {},
      state: makeState({ visibility: { b: false } }),
    });

    const result = nav.getNextField("a");
    expect(result.nextFieldRef).toBe("c");
  });

  it("skips explicitly skipped fields", () => {
    const nav = new NavigationEngine({
      fieldRefs: ["a", "b", "c", "d"],
      groupRefs: [],
      groupFields: {},
      state: makeState(),
    });

    const result = nav.getNextField("a", ["b"]);
    expect(result.nextFieldRef).toBe("c");
  });

  it("finds previous visible field", () => {
    const nav = new NavigationEngine({
      fieldRefs: ["a", "b", "c", "d"],
      groupRefs: [],
      groupFields: {},
      state: makeState(),
    });

    const result = nav.getPreviousField("c");
    expect(result.nextFieldRef).toBe("b");
  });

  it("returns end when at last field", () => {
    const nav = new NavigationEngine({
      fieldRefs: ["a", "b"],
      groupRefs: [],
      groupFields: {},
      state: makeState(),
    });

    const result = nav.getNextField("b");
    expect(result.isEnd).toBe(true);
    expect(result.showThankyou).toBe(true);
  });

  it("jumpTo returns correct field", () => {
    const nav = new NavigationEngine({
      fieldRefs: ["a", "b", "c", "d"],
      groupRefs: [],
      groupFields: {},
      state: makeState(),
    });

    const result = nav.jumpTo("c", "field");
    expect(result.nextFieldRef).toBe("c");
  });

  it("jumpTo thankyou returns end", () => {
    const nav = new NavigationEngine({
      fieldRefs: ["a", "b"],
      groupRefs: [],
      groupFields: {},
      state: makeState(),
    });

    const result = nav.jumpTo("thanks", "thankyou");
    expect(result.isEnd).toBe(true);
    expect(result.showThankyou).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validation Tests
// ---------------------------------------------------------------------------

describe("Validation", () => {
  it("validates invalid field references", () => {
    const config = makeConfig({
      logic: [
        {
          id: "rule_1",
          when: {
            type: "condition",
            source: { type: "field", ref: "nonexistent" },
            operator: "equals",
            value: { type: "constant", value: "test" },
          },
          then: [
            { type: "show_field", target: { type: "field", ref: "also_nonexistent" } },
          ],
        },
      ],
    });

    const result = validateLogic(config);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes("nonexistent"))).toBe(true);
  });

  it("validates invalid variable references", () => {
    const config = makeConfig({
      variables: {},
      logic: [
        {
          id: "rule_1",
          when: {
            type: "condition",
            source: { type: "variable", ref: "nonexistent_var" },
            operator: "equals",
            value: { type: "constant", value: 10 },
          },
          then: [
            { type: "set_variable", target: "also_nonexistent", value: { type: "constant", value: 1 } },
          ],
        },
      ],
    });

    const result = validateLogic(config);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("nonexistent_var"))).toBe(true);
  });

  it("validates invalid redirect URLs", () => {
    const config = makeConfig({
      logic: [
        {
          id: "rule_1",
          when: {
            type: "condition",
            source: { type: "constant", value: null },
            operator: "always",
          },
          then: [
            { type: "redirect", url: "not-a-valid-url" },
          ],
        },
      ],
    });

    const result = validateLogic(config);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Invalid redirect URL"))).toBe(true);
  });

  it("passes validation for valid config", () => {
    const config = makeConfig({
      variables: { score: 0 },
      logic: [
        {
          id: "rule_1",
          trigger: "field_changed",
          sourceRefs: ["age"],
          when: {
            type: "condition",
            source: { type: "field", ref: "age" },
            operator: "less_than",
            value: { type: "constant", value: 18 },
          },
          then: [
            { type: "show_field", target: { type: "field", ref: "parent_consent" } },
          ],
        },
      ],
    });

    const result = validateLogic(config);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Expression Evaluator Tests
// ---------------------------------------------------------------------------

describe("Expression Evaluator", () => {
  it("evaluates simple addition", () => {
    const state = makeState({ variables: { a: 10, b: 20 } });
    const result = evaluateExpression("a + b", state);
    expect(result).toBe(30);
  });

  it("evaluates multiplication", () => {
    const state = makeState({ variables: { price: 5, quantity: 3 } });
    const result = evaluateExpression("price * quantity", state);
    expect(result).toBe(15);
  });

  it("evaluates parentheses", () => {
    const state = makeState({ variables: { a: 2, b: 3, c: 4 } });
    const result = evaluateExpression("(a + b) * c", state);
    expect(result).toBe(20);
  });

  it("evaluates score reference", () => {
    const state = makeState({ score: 80 });
    const result = evaluateExpression("score / 100", state);
    expect(result).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// Logic Summary Tests
// ---------------------------------------------------------------------------

describe("Logic Summary", () => {
  it("generates summary for simple rule", () => {
    const rule: LogicRule = {
      id: "rule_1",
      when: {
        type: "condition",
        source: { type: "field", ref: "age" },
        operator: "less_than",
        value: { type: "constant", value: 18 },
      },
      then: [
        { type: "show_field", target: { type: "field", ref: "parent_consent" } },
      ],
    };

    const summary = generateRuleSummary(rule, { age: "Age", parent_consent: "Parent Consent" });

    expect(summary).toContain("Age");
    expect(summary).toContain("less than");
    expect(summary).toContain("18");
    expect(summary).toContain("Show");
    expect(summary).toContain("Parent Consent");
  });
});

// ---------------------------------------------------------------------------
// FormRuntime Tests
// ---------------------------------------------------------------------------

describe("FormRuntime", () => {
  it("creates runtime with initial state", () => {
    const config = makeConfig();
    const runtime = createFormRuntime(config);

    const state = runtime.getState();
    expect(state.answers).toEqual({});
    expect(state.variables).toEqual({});
    expect(state.score).toBe(0);
  });

  it("handles field change", () => {
    const config = makeConfig({
      logic: [
        {
          id: "rule_1",
          trigger: "field_changed",
          sourceRefs: ["age"],
          when: {
            type: "condition",
            source: { type: "field", ref: "age" },
            operator: "less_than",
            value: { type: "constant", value: 18 },
          },
          then: [
            { type: "show_field", target: { type: "field", ref: "parent_consent" } },
          ],
        },
      ],
    });

    const runtime = createFormRuntime(config);
    const result = runtime.onFieldChange("age", 17);

    expect(result.visibility["parent_consent"]).toBe(true);
  });

  it("navigates to next field", () => {
    const config = makeConfig();
    const runtime = createFormRuntime(config);

    // Start at first field
    const first = runtime.goNext();
    expect(first).toBe("age");

    // Answer and move to next
    runtime.onFieldChange("age", 25);
    const next = runtime.goNext();

    expect(next).toBe("name");
  });
});

// ---------------------------------------------------------------------------
// Realistic Flow Tests
// ---------------------------------------------------------------------------

describe("Realistic Flows", () => {
  describe("Employment branching", () => {
    it("routes to employment or education details", () => {
      const config = makeConfig({
        logic: [
          {
            id: "employment_branch",
            trigger: "field_changed",
            sourceRefs: ["employed"],
            when: {
              type: "condition",
              source: { type: "field", ref: "employed" },
              operator: "equals",
              value: { type: "constant", value: "yes" },
            },
            then: [
              { type: "jump", target: { type: "field", ref: "employment_details" } },
            ],
          },
          {
            id: "education_branch",
            trigger: "field_changed",
            sourceRefs: ["employed"],
            when: {
              type: "condition",
              source: { type: "field", ref: "employed" },
              operator: "equals",
              value: { type: "constant", value: "no" },
            },
            then: [
              { type: "jump", target: { type: "field", ref: "education_details" } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);

      // Yes → employment_details
      const yesResult = engine.onFieldChange("employed", "yes", makeState());
      expect(yesResult.navigation).toBe("employment_details");

      // No → education_details
      const noResult = engine.onFieldChange("employed", "no", makeState());
      expect(noResult.navigation).toBe("education_details");
    });
  });

  describe("Age-based parent consent", () => {
    it("shows and requires parent consent for minors", () => {
      const config = makeConfig({
        logic: [
          {
            id: "minor_consent",
            trigger: "field_changed",
            sourceRefs: ["age"],
            when: {
              type: "condition",
              source: { type: "field", ref: "age" },
              operator: "less_than",
              value: { type: "constant", value: 18 },
            },
            then: [
              { type: "show_field", target: { type: "field", ref: "parent_consent" } },
              { type: "make_required", target: { type: "field", ref: "parent_consent" } },
              { type: "set_variable", target: "minor", value: { type: "constant", value: true } },
            ],
          },
          {
            id: "adult_no_consent",
            trigger: "field_changed",
            sourceRefs: ["age"],
            when: {
              type: "condition",
              source: { type: "field", ref: "age" },
              operator: "greater_than_or_equal",
              value: { type: "constant", value: 18 },
            },
            then: [
              { type: "hide_field", target: { type: "field", ref: "parent_consent" } },
              { type: "make_optional", target: { type: "field", ref: "parent_consent" } },
            ],
          },
        ],
      });

      const engine = createLogicEngine(config);

      // Minor
      const minorResult = engine.onFieldChange("age", 17, makeState());
      expect(minorResult.visibility["parent_consent"]).toBe(true);
      expect(minorResult.required["parent_consent"]).toBe(true);
      expect(minorResult.variables["minor"]).toBe(true);

      // Adult
      const adultResult = engine.onFieldChange("age", 25, makeState());
      expect(adultResult.visibility["parent_consent"]).toBe(false);
    });
  });

  describe("Score-based outcomes", () => {
    it("determines outcome based on score", () => {
      const config = makeConfig({
        variables: { score: 0 },
        outcomes: [
          { id: "excellent", title: "Excellent", priority: 1, conditions: {
            type: "condition",
            source: { type: "variable", ref: "score" },
            operator: "greater_than_or_equal",
            value: { type: "constant", value: 80 },
          }},
          { id: "good", title: "Good", priority: 2, conditions: {
            type: "condition",
            source: { type: "variable", ref: "score" },
            operator: "greater_than_or_equal",
            value: { type: "constant", value: 60 },
          }},
          { id: "average", title: "Average", priority: 3, conditions: {
            type: "condition",
            source: { type: "variable", ref: "score" },
            operator: "greater_than_or_equal",
            value: { type: "constant", value: 40 },
          }},
          { id: "needs_improvement", title: "Needs Improvement", priority: 4, conditions: {
            type: "condition",
            source: { type: "constant", value: null },
            operator: "always",
          }},
        ],
      });

      const engine = createLogicEngine(config);

      // Score 85 → Excellent
      const result85 = engine.evaluate("form_submitted", makeState({ variables: { score: 85 } }));
      expect(result85.outcome).toBe("excellent");

      // Score 65 → Good
      const result65 = engine.evaluate("form_submitted", makeState({ variables: { score: 65 } }));
      expect(result65.outcome).toBe("good");

      // Score 45 → Average
      const result45 = engine.evaluate("form_submitted", makeState({ variables: { score: 45 } }));
      expect(result45.outcome).toBe("average");

      // Score 20 → Needs Improvement
      const result20 = engine.evaluate("form_submitted", makeState({ variables: { score: 20 } }));
      expect(result20.outcome).toBe("needs_improvement");
    });
  });
});
