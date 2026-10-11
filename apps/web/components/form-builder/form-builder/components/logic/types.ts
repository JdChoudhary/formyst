import type {
  FormSchema,
  FormField,
  Condition,
  LogicAction,
  LogicRule,
  ScoringRule,
  Outcome,
  VariableDefinition,
  ValueReference,
} from "@repo/shared";

export type {
  FormSchema,
  FormField,
  Condition,
  LogicAction,
  LogicRule,
  ScoringRule,
  Outcome,
  VariableDefinition,
  ValueReference,
};

/** Shared context passed to all logic builder child components. */
export interface LogicBuilderContext {
  schema: FormSchema;
  fields: FormField[];
  fieldLabels: Record<string, string>;
  onSchemaUpdate: (updates: Partial<FormSchema>) => void;
}

/** A validation issue surfaced next to the offending rule/action. */
export interface LintIssue {
  severity: "error" | "warning";
  /** Path like "rule.rule-123.condition" or "rule.rule-123.action[0]" */
  path: string;
  message: string;
}

/** Shape for the "sample answers" used in the variable preview. */
export type SampleAnswers = Record<string, unknown>;
