import { describe, expect, it } from "vitest";
import { createDefaultFormSchema, normalizeFormSchemaSafe } from "@repo/shared";
import type { FormSchema } from "@repo/shared";
import {
	clearAIBuilderFormContext,
	readAIBuilderFormContext,
	writeAIBuilderFormContext,
} from "./form-context";

const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
	localStorage: {
		getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
		setItem: (key: string, value: string) => void store.set(key, value),
		removeItem: (key: string) => void store.delete(key),
	},
};

function buildGeneratedSchema(): FormSchema {
	const base = createDefaultFormSchema({ title: "AI generated form" });
	return {
		...base,
		fields: [
			{ ref: "is_business", type: "yes_no", title: "Are you a business?" },
			{
				ref: "company_size",
				type: "dropdown",
				title: "Company size",
				properties: { choices: [{ ref: "small", label: "Small" }] },
			},
		],
		groups: [{ id: "step-1", title: "Step 1", fieldIds: ["is_business", "company_size"] }],
		logic: [
			{
				id: "rule_show_company_size",
				trigger: "field_changed",
				sourceRefs: ["is_business"],
				priority: 0,
				when: {
					type: "condition",
					source: { type: "field", ref: "is_business" },
					operator: "is_true",
				},
				then: [{ type: "show_field", target: { type: "field", ref: "company_size" } }],
			},
		],
		scoring: [{ id: "s1", fieldRef: "is_business", correctAnswers: ["Yes"], points: 1 }],
		outcomes: [{ id: "o1", title: "Qualified" }],
		variableDefinitions: [{ key: "score_total", type: "number" }],
		welcome_screens: [{ ref: "welcome", title: "Welcome" }],
		thankyou_screens: [{ ref: "end", title: "Thanks", type: "thankyou_screen" }],
	} as FormSchema;
}

describe("AI builder form handoff", () => {
	it("round-trips the form id and full schema, then clears once consumed", () => {
		const schema = buildGeneratedSchema();
		writeAIBuilderFormContext({ formId: "form-123", schema });

		const restored = readAIBuilderFormContext();
		expect(restored?.formId).toBe("form-123");
		expect(restored?.schema.title).toBe("AI generated form");
		// The complete schema travels, not just title/fields.
		expect(restored?.schema.logic).toHaveLength(1);

		clearAIBuilderFormContext();
		expect(readAIBuilderFormContext()).toBeNull();
	});

	it("represents a brand-new (unsaved) form as formId null", () => {
		writeAIBuilderFormContext({
			formId: null,
			schema: createDefaultFormSchema({ title: "New" }),
		});
		expect(readAIBuilderFormContext()?.formId).toBeNull();
		clearAIBuilderFormContext();
	});
});

describe("importing a generated form", () => {
	it("normalizes without dropping logic, scoring, outcomes, screens or groups", () => {
		const imported = normalizeFormSchemaSafe(buildGeneratedSchema());

		expect(imported).not.toBeNull();
		expect(imported!.logic).toHaveLength(1);
		expect(imported!.scoring).toHaveLength(1);
		expect(imported!.outcomes).toHaveLength(1);
		expect(imported!.variableDefinitions).toHaveLength(1);
		expect(imported!.welcome_screens).toHaveLength(1);
		expect(imported!.thankyou_screens).toHaveLength(1);
		expect(imported!.groups).toHaveLength(1);
		expect(imported!.fields).toHaveLength(2);
		expect(imported!.theme).toBeTruthy();
	});

	it("rejects the legacy fields+settings-only projection instead of emptying the form", () => {
		const generated = buildGeneratedSchema();
		// The previous import path rebuilt the schema from fields + settings only,
		// dropping the required top-level `title` — so normalization always failed
		// and the builder fell back to an empty form.
		const oldProjection = {
			fields: generated.fields,
			settings: generated.settings,
		};

		expect(normalizeFormSchemaSafe(oldProjection)).toBeNull();
	});
});
