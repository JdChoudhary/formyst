"use client";

import type { ComponentType } from "react";
import { Award, Gauge, MessageSquareQuote, RotateCcw, Timer, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FormSchema, QuizSettings, ScoringRule } from "@repo/shared";

interface QuizPanelProps {
  schema: FormSchema;
  scoringRules: ScoringRule[];
  onSchemaUpdate: (updates: Partial<FormSchema>) => void;
}

/** Sensible defaults so a brand-new form reads as a working quiz. */
const DEFAULT_QUIZ: QuizSettings = {
  enabled: false,
  passingScore: 70,
  showScore: true,
  showCorrectAnswers: true,
  allowRetake: false,
};

/**
 * Form-level quiz configuration — the same controls that used to live in
 * Form settings → Quiz & Scoring, now next to the per-question rules they
 * depend on. Writes to `schema.settings.quiz`, which `lib/quiz/scoring` reads
 * when it grades a submission.
 */
export function QuizPanel({ schema, scoringRules, onSchemaUpdate }: QuizPanelProps) {
  const quiz: QuizSettings = {
    ...DEFAULT_QUIZ,
    ...((schema.settings?.quiz ?? {}) as QuizSettings),
  };
  const enabled = Boolean(quiz.enabled);

  const updateQuiz = (updates: Partial<QuizSettings>) => {
    onSchemaUpdate({
      settings: {
        ...(schema.settings ?? {}),
        quiz: { ...quiz, ...updates },
      },
    });
  };

  const totalPoints = scoringRules.reduce((sum, rule) => sum + (rule.points ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Master switch ------------------------------------------------- */}
      <div
        className={cn(
          "rounded-xl border bg-card p-4 transition-colors",
          enabled ? "border-primary/40 bg-primary/[0.03]" : "border-border/60",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Trophy className="size-4" />
            </div>
            <div className="min-w-0">
              <Label className="font-medium text-sm" htmlFor="quiz-mode-enabled">
                Quiz mode
              </Label>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Grade answers, set a pass mark, and show respondents their score.
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            id="quiz-mode-enabled"
            onCheckedChange={(next) => updateQuiz({ enabled: next })}
          />
        </div>

        {enabled && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-border/60 border-t pt-3">
            <Badge className="text-[10px]" variant="secondary">
              {scoringRules.length} scored question{scoringRules.length === 1 ? "" : "s"}
            </Badge>
            <Badge className="text-[10px]" variant="secondary">
              {totalPoints} point{totalPoints === 1 ? "" : "s"} available
            </Badge>
            <Badge className="text-[10px]" variant="secondary">
              Pass at {quiz.passingScore ?? 70}%
            </Badge>
          </div>
        )}
      </div>

      {!enabled ? (
        <p className="rounded-xl border border-border/60 border-dashed bg-muted/20 px-4 py-6 text-center text-muted-foreground text-xs">
          Turn on quiz mode to grade answers and show results. Scoring rules can be
          added either way.
        </p>
      ) : (
        <>
          {/* Grading --------------------------------------------------- */}
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <SectionHeading icon={Gauge} title="Grading & behaviour" />

            <div className="mt-4 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-sm" htmlFor="quiz-passing-score">
                    Passing score
                  </Label>
                  <span className="font-semibold text-sm tabular-nums">
                    {quiz.passingScore ?? 70}%
                  </span>
                </div>
                <Slider
                  id="quiz-passing-score"
                  max={100}
                  min={0}
                  onValueChange={([value]) => updateQuiz({ passingScore: value })}
                  step={5}
                  value={[quiz.passingScore ?? 70]}
                />
                <p className="text-muted-foreground text-xs">
                  Minimum percentage required to pass.
                </p>
              </div>

              <ToggleRow
                checked={quiz.showScore !== false}
                description="Display the respondent's score on the ending screen."
                id="quiz-show-score"
                label="Show score"
                onChange={(showScore) => updateQuiz({ showScore })}
              />

              <ToggleRow
                checked={quiz.showCorrectAnswers !== false}
                description="Reveal the correct answers and explanations after submitting."
                id="quiz-show-correct"
                label="Show correct answers"
                onChange={(showCorrectAnswers) => updateQuiz({ showCorrectAnswers })}
              />

              <ToggleRow
                checked={Boolean(quiz.allowRetake)}
                description="Let respondents take the quiz again to improve their score."
                id="quiz-allow-retake"
                label="Allow retake"
                onChange={(allowRetake) => updateQuiz({ allowRetake })}
              />

              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-1.5 font-medium text-sm" htmlFor="quiz-time-limit">
                  <Timer className="size-3.5 text-muted-foreground" />
                  Time limit (minutes)
                </Label>
                <Input
                  className="w-32"
                  id="quiz-time-limit"
                  min={1}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    updateQuiz({
                      timeLimit: raw === "" ? undefined : Math.max(1, Number(raw) || 1),
                    });
                  }}
                  placeholder="No limit"
                  type="number"
                  value={quiz.timeLimit ?? ""}
                />
                <p className="text-muted-foreground text-xs">
                  Leave empty for an untimed quiz.
                </p>
              </div>
            </div>
          </div>

          {/* Result messages ------------------------------------------- */}
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <SectionHeading icon={MessageSquareQuote} title="Result messages" />

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-1.5 font-medium text-sm" htmlFor="quiz-pass-message">
                  <Award className="size-3.5 text-emerald-600" />
                  Passed
                </Label>
                <Textarea
                  id="quiz-pass-message"
                  onChange={(event) =>
                    updateQuiz({
                      resultMessage: { ...quiz.resultMessage, pass: event.target.value },
                    })
                  }
                  placeholder="Congratulations! You passed with {percentage}% ({score}/{total} points)."
                  rows={3}
                  value={quiz.resultMessage?.pass ?? ""}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-1.5 font-medium text-sm" htmlFor="quiz-fail-message">
                  <RotateCcw className="size-3.5 text-muted-foreground" />
                  Did not pass
                </Label>
                <Textarea
                  id="quiz-fail-message"
                  onChange={(event) =>
                    updateQuiz({
                      resultMessage: { ...quiz.resultMessage, fail: event.target.value },
                    })
                  }
                  placeholder="You scored {percentage}% ({score}/{total} points). Keep practicing!"
                  rows={3}
                  value={quiz.resultMessage?.fail ?? ""}
                />
              </div>

              <p className="text-muted-foreground text-xs">
                Placeholders:{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{score}"}</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{percentage}"}</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{total}"}</code>.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <h4 className="font-medium text-foreground text-sm">{title}</h4>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label className="cursor-pointer font-medium text-sm" htmlFor={id}>
          {label}
        </Label>
        <p className="mt-0.5 text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={checked} id={id} onCheckedChange={onChange} />
    </div>
  );
}
