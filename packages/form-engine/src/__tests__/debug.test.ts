import { describe, it, expect } from "vitest";
import { createLogicEngine } from "../index";
import type { FormRuntimeState, LogicEngineConfig } from "../types";

function makeState(overrides: Partial<FormRuntimeState> = {}): FormRuntimeState {
  return { answers: {}, variables: {}, visibility: {}, enabled: {}, required: {}, visitedFields: [], completedFields: [], score: 0, progress: 0, skipRefs: [], ...overrides };
}

describe("Debug", () => {
  it("variable cascade", () => {
    const config: LogicEngineConfig = {
      form: {
        fields: [{ ref: "age", title: "Age", type: "number" }],
        logic: [{
          id: "rule_calc",
          trigger: "form_started",
          priority: 0,
          when: { type: "condition", source: { type: "constant", value: null }, operator: "always" },
          then: [
            { type: "set_variable", target: "total", value: { type: "constant", value: 100 } },
            { type: "add_variable", target: "total", value: { type: "constant", value: 50 } },
          ],
        }],
      },
    };
    const engine = createLogicEngine(config);
    const state = makeState({ variables: { total: 0 } });
    const result = engine.evaluate("form_started", state);
    console.log("RESULT:", JSON.stringify(result.variables));
    expect(result.variables["total"]).toBe(150);
  });
});
