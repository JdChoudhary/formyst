"use client";

import { useMemo } from "react";
import { Plus, Trash2, Calculator, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ScoringRule, FormField } from "@repo/shared";
import {
  generateId,
  buildFieldLabels,
  fieldHasChoices,
  getFieldChoices,
} from "./utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScoringPanelProps {
  scoringRules: ScoringRule[];
  fields: FormField[];
  onUpdate: (rules: ScoringRule[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScoringPanel({
  scoringRules,
  fields,
  onUpdate,
}: ScoringPanelProps) {
  const fieldLabels = useMemo(() => buildFieldLabels(fields), [fields]);

  // Only show fields that can be scored (choice fields, yes_no, number, etc.)
  const scoreableFields = useMemo(
    () =>
      fields.filter(
        (f) =>
          f.type !== "statement" &&
          f.ref &&
          (fieldHasChoices(f.type) ||
            ["yes_no", "number", "rating", "nps"].includes(f.type)),
      ),
    [fields],
  );

  // Summary stats
  const summary = useMemo(() => {
    const scoredCount = scoringRules.length;
    const totalPoints = scoringRules.reduce((sum, r) => sum + (r.points || 0), 0);
    const totalPossible = totalPoints;
    const unscoredFields = scoreableFields.filter(
      (f) => !scoringRules.some((r) => r.fieldRef === f.ref),
    );
    return { scoredCount, totalPossible, unscoredFields };
  }, [scoringRules, scoreableFields]);

  const addRule = () => {
    const newRule: ScoringRule = {
      id: generateId("score"),
      fieldRef: scoreableFields[0]?.ref ?? "",
      correctAnswers: [],
      points: 1,
    };
    onUpdate([...scoringRules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<ScoringRule>) => {
    onUpdate(
      scoringRules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    );
  };

  const deleteRule = (ruleId: string) => {
    onUpdate(scoringRules.filter((r) => r.id !== ruleId));
  };

  const toggleCorrectAnswer = (
    ruleId: string,
    choiceValue: string | number,
  ) => {
    const rule = scoringRules.find((r) => r.id === ruleId);
    if (!rule) return;
    const answers = rule.correctAnswers.includes(choiceValue)
      ? rule.correctAnswers.filter((a) => a !== choiceValue)
      : [...rule.correctAnswers, choiceValue];
    updateRule(ruleId, { correctAnswers: answers });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <div>
          <h3 className="font-medium text-foreground text-sm">Scoring</h3>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Award points for correct answers in quizzes and assessments.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addRule}>
          <Plus className="mr-1 size-3.5" />
          Add Rule
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {/* Summary card */}
        {scoringRules.length > 0 && (
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" />
              <span className="font-medium text-foreground text-sm">
                {summary.scoredCount} question
                {summary.scoredCount !== 1 ? "s" : ""} scored
              </span>
              <Badge className="text-[10px]" variant="secondary">
                Total possible: {summary.totalPossible} point
                {summary.totalPossible !== 1 ? "s" : ""}
              </Badge>
            </div>
            {summary.unscoredFields.length > 0 && (
              <p className="mt-1.5 text-muted-foreground text-xs">
                ⚠ {summary.unscoredFields.length} scoreable field
                {summary.unscoredFields.length !== 1 ? "s" : ""} not yet scored:{" "}
                {summary.unscoredFields
                  .map((f) => `"${f.title || f.ref}"`)
                  .join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {scoringRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <Calculator className="size-7 text-primary" />
            </div>
            <div className="max-w-sm">
              <h2 className="mb-1 font-semibold text-foreground text-lg">
                No scoring rules yet
              </h2>
              <p className="text-muted-foreground text-sm">
                Add scoring rules to award points for correct answers in
                quizzes and assessments.
              </p>
            </div>
            <Button onClick={addRule}>
              <Plus className="mr-1.5 size-4" />
              Add Scoring Rule
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {scoringRules.map((rule) => {
              const targetField = fields.find((f) => f.ref === rule.fieldRef);
              const choices =
                targetField && fieldHasChoices(targetField.type)
                  ? getFieldChoices(targetField)
                  : [];

              return (
                <div
                  key={rule.id}
                  className="rounded-xl border border-border/60 bg-card p-4 shadow-xs"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px]" variant="secondary">
                        {rule.points} point{rule.points !== 1 ? "s" : ""}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {targetField?.title || "Select field"}
                      </span>
                    </div>
                    <Button
                      className="size-6"
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="size-3 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Field picker */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="w-16 text-xs text-muted-foreground">
                      Field:
                    </span>
                    <Select
                      value={rule.fieldRef}
                      onValueChange={(ref) =>
                        updateRule(rule.id, {
                          fieldRef: ref,
                          correctAnswers: [],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {scoreableFields.map((f) => (
                          <SelectItem key={f.ref} value={f.ref ?? ""}>
                            {f.title || f.ref}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Points */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="w-16 text-xs text-muted-foreground">
                      Points:
                    </span>
                    <Input
                      className="h-8 w-20 text-xs"
                      min="0"
                      type="number"
                      value={rule.points}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          points: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  {/* Negative points */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="w-16 text-xs text-muted-foreground">
                      Penalty:
                    </span>
                    <Input
                      className="h-8 w-20 text-xs"
                      min="0"
                      type="number"
                      placeholder="0"
                      value={rule.negativePoints ?? ""}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          negativePoints: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                    />
                    <span className="text-[10px] text-muted-foreground">
                      pts deducted for wrong answer
                    </span>
                  </div>

                  {/* Partial points toggle */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="w-16 text-xs text-muted-foreground">
                      Partial:
                    </span>
                    <Checkbox
                      checked={rule.partialPoints ?? false}
                      onCheckedChange={(checked) =>
                        updateRule(rule.id, {
                          partialPoints: !!checked,
                        })
                      }
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Allow partial points for partial matches
                    </span>
                  </div>

                  {/* Correct answers — picker from choices */}
                  {choices.length > 0 && (
                    <div>
                      <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                        Correct answer(s):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {choices.map((choice, ci) => {
                          const choiceValue =
                            choice.text ?? choice.label ?? choice.ref ?? String(ci);
                          const isSelected =
                            rule.correctAnswers.includes(choiceValue) ||
                            rule.correctAnswers.includes(ci);
                          return (
                            <button
                              key={ci}
                              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                                isSelected
                                  ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                  : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                              }`}
                              onClick={() =>
                                toggleCorrectAnswer(rule.id, choiceValue)
                              }
                              type="button"
                            >
                              {choiceValue}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual input for non-choice fields */}
                  {choices.length === 0 && (
                    <div>
                      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                        Correct answer(s) (comma-separated):
                      </span>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. 42, or yes"
                        value={rule.correctAnswers.join(", ")}
                        onChange={(e) =>
                          updateRule(rule.id, {
                            correctAnswers: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
