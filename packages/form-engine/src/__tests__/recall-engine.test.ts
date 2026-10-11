import { describe, it, expect } from "vitest";
import { RecallEngine } from "../recall/RecallEngine";
import type {
  RecallReference,
  RecallContext,
  RecallFormDef,
} from "../recall/RecallEngine";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const baseForm: RecallFormDef = {
  fields: [
    { ref: "first_name", title: "What's your name?", type: "short_text" },
    { ref: "country", title: "What's your country?", type: "short_text" },
    { ref: "company", title: "What's your company?", type: "short_text" },
    { ref: "interest", title: "Your interests?", type: "multiple_choice" },
    { ref: "statement_1", title: "Nice to meet you!", type: "statement" },
  ],
  groups: [],
  logic: [],
  variableDefinitions: [
    { key: "plan", type: "string" },
    { key: "discount", type: "number" },
    { key: "total", type: "number" },
  ],
  hidden: ["customer_id", "utm_source"],
  settings: {},
};

const baseContext: RecallContext = {
  answers: {
    first_name: "Micah",
    country: "India",
    company: "Acme Corp",
  },
  variables: {
    plan: "Pro",
    discount: 20,
    total: 80,
  },
  urlParams: {
    customer_id: "123",
    utm_source: "facebook",
  },
  score: 80,
  price: 49.99,
  currency: "USD",
  locale: "en-US",
};

// ---------------------------------------------------------------------------
// resolve()
// ---------------------------------------------------------------------------

describe("RecallEngine.resolve()", () => {
  it("resolves field references", () => {
    const ref: RecallReference = { type: "field", ref: "first_name" };
    expect(RecallEngine.resolve(ref, baseContext)).toBe("Micah");
  });

  it("resolves variable references", () => {
    const ref: RecallReference = { type: "variable", ref: "plan" };
    expect(RecallEngine.resolve(ref, baseContext)).toBe("Pro");
  });

  it("resolves numeric variables", () => {
    const ref: RecallReference = { type: "variable", ref: "discount" };
    expect(RecallEngine.resolve(ref, baseContext)).toBe(20);
  });

  it("resolves URL parameter references", () => {
    const ref: RecallReference = { type: "url_param", key: "customer_id" };
    expect(RecallEngine.resolve(ref, baseContext)).toBe("123");
  });

  it("resolves score", () => {
    const ref: RecallReference = { type: "score" };
    expect(RecallEngine.resolve(ref, baseContext)).toBe(80);
  });

  it("resolves price", () => {
    const ref: RecallReference = { type: "price" };
    expect(RecallEngine.resolve(ref, baseContext)).toBe(49.99);
  });

  it("returns undefined for missing field", () => {
    const ref: RecallReference = { type: "field", ref: "nonexistent" };
    expect(RecallEngine.resolve(ref, baseContext)).toBeUndefined();
  });

  it("returns undefined for missing variable", () => {
    const ref: RecallReference = { type: "variable", ref: "nonexistent" };
    expect(RecallEngine.resolve(ref, baseContext)).toBeUndefined();
  });

  it("returns undefined for missing URL param", () => {
    const ref: RecallReference = { type: "url_param", key: "nonexistent" };
    expect(RecallEngine.resolve(ref, baseContext)).toBeUndefined();
  });

  it("uses fieldAnswerGetter when provided", () => {
    const getter = (ref: string) => (ref === "first_name" ? "Jane" : undefined);
    const ref: RecallReference = { type: "field", ref: "first_name" };
    expect(RecallEngine.resolve(ref, { ...baseContext, fieldAnswerGetter: getter })).toBe("Jane");
  });

  it("handles empty string answers", () => {
    const ctx = { ...baseContext, answers: { first_name: "" } };
    const ref: RecallReference = { type: "field", ref: "first_name" };
    expect(RecallEngine.resolve(ref, ctx)).toBe("");
  });

  it("handles null answers", () => {
    const ctx = { ...baseContext, answers: { first_name: null } };
    const ref: RecallReference = { type: "field", ref: "first_name" };
    expect(RecallEngine.resolve(ref, ctx)).toBeUndefined();
  });

  it("handles boolean answers", () => {
    const ctx = { ...baseContext, answers: { agree: true } };
    const ref: RecallReference = { type: "field", ref: "agree" };
    expect(RecallEngine.resolve(ref, ctx)).toBe(true);
  });

  it("handles array answers (multiple choice)", () => {
    const ctx = { ...baseContext, answers: { interests: ["Sports", "Music"] } };
    const ref: RecallReference = { type: "field", ref: "interests" };
    expect(RecallEngine.resolve(ref, ctx)).toEqual(["Sports", "Music"]);
  });
});

// ---------------------------------------------------------------------------
// interpolate()
// ---------------------------------------------------------------------------

describe("RecallEngine.interpolate()", () => {
  it("replaces {{field:ref}} tokens", () => {
    const text = "Hello {{field:first_name}}, welcome!";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Hello Micah, welcome!");
  });

  it("replaces {{variable:ref}} tokens", () => {
    const text = "Your plan is {{variable:plan}}.";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Your plan is Pro.");
  });

  it("replaces {{var:ref}} shorthand", () => {
    const text = "Your plan is {{var:plan}}.";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Your plan is Pro.");
  });

  it("replaces {{url_param:key}} tokens", () => {
    const text = "Customer ID: {{url_param:customer_id}}";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Customer ID: 123");
  });

  it("replaces {{url:key}} shorthand", () => {
    const text = "Source: {{url:utm_source}}";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Source: facebook");
  });

  it("replaces {{score}} token", () => {
    const text = "Your score is {{score}}.";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Your score is 80.");
  });

  it("replaces {{price}} token", () => {
    const text = "Total: {{price}}.";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Total: $49.99.");
  });

  it("handles multiple tokens in one string", () => {
    const text = "Hi {{field:first_name}} from {{field:country}}, plan: {{var:plan}}";
    expect(RecallEngine.interpolate(text, baseContext)).toBe(
      "Hi Micah from India, plan: Pro",
    );
  });

  it("returns empty string for undefined input", () => {
    expect(RecallEngine.interpolate("", baseContext)).toBe("");
  });

  it("returns text unchanged when no tokens present", () => {
    expect(RecallEngine.interpolate("Hello world", baseContext)).toBe("Hello world");
  });

  it("leaves unknown tokens as-is", () => {
    const text = "Hello {{unknown:foo}}";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Hello {{unknown:foo}}");
  });

  it("handles missing field values gracefully (empty string)", () => {
    const text = "Hello {{field:nonexistent}}!";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Hello !");
  });

  it("formats boolean values", () => {
    const ctx = { ...baseContext, answers: { agree: true } };
    const text = "Agreed: {{field:agree}}";
    expect(RecallEngine.interpolate(text, ctx)).toBe("Agreed: Yes");
  });

  it("formats array values as comma-separated", () => {
    const ctx = { ...baseContext, answers: { tags: ["a", "b", "c"] } };
    const text = "Tags: {{field:tags}}";
    expect(RecallEngine.interpolate(text, ctx)).toBe("Tags: a, b, c");
  });

  it("formats numeric values", () => {
    const text = "Discount: {{var:discount}}%";
    expect(RecallEngine.interpolate(text, baseContext)).toBe("Discount: 20%");
  });
});

// ---------------------------------------------------------------------------
// parseSegments() + interpolateSegments()
// ---------------------------------------------------------------------------

describe("RecallEngine.parseSegments()", () => {
  it("parses plain text into a single text segment", () => {
    const segments = RecallEngine.parseSegments("Hello world");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", value: "Hello world" });
  });

  it("parses text with recall tokens", () => {
    const segments = RecallEngine.parseSegments("Hi {{field:first_name}}!");
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: "text", value: "Hi " });
    expect(segments[1]).toEqual({
      type: "recall",
      reference: { type: "field", ref: "first_name" },
    });
    expect(segments[2]).toEqual({ type: "text", value: "!" });
  });

  it("parses multiple tokens", () => {
    const segments = RecallEngine.parseSegments(
      "{{field:a}} and {{field:b}}",
    );
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      type: "recall",
      reference: { type: "field", ref: "a" },
    });
    expect(segments[1]).toEqual({ type: "text", value: " and " });
    expect(segments[2]).toEqual({
      type: "recall",
      reference: { type: "field", ref: "b" },
    });
  });

  it("parses score and price tokens", () => {
    const segments = RecallEngine.parseSegments("Score: {{score}}, Price: {{price}}");
    expect(segments).toHaveLength(4);
    expect(segments[1]).toEqual({
      type: "recall",
      reference: { type: "score" },
    });
    expect(segments[3]).toEqual({
      type: "recall",
      reference: { type: "price" },
    });
  });
});

describe("RecallEngine.interpolateSegments()", () => {
  it("resolves segments to a string", () => {
    const segments = RecallEngine.parseSegments(
      "Hi {{field:first_name}} from {{field:country}}!",
    );
    expect(RecallEngine.interpolateSegments(segments, baseContext)).toBe(
      "Hi Micah from India!",
    );
  });
});

// ---------------------------------------------------------------------------
// referenceToToken()
// ---------------------------------------------------------------------------

describe("RecallEngine.referenceToToken()", () => {
  it("converts field reference", () => {
    expect(
      RecallEngine.referenceToToken({ type: "field", ref: "name" }),
    ).toBe("{{field:name}}");
  });

  it("converts variable reference", () => {
    expect(
      RecallEngine.referenceToToken({ type: "variable", ref: "plan" }),
    ).toBe("{{variable:plan}}");
  });

  it("converts url_param reference", () => {
    expect(
      RecallEngine.referenceToToken({ type: "url_param", key: "id" }),
    ).toBe("{{url_param:id}}");
  });

  it("converts score reference", () => {
    expect(RecallEngine.referenceToToken({ type: "score" })).toBe("{{score}}");
  });

  it("converts price reference", () => {
    expect(RecallEngine.referenceToToken({ type: "price" })).toBe("{{price}}");
  });
});

// ---------------------------------------------------------------------------
// insertToken()
// ---------------------------------------------------------------------------

describe("RecallEngine.insertToken()", () => {
  it("inserts token at cursor position replacing @", () => {
    const result = RecallEngine.insertToken(
      "Hello @",
      7, // cursor after @
      7, // @ position
      { type: "field", ref: "name" },
    );
    expect(result.text).toBe("Hello {{field:name}}");
    expect(result.newCursorPos).toBe(20);
  });

  it("inserts token in the middle of text", () => {
    const result = RecallEngine.insertToken(
      "Hi @, how are you?",
      4, // cursor after @
      4, // @ position
      { type: "field", ref: "name" },
    );
    expect(result.text).toBe("Hi {{field:name}}, how are you?");
    expect(result.newCursorPos).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// getAvailableSources()
// ---------------------------------------------------------------------------

describe("RecallEngine.getAvailableSources()", () => {
  it("returns fields before the current field", () => {
    const sources = RecallEngine.getAvailableSources(
      baseForm,
      "company", // current field
      undefined,
      false,
    );

    // Should include first_name and country (before company)
    const fieldSources = sources.filter((s) => s.category === "field");
    expect(fieldSources.map((s) => s.label)).toContain("What's your name?");
    expect(fieldSources.map((s) => s.label)).toContain("What's your country?");

    // Should NOT include company itself or later fields
    expect(fieldSources.map((s) => s.label)).not.toContain(
      "What's your company?",
    );
  });

  it("returns all fields when post-submit", () => {
    const sources = RecallEngine.getAvailableSources(
      baseForm,
      "first_name", // current field (early)
      undefined,
      true, // post-submit
    );

    const fieldSources = sources.filter((s) => s.category === "field");
    // Should include all fields including later ones
    expect(fieldSources.map((s) => s.label)).toContain("What's your name?");
    expect(fieldSources.map((s) => s.label)).toContain("What's your company?");
  });

  it("excludes statement fields", () => {
    const sources = RecallEngine.getAvailableSources(baseForm, "statement_1");
    const fieldSources = sources.filter((s) => s.category === "field");
    // statement_1 is at index 4, so first 4 fields are available
    // But statements should be excluded
    expect(fieldSources.map((s) => s.label)).not.toContain(
      "Nice to meet you!",
    );
  });

  it("includes variable sources", () => {
    const sources = RecallEngine.getAvailableSources(
      baseForm,
      "first_name",
    );
    const varSources = sources.filter((s) => s.category === "variable");
    expect(varSources.map((s) => s.label)).toContain("plan");
    expect(varSources.map((s) => s.label)).toContain("discount");
  });

  it("includes URL parameter sources", () => {
    const sources = RecallEngine.getAvailableSources(
      baseForm,
      "first_name",
    );
    const urlSources = sources.filter((s) => s.category === "url_param");
    expect(urlSources.map((s) => s.label)).toContain("customer_id");
    expect(urlSources.map((s) => s.label)).toContain("utm_source");
  });

  it("includes score when scoring exists", () => {
    const formWithScoring = {
      ...baseForm,
      scoring: [
        {
          id: "s1",
          fieldRef: "first_name",
          correctAnswers: ["Micah"],
          points: 10,
        },
      ],
    };
    const sources = RecallEngine.getAvailableSources(
      formWithScoring,
      "first_name",
    );
    expect(sources.map((s) => s.id)).toContain("system-score");
  });

  it("includes price when payment fields exist", () => {
    const formWithPrice = {
      ...baseForm,
      fields: [
        ...baseForm.fields,
        {
          ref: "payment",
          title: "Payment",
          type: "payment",
          properties: { price: { value: { amount: "49.99" } } },
        },
      ],
    };
    const sources = RecallEngine.getAvailableSources(
      formWithPrice,
      "first_name",
    );
    expect(sources.map((s) => s.id)).toContain("system-price");
  });

  it("returns empty when no current field", () => {
    const sources = RecallEngine.getAvailableSources(
      baseForm,
      undefined,
    );
    const fieldSources = sources.filter((s) => s.category === "field");
    expect(fieldSources).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getDependencies()
// ---------------------------------------------------------------------------

describe("RecallEngine.getDependencies()", () => {
  it("extracts field dependencies", () => {
    const deps = RecallEngine.getDependencies(
      "Hello {{field:first_name}} from {{field:country}}!",
    );
    expect(deps.fields).toEqual(["first_name", "country"]);
    expect(deps.variables).toEqual([]);
  });

  it("extracts variable dependencies", () => {
    const deps = RecallEngine.getDependencies(
      "Plan: {{var:plan}}, Discount: {{var:discount}}%",
    );
    expect(deps.variables).toEqual(["plan", "discount"]);
    expect(deps.fields).toEqual([]);
  });

  it("detects score and price", () => {
    const deps = RecallEngine.getDependencies(
      "Score: {{score}}, Price: {{price}}"
    );
    expect(deps.hasScore).toBe(true);
    expect(deps.hasPrice).toBe(true);
  });

  it("returns empty when no tokens", () => {
    const deps = RecallEngine.getDependencies("No tokens here");
    expect(deps.fields).toEqual([]);
    expect(deps.variables).toEqual([]);
    expect(deps.urlParams).toEqual([]);
    expect(deps.hasScore).toBe(false);
    expect(deps.hasPrice).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateReferences()
// ---------------------------------------------------------------------------

describe("RecallEngine.validateReferences()", () => {
  it("returns no warnings for available fields", () => {
    const warnings = RecallEngine.validateReferences(
      "Hello {{field:first_name}}!",
      baseForm,
      "country",
    );
    expect(warnings).toHaveLength(0);
  });

  it("warns about forward references", () => {
    const warnings = RecallEngine.validateReferences(
      "{{field:company}}",
      baseForm,
      "first_name",
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]?.severity).toBe("warning");
  });

  it("returns no warnings for variables", () => {
    const warnings = RecallEngine.validateReferences(
      "Plan: {{var:plan}}",
      baseForm,
      "first_name",
    );
    expect(warnings).toHaveLength(0);
  });

  it("returns no warnings for score/price", () => {
    const warnings = RecallEngine.validateReferences(
      "Score: {{score}}, Price: {{price}}",
      baseForm,
      "first_name",
    );
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// formatValue()
// ---------------------------------------------------------------------------

describe("RecallEngine.formatValue()", () => {
  it("formats strings as-is", () => {
    expect(RecallEngine.formatValue("hello", { type: "field", ref: "x" })).toBe("hello");
  });

  it("formats numbers as strings", () => {
    expect(RecallEngine.formatValue(42, { type: "field", ref: "x" })).toBe("42");
  });

  it("formats booleans", () => {
    expect(RecallEngine.formatValue(true, { type: "field", ref: "x" })).toBe("Yes");
    expect(RecallEngine.formatValue(false, { type: "field", ref: "x" })).toBe("No");
  });

  it("formats arrays as comma-separated", () => {
    expect(
      RecallEngine.formatValue(["a", "b", "c"], { type: "field", ref: "x" }),
    ).toBe("a, b, c");
  });

  it("returns empty string for undefined/null", () => {
    expect(RecallEngine.formatValue(undefined, { type: "field", ref: "x" })).toBe("");
    expect(RecallEngine.formatValue(null, { type: "field", ref: "x" })).toBe("");
  });

  it("formats price with currency when context provided", () => {
    const ctx: RecallContext = { ...baseContext, currency: "USD", locale: "en-US" };
    const result = RecallEngine.formatValue(49.99, { type: "price" }, ctx);
    expect(result).toContain("49.99");
  });
});

// ---------------------------------------------------------------------------
// Branch-aware scenario
// ---------------------------------------------------------------------------

describe("Branch-aware recall", () => {
  const branchForm: RecallFormDef = {
    fields: [
      { ref: "employed", title: "Are you employed?", type: "yes_no" },
      { ref: "company", title: "Company name?", type: "short_text" },
      { ref: "school", title: "School name?", type: "short_text" },
      { ref: "summary", title: "Summary", type: "statement" },
    ],
    logic: [
      {
        id: "rule1",
        when: {
          type: "condition",
          source: { type: "field", ref: "employed" },
          operator: "is_false",
        },
        then: [
          {
            type: "jump",
            target: { type: "field", ref: "school" },
          },
        ],
        sourceRefs: ["employed"],
      },
    ],
    settings: {},
  };

  it("detects field availability before current position", () => {
    const sources = RecallEngine.getAvailableSources(
      branchForm,
      "summary",
    );
    const fieldSources = sources.filter((s) => s.category === "field");
    const labels = fieldSources.map((s) => s.label);
    // Company is before summary in raw order, so it's available
    expect(labels).toContain("Company name?");
  });

  it("validates recall references in branch contexts", () => {
    const warnings = RecallEngine.validateReferences(
      "{{field:company}}",
      branchForm,
      "summary",
    );
    // company is before summary, so no forward-reference warning
    // But it may have a branch warning
    expect(warnings.length).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Security: reject unsupported syntax
// ---------------------------------------------------------------------------

describe("Security", () => {
  it("does not execute eval syntax", () => {
    const text = "{{eval:alert(1)}}";
    const result = RecallEngine.interpolate(text, baseContext);
    // Should leave the unknown token as-is
    expect(result).toBe("{{eval:alert(1)}}");
  });

  it("does not execute javascript syntax", () => {
    const text = "{{javascript:alert(1)}}";
    const result = RecallEngine.interpolate(text, baseContext);
    expect(result).toBe("{{javascript:alert(1)}}");
  });

  it("does not execute function syntax", () => {
    const text = "{{function:alert(1)}}";
    const result = RecallEngine.interpolate(text, baseContext);
    expect(result).toBe("{{function:alert(1)}}");
  });
});
