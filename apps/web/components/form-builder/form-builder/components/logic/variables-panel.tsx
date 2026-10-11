"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Info, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { VariableDefinition, LogicRule, FormField } from "@repo/shared";
import { generateId, buildFieldLabels } from "./utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariablesPanelProps {
  variables: VariableDefinition[];
  logicRules: LogicRule[];
  fields: FormField[];
  onUpdate: (variables: VariableDefinition[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariablesPanel({
  variables,
  logicRules,
  fields,
  onUpdate,
}: VariablesPanelProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [sampleAnswers, setSampleAnswers] = useState<Record<string, string>>({});

  const fieldLabels = useMemo(() => buildFieldLabels(fields), [fields]);

  const addVariable = () => {
    const newVar: VariableDefinition = {
      key: `var_${Date.now()}`,
      type: "number",
      defaultValue: 0,
    };
    onUpdate([...variables, newVar]);
  };

  const updateVariable = (
    key: string,
    updates: Partial<VariableDefinition>,
  ) => {
    onUpdate(
      variables.map((v) => (v.key === key ? { ...v, ...updates } : v)),
    );
  };

  const deleteVariable = (key: string) => {
    onUpdate(variables.filter((v) => v.key !== key));
  };

  // Simulate variable values by walking through rules with sample answers
  const previewValues = useMemo(() => {
    if (!previewMode) return {};

    const vars: Record<string, unknown> = {};
    // Initialize from defaults
    for (const v of variables) {
      vars[v.key] = v.defaultValue ?? (v.type === "number" ? 0 : v.type === "boolean" ? false : "");
    }

    // Walk through rules in priority order
    const sortedRules = [...logicRules].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );

    for (const rule of sortedRules) {
      // Simple evaluation: check if the condition source field matches sample
      const cond = rule.when;
      if (cond.type === "condition" && cond.source.type === "field") {
        const answer = sampleAnswers[cond.source.ref];
        if (answer === undefined) continue;

        let matches = false;
        switch (cond.operator) {
          case "equals":
            matches = answer === String(cond.value?.type === "constant" ? cond.value.value : "");
            break;
          case "not_equals":
            matches = answer !== String(cond.value?.type === "constant" ? cond.value.value : "");
            break;
          case "is_empty":
            matches = !answer || answer === "";
            break;
          case "is_not_empty":
            matches = !!answer && answer !== "";
            break;
          default:
            matches = true; // Simplified: assume true for complex operators
        }

        if (matches) {
          // Apply variable actions
          for (const action of rule.then) {
            if (
              "target" in action &&
              typeof (action as any).target === "string" &&
              "value" in action
            ) {
              const targetKey = (action as any).target as string;
              const valRef = (action as any).value;
              if (!vars.hasOwnProperty(targetKey)) continue;

              let val = 0;
              if (valRef?.type === "constant") val = Number(valRef.value) || 0;
              else if (valRef?.type === "score") val = 0;

              switch (action.type) {
                case "set_variable":
                  vars[targetKey] = val;
                  break;
                case "add_variable":
                  vars[targetKey] = (Number(vars[targetKey]) || 0) + val;
                  break;
                case "subtract_variable":
                  vars[targetKey] = (Number(vars[targetKey]) || 0) - val;
                  break;
                case "multiply_variable":
                  vars[targetKey] = (Number(vars[targetKey]) || 0) * val;
                  break;
                case "divide_variable":
                  vars[targetKey] =
                    val !== 0 ? (Number(vars[targetKey]) || 0) / val : 0;
                  break;
              }
            }
          }
        }
      }
    }

    return vars;
  }, [previewMode, sampleAnswers, variables, logicRules]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <div>
          <h3 className="font-medium text-foreground text-sm">Variables</h3>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Define variables for scoring, pricing, or conditional logic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={previewMode ? "default" : "outline"}
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Play className="mr-1 size-3" />
            {previewMode ? "Previewing" : "Preview"}
          </Button>
          <Button size="sm" variant="outline" onClick={addVariable}>
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {/* Preview panel */}
        {previewMode && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              <span className="font-medium text-primary text-xs">
                Variable Preview
              </span>
            </div>
            <p className="mb-2 text-muted-foreground text-[11px]">
              Enter sample field answers to see how variables are computed. Only
              "equals" conditions are simulated.
            </p>
            <div className="mb-3 flex flex-col gap-2">
              {fields
                .filter((f) => f.type !== "statement" && f.ref)
                .slice(0, 10)
                .map((f) => (
                  <div key={f.ref} className="flex items-center gap-2">
                    <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
                      {f.title || f.ref}
                    </span>
                    <Input
                      className="h-7 flex-1 text-xs"
                      placeholder="sample answer"
                      value={sampleAnswers[f.ref ?? ""] ?? ""}
                      onChange={(e) =>
                        setSampleAnswers((prev) => ({
                          ...prev,
                          [f.ref ?? ""]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
            </div>

            {/* Computed values */}
            <div className="flex flex-col gap-1">
              {variables.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center justify-between rounded bg-background px-2 py-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {v.key}
                  </span>
                  <Badge className="font-mono text-[10px]" variant="secondary">
                    {String(previewValues[v.key] ?? v.defaultValue ?? "—")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Variable list */}
        {variables.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-3 text-muted-foreground text-sm">
              No variables defined yet.
            </p>
            <Button size="sm" variant="outline" onClick={addVariable}>
              <Plus className="mr-1 size-3.5" />
              Add Variable
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {variables.map((v) => (
              <div
                key={v.key}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-3"
              >
                {/* Key */}
                <Input
                  className="h-7 flex-1 text-xs"
                  placeholder="variable_key"
                  value={v.key}
                  onChange={(e) =>
                    updateVariable(v.key, { key: e.target.value })
                  }
                />
                {/* Type */}
                <Select
                  value={v.type}
                  onValueChange={(type) =>
                    updateVariable(v.key, {
                      type: type as VariableDefinition["type"],
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
                {/* Default value */}
                <Input
                  className="h-7 w-24 text-xs"
                  placeholder="Default"
                  value={v.defaultValue !== undefined ? String(v.defaultValue) : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    let parsed: string | number | boolean | null = raw;
                    if (v.type === "number") {
                      parsed = raw === "" ? 0 : Number(raw);
                    } else if (v.type === "boolean") {
                      parsed = raw === "true";
                    } else if (raw === "" || raw === "null") {
                      parsed = null;
                    }
                    updateVariable(v.key, { defaultValue: parsed });
                  }}
                />
                {/* Preview value */}
                {previewMode && (
                  <Badge
                    className="w-20 shrink-0 font-mono text-[10px]"
                    variant="secondary"
                  >
                    {String(previewValues[v.key] ?? v.defaultValue ?? "—")}
                  </Badge>
                )}
                {/* Delete */}
                <Button
                  className="size-7 shrink-0"
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteVariable(v.key)}
                >
                  <Trash2 className="size-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
