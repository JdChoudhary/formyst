"use client";

import { GitBranch, Plus, Trash2 } from "lucide-react";
import { createId } from "@repo/shared";
import type { FormField, FormSchema, LogicRule } from "@repo/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

/* ---------------------------------------------------------------------------
 * Plain-language step routing
 *
 * A respondent-facing, non-technical way to express the only navigation rule
 * most forms need: "if <answer> then go to <step>". Each row is stored as a
 * normal logic rule (`when` condition + `jump` action to a group), so it stays
 * compatible with the advanced rule editor and the logic engine.
 * ------------------------------------------------------------------------- */

const OPERATORS = [
	{ value: "equals", label: "is" },
	{ value: "not_equals", label: "is not" },
	{ value: "contains", label: "contains" },
	{ value: "is_not_empty", label: "is answered" },
	{ value: "is_empty", label: "is not answered" },
] as const;

const NEEDS_VALUE = new Set(["equals", "not_equals", "contains"]);

interface StepRoutingBuilderProps {
	schema: FormSchema;
	onSchemaUpdate: (updates: Partial<FormSchema>) => void;
}

/** Is this a routing rule this simple editor understands? */
function isRoutingRule(rule: LogicRule): boolean {
	return (
		rule.when?.type === "condition" &&
		(rule.when as { source?: { type?: string } }).source?.type === "field" &&
		Array.isArray(rule.then) &&
		rule.then.some((action) => action.type === "jump" && action.target.type === "group")
	);
}

export function StepRoutingBuilder({ schema, onSchemaUpdate }: StepRoutingBuilderProps) {
	const fields = (schema.fields ?? []).filter(
		(field) => field.ref && field.type !== "statement" && field.type !== "group",
	);
	const groups = schema.groups ?? [];
	const allRules = schema.logic ?? [];
	const routingRules = allRules.filter(isRoutingRule);

	const writeRoutingRules = (nextRoutingRules: LogicRule[]) => {
		// Keep any rules this editor doesn't own (advanced/visibility rules).
		const preserved = allRules.filter((rule) => !isRoutingRule(rule));
		onSchemaUpdate({ logic: [...preserved, ...nextRoutingRules] });
	};

	const addRule = () => {
		if (groups.length < 2 || fields.length === 0) return;
		const rule: LogicRule = {
			id: createId("rule"),
			trigger: "field_changed",
			when: {
				type: "condition",
				source: { type: "field", ref: fields[0]?.ref ?? "" },
				operator: "equals",
				value: { type: "constant", value: "" },
			},
			then: [{ type: "jump", target: { type: "group", ref: groups[1]?.id ?? "" } }],
		};
		writeRoutingRules([...routingRules, rule]);
	};

	const updateRule = (id: string, patch: Partial<LogicRule>) => {
		writeRoutingRules(
			routingRules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
		);
	};

	const removeRule = (id: string) => {
		writeRoutingRules(routingRules.filter((rule) => rule.id !== id));
	};

	const getCondition = (rule: LogicRule) => rule.when as {
		source: { ref: string };
		operator: string;
		value?: { value?: unknown };
	};

	const getTargetRef = (rule: LogicRule): string => {
		const action = rule.then.find(
			(a) => a.type === "jump" && a.target.type === "group",
		) as { target: { ref: string } } | undefined;
		return action?.target.ref ?? "";
	};  const setSourceField = (rule: LogicRule, ref: string) => {
    updateRule(rule.id, {
      when: {
        ...rule.when,
        source: { type: "field", ref },
        // Reset the value — the old answer belonged to another question.
        value: { type: "constant", value: "" },
      } as LogicRule["when"],
    });
  };

	const setOperator = (rule: LogicRule, operator: string) => {
		updateRule(rule.id, {
			when: {
				...rule.when,
				operator,
				...(NEEDS_VALUE.has(operator)
					? { value: { type: "constant", value: getCondition(rule).value?.value ?? "" } }
					: { value: undefined }),
			} as LogicRule["when"],
		});
	};

	const setValue = (rule: LogicRule, value: string) => {
		updateRule(rule.id, {
			when: { ...rule.when, value: { type: "constant", value } } as LogicRule["when"],
		});
	};

	const setTargetStep = (rule: LogicRule, ref: string) => {
		updateRule(rule.id, {
			then: [{ type: "jump", target: { type: "group", ref } }],
		});
	};

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="flex flex-col gap-1">
				<h3 className="flex items-center gap-2 font-semibold text-base">
					<GitBranch className="size-4" />
					Step routing
				</h3>
				<p className="text-muted-foreground text-sm">
					Decide which step someone sees next. For example: <em>if “Do you own a car?” is
					“Yes”, go to “Car details”.</em> Everyone else continues to the next step in
					order.
				</p>
			</div>

			{groups.length < 2 || fields.length === 0 ? (
				<Card className="border-dashed p-6 shadow-none">
					<CardContent className="flex flex-col items-center gap-2 p-0 text-center">
						<p className="font-medium text-sm">Add a second step and a question first</p>
						<p className="text-muted-foreground text-sm">
							Step routing needs at least two steps and one question to branch on.
						</p>
					</CardContent>
				</Card>
			) : (
				<>
					{routingRules.length === 0 ? (
						<Card className="border-dashed p-6 shadow-none">
							<CardContent className="flex flex-col items-center gap-3 p-0 text-center">
								<p className="font-medium text-sm">No routing rules yet</p>
								<p className="text-muted-foreground text-sm">
									Without rules, respondents always move through the steps in order.
								</p>
							</CardContent>
						</Card>
					) : (
						<div className="flex flex-col gap-2">
							{routingRules.map((rule) => {
								const condition = getCondition(rule);
								const sourceField = fields.find((f) => f.ref === condition.source?.ref);
								const choices = (sourceField?.properties?.choices ?? []).map(
									(choice) => choice.label,
								);
								const needsValue = NEEDS_VALUE.has(condition.operator);

								return (
									<Card className="p-3 shadow-none" key={rule.id}>
										<CardContent className="flex flex-wrap items-center gap-2 p-0 text-sm">
											<span className="text-muted-foreground">If</span>

											<Select
												onValueChange={(value) => setSourceField(rule, value)}
												value={condition.source?.ref ?? ""}
											>
												<SelectTrigger
													aria-label="Question"
													className="h-8 min-w-[10rem] flex-1"
												>
													<SelectValue placeholder="Choose a question" />
												</SelectTrigger>
												<SelectContent>
													{fields.map((field: FormField) => (
														<SelectItem key={field.ref} value={field.ref ?? ""}>
															{field.title || field.ref}
														</SelectItem>
													))}
												</SelectContent>
											</Select>

											<Select
												onValueChange={(value) => setOperator(rule, value)}
												value={condition.operator ?? "equals"}
											>
												<SelectTrigger aria-label="Condition" className="h-8 w-[9rem]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{OPERATORS.map((operator) => (
														<SelectItem key={operator.value} value={operator.value}>
															{operator.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>

											{needsValue &&
												(choices.length > 0 ? (
													<Select
														onValueChange={(value) => setValue(rule, value)}
														value={String(condition.value?.value ?? "")}
													>
														<SelectTrigger aria-label="Answer" className="h-8 w-[10rem]">
															<SelectValue placeholder="Choose an answer" />
														</SelectTrigger>
														<SelectContent>
															{choices.map((choice) => (
																<SelectItem key={choice} value={choice}>
																	{choice}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<Input
														aria-label="Answer"
														className="h-8 w-[10rem]"
														onChange={(e) => setValue(rule, e.target.value)}
														placeholder="Type an answer"
														value={String(condition.value?.value ?? "")}
													/>
												))}

											<span className="text-muted-foreground">go to</span>

											<Select
												onValueChange={(value) => setTargetStep(rule, value)}
												value={getTargetRef(rule)}
											>
												<SelectTrigger aria-label="Step" className="h-8 min-w-[9rem] flex-1">
													<SelectValue placeholder="Choose a step" />
												</SelectTrigger>
												<SelectContent>
													{groups.map((group, index) => (
														<SelectItem key={group.id} value={group.id}>
															{index + 1}. {group.title || `Step ${index + 1}`}
														</SelectItem>
													))}
												</SelectContent>
											</Select>

											<Button
												aria-label="Remove rule"
												className="text-muted-foreground hover:text-destructive"
												onClick={() => removeRule(rule.id)}
												size="icon-sm"
												variant="ghost"
											>
												<Trash2 className="size-3.5" />
											</Button>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}

					<Button className="w-fit gap-1.5" onClick={addRule} size="sm" variant="outline">
						<Plus className="size-3.5" />
						Add routing rule
					</Button>
				</>
			)}
		</div>
	);
}
