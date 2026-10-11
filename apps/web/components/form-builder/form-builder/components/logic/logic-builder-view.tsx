"use client";

import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import {
  GitBranch,
  Variable,
  Trophy,
  Target,
  ShieldCheck,
  Route,
  Plus,
  Trash2,
  Link2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { FormSchema } from "@repo/shared";
import { getUrlParams } from "@repo/shared";
import { RuleList } from "./rule-list";
import { StepRoutingBuilder } from "./step-routing-builder";
import { VariablesPanel } from "./variables-panel";
import { ScoringPanel } from "./scoring-panel";
import { QuizPanel } from "./quiz-panel";
import { OutcomeBuilder } from "./outcome-builder";
import { ValidationPanel } from "./validation-panel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LogicBuilderViewProps {
  schema: FormSchema;
  onSchemaUpdate: (updates: Partial<FormSchema>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LogicBuilderView({ schema, onSchemaUpdate }: LogicBuilderViewProps) {
  const fields = schema.fields ?? [];
  const logicRules = schema.logic ?? [];
  const scoringRules = schema.scoring ?? [];
  const variableDefinitions = schema.variableDefinitions ?? [];
  const hiddenFields = getUrlParams(schema);
  const outcomes = schema.outcomes ?? [];
  const thankyouScreens = schema.thankyou_screens ?? [];
  const groups = schema.groups ?? [];
  const isMultiStep = groups.length > 1;

  // --- Updaters ---
  const updateLogic = (logic: FormSchema["logic"]) => onSchemaUpdate({ logic });

  const updateVariables = (variableDefinitions: FormSchema["variableDefinitions"]) =>
    onSchemaUpdate({ variableDefinitions });

  const updateScoring = (scoring: FormSchema["scoring"]) => onSchemaUpdate({ scoring });

  const updateOutcomes = (outcomes: FormSchema["outcomes"]) => onSchemaUpdate({ outcomes });
  const [hiddenRef, setHiddenRef] = useState("");

  const addHiddenField = () => {
    const ref = hiddenRef.trim();
    if (!ref || hiddenFields.includes(ref)) return;
    const next = [...hiddenFields, ref];
    // `urlParams` is canonical; keep `hidden` in sync for older readers.
    onSchemaUpdate({ urlParams: next, hidden: next });
    setHiddenRef("");
  };

  const removeHiddenField = (ref: string) => {
    const next = hiddenFields.filter((item) => item !== ref);
    onSchemaUpdate({ urlParams: next, hidden: next });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header --------------------------------------------------------- */}
      <div className="flex shrink-0 items-start gap-3 border-border border-b px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Workflow className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm">Logic &amp; behavior</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Control what respondents see, and how their answers are scored.
          </p>
        </div>
      </div>

      <Tabs
        className="flex min-h-0 flex-1 flex-col gap-0"
        defaultValue={isMultiStep ? "routing" : "rules"}
      >
        {/* Tab bar ------------------------------------------------------ */}
        <div className="shrink-0 border-border border-b px-3 py-2">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {isMultiStep && (
              <TabTrigger icon={Route} value="routing">
                Routing
              </TabTrigger>
            )}
            <TabTrigger count={logicRules.length} icon={GitBranch} value="rules">
              Rules
            </TabTrigger>
            <TabTrigger count={variableDefinitions.length} icon={Variable} value="variables">
              Variables
            </TabTrigger>
            <TabTrigger
              count={scoringRules.length}
              icon={Trophy}
              value="quiz"
              highlight={Boolean(schema.settings?.quiz?.enabled)}
            >
              Quiz
            </TabTrigger>
            <TabTrigger count={outcomes.length} icon={Target} value="outcomes">
              Outcomes
            </TabTrigger>
            <TabTrigger icon={ShieldCheck} value="validation">
              Validation
            </TabTrigger>
            <TabTrigger count={hiddenFields.length} icon={Link2} value="url-params">
              URL params
            </TabTrigger>
          </TabsList>
        </div>

        {/* Tab content -------------------------------------------------- */}
        <ScrollArea className="min-h-0 flex-1">
          {/* Step routing tab — the plain-language default */}
          {isMultiStep && (
            <TabsContent className="h-full" value="routing">
              <StepRoutingBuilder onSchemaUpdate={onSchemaUpdate} schema={schema} />
            </TabsContent>
          )}

          {/* Rules tab */}
          <TabsContent className="h-full" value="rules">
            <div className="p-4">
              <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-muted-foreground text-xs">
                {isMultiStep
                  ? "Rules run on top of step routing. Use them to show, hide, disable, or require questions based on earlier answers."
                  : "Use rules to show, hide, disable, or require questions based on earlier answers."}
              </div>
              <RuleList
                rules={logicRules}
                fields={fields}
                variables={variableDefinitions}
                thankyouScreens={thankyouScreens}
                outcomes={outcomes}
                groups={groups}
                onUpdate={updateLogic}
              />
            </div>
          </TabsContent>

          {/* Variables tab */}
          <TabsContent className="h-full" value="variables">
            <VariablesPanel
              variables={variableDefinitions}
              logicRules={logicRules}
              fields={fields}
              onUpdate={updateVariables}
            />
          </TabsContent>

          {/* Quiz tab — quiz mode + per-question scoring rules */}
          <TabsContent className="h-full" value="quiz">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-border border-b px-4 py-3">
                <QuizPanel
                  scoringRules={scoringRules}
                  schema={schema}
                  onSchemaUpdate={onSchemaUpdate}
                />
              </div>
              <div className="min-h-0 flex-1">
                <ScoringPanel
                  scoringRules={scoringRules}
                  fields={fields}
                  onUpdate={updateScoring}
                />
              </div>
            </div>
          </TabsContent>

          {/* Outcomes tab */}
          <TabsContent className="h-full" value="outcomes">
            <div className="p-4">
              <OutcomeBuilder
                outcomes={outcomes}
                fields={fields}
                variables={variableDefinitions}
                thankyouScreens={thankyouScreens}
                onUpdate={updateOutcomes}
              />
            </div>
          </TabsContent>

          {/* Validation tab */}
          <TabsContent className="h-full" value="validation">
            <div className="p-4">
              <ValidationPanel schema={schema} />
            </div>
          </TabsContent>

          {/* URL params tab */}
          <TabsContent className="h-full" value="url-params">
            <div className="p-4">
              <div className="mx-auto flex max-w-2xl flex-col gap-5">
                <div>
                  <h2 className="font-semibold text-lg">Hidden URL parameters</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add names such as <code>campaign</code> or <code>customer_id</code>. Pass them
                    in the published form URL and use them in logic or text with{" "}
                    <code>{"{{url:campaign}}"}</code>.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    onChange={(event) => setHiddenRef(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addHiddenField();
                    }}
                    placeholder="Parameter name"
                    value={hiddenRef}
                  />
                  <Button className="shrink-0 gap-1.5" onClick={addHiddenField} type="button">
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
                {hiddenFields.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {hiddenFields.map((ref) => (
                      <div
                        className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                        key={ref}
                      >
                        <code className="text-sm">{ref}</code>
                        <Button
                          aria-label={`Remove ${ref}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeHiddenField(ref)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No hidden URL parameters yet.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab trigger
// ---------------------------------------------------------------------------

interface TabTriggerProps {
  value: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  count?: number;
  /** Draws attention to a tab that has active configuration. */
  highlight?: boolean;
}

function TabTrigger({ value, icon: Icon, children, count, highlight }: TabTriggerProps) {
  return (
    <TabsTrigger
      className="h-7 flex-none gap-1.5 rounded-md px-2.5 text-xs data-active:bg-muted"
      value={value}
    >
      <Icon className="size-3.5" />
      {children}
      {typeof count === "number" && count > 0 ? (
        <Badge
          className="ml-0.5 h-4 min-w-4 justify-center px-1 text-[10px]"
          variant={highlight ? "default" : "secondary"}
        >
          {count}
        </Badge>
      ) : null}
    </TabsTrigger>
  );
}
