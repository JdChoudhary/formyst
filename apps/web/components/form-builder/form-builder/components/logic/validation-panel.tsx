"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FormSchema,
  Condition,
  LogicAction,
  LogicRule,
} from "@repo/shared";
import { buildFieldLabels } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LintIssue {
  severity: "error" | "warning";
  /** Rule ID or outcome ID this applies to */
  ruleId?: string;
  /** Path within the rule, e.g. "condition", "action[0]" */
  path?: string;
  message: string;
}

interface ValidationPanelProps {
  schema: FormSchema;
  /** Optional: rules of thumb to exclude from the issue list */
  visibleOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Component — renders a summary bar + issue list
// ---------------------------------------------------------------------------

export function ValidationPanel({ schema, visibleOnly }: ValidationPanelProps) {
  const issues = useMemo(() => runLintPass(schema), [schema]);

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <div className="flex flex-col gap-2">
      {/* Status bar */}
      <div className="flex items-center gap-2">
        {issues.length === 0 ? (
          <>
            <CheckCircle className="size-4 text-green-600" />
            <span className="font-medium text-foreground text-sm">
              No issues found
            </span>
          </>
        ) : (
          <>
            {errors.length > 0 && (
              <Badge variant="destructive">
                {errors.length} error{errors.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="secondary">
                {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Issue list */}
      {issues.length > 0 && (
        <div className="flex flex-col gap-1">
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border p-2 ${
                issue.severity === "error"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-yellow-300/50 bg-yellow-50/50 dark:border-yellow-700/30 dark:bg-yellow-950/20"
              }`}
            >
              {issue.severity === "error" ? (
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-yellow-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-xs">{issue.message}</p>
                {issue.ruleId && (
                  <p className="mt-0.5 text-muted-foreground text-[10px]">
                    {issue.path
                      ? `${issue.ruleId} → ${issue.path}`
                      : issue.ruleId}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lint pass — catches things Zod can't
// ---------------------------------------------------------------------------

function runLintPass(schema: FormSchema): LintIssue[] {
  const issues: LintIssue[] = [];
  const fieldLabels = buildFieldLabels(schema.fields ?? []);
  const fieldRefs = new Set(
    (schema.fields ?? []).map((f) => f.ref).filter((r): r is string => Boolean(r)),
  );
  const fieldTypes: Record<string, string> = {};
  for (const f of schema.fields ?? []) {
    if (f.ref) fieldTypes[f.ref] = f.type;
  }
  const variableKeys = new Set(
    (schema.variableDefinitions ?? []).map((v) => v.key),
  );
  const groupRefs = new Set(
    (schema.groups ?? []).map((g) => g.ref ?? g.id).filter((r): r is string => Boolean(r)),
  );
  const thankyouRefs = new Set(
    (schema.thankyou_screens ?? []).map((s) => s.ref).filter((r): r is string => Boolean(r)),
  );
  const outcomeIds = new Set(
    (schema.outcomes ?? []).map((o) => o.id).filter((r): r is string => Boolean(r)),
  );

  // Build field index map for jump-before-trigger check
  const fieldOrder: string[] = (schema.fields ?? [])
    .map((f) => f.ref)
    .filter(Boolean) as string[];

  const rules = schema.logic ?? [];

  for (const rule of rules) {
    // --- Validate condition tree ---
    lintCondition(rule.when, rule.id, "condition", issues, {
      fieldRefs,
      fieldTypes,
      variableKeys,
    });

    // --- Validate actions ---
    rule.then.forEach((action, i) => {
      lintAction(action, rule.id, `action[${i}]`, issues, {
        fieldRefs,
        variableKeys,
        groupRefs,
        thankyouRefs,
        outcomeIds,
        fieldOrder,
      });
    });
  }

  // --- Validate scoring rules ---
  for (const score of schema.scoring ?? []) {
    if (score.fieldRef && !fieldRefs.has(score.fieldRef)) {
      issues.push({
        severity: "error",
        ruleId: score.id,
        path: "scoring",
        message: `Scoring rule references field "${score.fieldRef}" which does not exist`,
      });
    }
  }

  // --- Validate outcomes ---
  for (const outcome of schema.outcomes ?? []) {
    if (outcome.conditions) {
      lintCondition(outcome.conditions, outcome.id, "outcome.condition", issues, {
        fieldRefs,
        fieldTypes,
        variableKeys,
      });
    }
    if (outcome.thankyouRef && !thankyouRefs.has(outcome.thankyouRef)) {
      issues.push({
        severity: "error",
        ruleId: outcome.id,
        path: "outcome",
        message: `Outcome references thank-you screen "${outcome.thankyouRef}" which does not exist`,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Condition lint helper
// ---------------------------------------------------------------------------

function lintCondition(
  condition: Condition,
  ruleId: string,
  pathPrefix: string,
  issues: LintIssue[],
  ctx: {
    fieldRefs: Set<string>;
    fieldTypes: Record<string, string>;
    variableKeys: Set<string>;
  },
): void {
  switch (condition.type) {
    case "condition":
      // Check source ref
      if (condition.source.type === "field" && condition.source.ref) {
        if (!ctx.fieldRefs.has(condition.source.ref)) {
          issues.push({
            severity: "error",
            ruleId,
            path: `${pathPrefix}.source`,
            message: `References field "${condition.source.ref}" which does not exist`,
          });
        }
      }
      if (condition.source.type === "variable" && condition.source.ref) {
        if (!ctx.variableKeys.has(condition.source.ref)) {
          issues.push({
            severity: "warning",
            ruleId,
            path: `${pathPrefix}.source`,
            message: `References variable "${condition.source.ref}" which is not defined`,
          });
        }
      }
      // Check value ref
      if (condition.value) {
        if (condition.value.type === "field" && condition.value.ref) {
          if (!ctx.fieldRefs.has(condition.value.ref)) {
            issues.push({
              severity: "error",
              ruleId,
              path: `${pathPrefix}.value`,
              message: `References field "${condition.value.ref}" which does not exist`,
            });
          }
        }
        if (condition.value.type === "variable" && condition.value.ref) {
          if (!ctx.variableKeys.has(condition.value.ref)) {
            issues.push({
              severity: "warning",
              ruleId,
              path: `${pathPrefix}.value`,
              message: `References variable "${condition.value.ref}" which is not defined`,
            });
          }
        }
      }
      break;

    case "group":
      if (condition.conditions.length === 0) {
        issues.push({
          severity: "warning",
          ruleId,
          path: pathPrefix,
          message: "Empty condition group",
        });
      }
      condition.conditions.forEach((sub: Condition, i: number) => {
        lintCondition(sub, ruleId, `${pathPrefix}[${i}]`, issues, ctx);
      });
      break;

    case "not":
      lintCondition(condition.condition, ruleId, `NOT(${pathPrefix})`, issues, ctx);
      break;
  }
}

// ---------------------------------------------------------------------------
// Action lint helper
// ---------------------------------------------------------------------------

function lintAction(
  action: LogicAction,
  ruleId: string,
  path: string,
  issues: LintIssue[],
  ctx: {
    fieldRefs: Set<string>;
    variableKeys: Set<string>;
    groupRefs: Set<string>;
    thankyouRefs: Set<string>;
    outcomeIds: Set<string>;
    fieldOrder: string[];
  },
): void {
  switch (action.type) {
    case "jump":
      // Check target exists
      if (action.target.type === "field" && !ctx.fieldRefs.has(action.target.ref)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `Jump target field "${action.target.ref}" does not exist`,
        });
      }
      if (action.target.type === "group" && !ctx.groupRefs.has(action.target.ref)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `Jump target group "${action.target.ref}" does not exist`,
        });
      }
      if (action.target.type === "thankyou" && !ctx.thankyouRefs.has(action.target.ref)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `Jump target thank-you screen "${action.target.ref}" does not exist`,
        });
      }
      if (action.target.type === "outcome" && !ctx.outcomeIds.has(action.target.ref)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `Jump target outcome "${action.target.ref}" does not exist`,
        });
      }
      // Forward-jump check: don't send respondents to an unvisited question
      if (action.target.type === "field") {
        const rule = (ctx as any)._currentRule as LogicRule | undefined;
        // Simple heuristic: check if target appears before the first source ref in field order
        const firstSourceRef = rule?.sourceRefs?.[0];
        if (firstSourceRef) {
          const sourceIdx = ctx.fieldOrder.indexOf(firstSourceRef);
          const targetIdx = ctx.fieldOrder.indexOf(action.target.ref);
          if (sourceIdx >= 0 && targetIdx >= 0 && targetIdx < sourceIdx) {
            issues.push({
              severity: "warning",
              ruleId,
              path,
              message: `Jump to "${action.target.ref}" may go to a question the respondent hasn't reached yet`,
            });
          }
        }
      }
      break;

    case "skip_field":
    case "show_field":
    case "hide_field":
    case "make_required":
    case "make_optional":
    case "enable_field":
    case "disable_field":
      if (!ctx.fieldRefs.has(action.target.ref)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `References field "${action.target.ref}" which does not exist`,
        });
      }
      break;

    case "skip_group":
    case "show_group":
    case "hide_group":
      if (!ctx.groupRefs.has(action.target.ref)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `References group "${action.target.ref}" which does not exist`,
        });
      }
      break;

    case "set_variable":
    case "add_variable":
    case "subtract_variable":
    case "multiply_variable":
    case "divide_variable":
    case "increment_variable":
    case "decrement_variable":
      if (!ctx.variableKeys.has(action.target)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `References variable "${action.target}" which is not defined`,
        });
      }
      break;

    case "end_form":
      if (action.target && !ctx.thankyouRefs.has(action.target.ref)) {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `End form references thank-you screen "${action.target.ref}" which does not exist`,
        });
      }
      break;

    case "redirect":
      try {
        new URL(action.url);
      } catch {
        issues.push({
          severity: "error",
          ruleId,
          path,
          message: `Invalid redirect URL: "${action.url}"`,
        });
      }
      break;

    // set_value / clear_value / copy_value target validation
    case "set_value":
    case "clear_value":
    case "copy_value":
      if ("target" in action && typeof action.target === "object") {
        const t = action.target as { type: string; ref: string };
        if (t.type === "field" && !ctx.fieldRefs.has(t.ref)) {
          issues.push({
            severity: "error",
            ruleId,
            path,
            message: `References field "${t.ref}" which does not exist`,
          });
        }
      }
      break;
  }
}
