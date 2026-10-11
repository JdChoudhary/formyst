"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Self-contained questionnaire primitives. Originally these were distributed
 * by `@shadcn/react/questionnaire`, which is not available in the installed
 * `@shadcn/react` version — so they're implemented here directly.
 */

function Questionnaire({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire"
      className={cn("flex w-full min-w-0 flex-col gap-4", className)}
      {...props}
    />
  )
}

function QuestionnaireProgress({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="questionnaire-progress"
      className={cn(
        "min-h-[1lh] w-fit min-w-[14ch] text-xs font-medium text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-item"
      className={cn(
        "flex min-w-0 flex-col gap-4 border-0 p-0 outline-none",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="questionnaire-title"
      className={cn(
        "font-heading text-base leading-snug font-medium text-pretty [&:not(:has(~[data-slot=questionnaire-description]))]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="questionnaire-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  )
}

function QuestionnaireChoices({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-choices"
      className={cn("group/questionnaire-choices grid min-w-0 gap-2", className)}
      {...props}
    />
  )
}

function QuestionnaireChoice({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="questionnaire-choice"
      className={cn(
        "group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-input bg-transparent px-3 py-2.5 text-start text-sm transition-colors outline-none select-none hover:bg-muted/50 has-[:checked]:border-primary/40 has-[:checked]:bg-muted dark:bg-input/20 dark:has-[:checked]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="questionnaire-input"
      className={cn(
        "h-8 min-h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireError({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="questionnaire-error"
      className={cn("text-sm text-destructive", className)}
      {...props}
    />
  )
}

function QuestionnaireActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-actions"
      className={cn(
        "grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:min-h-8",
        className
      )}
      {...props}
    />
  )
}

function QuestionnairePrevious({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="questionnaire-previous"
      className={cn(
        "col-start-1 row-start-1 min-h-11 justify-self-start rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors outline-none select-none hover:bg-muted sm:min-h-8",
        className
      )}
      type="button"
      {...props}
    >
      {children ?? "Previous"}
    </button>
  )
}

function QuestionnaireSkip({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="questionnaire-skip"
      className={cn(
        "col-start-2 row-start-1 min-h-11 justify-self-end rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors outline-none select-none hover:bg-muted sm:min-h-8",
        className
      )}
      type="button"
      {...props}
    >
      {children ?? "Skip"}
    </button>
  )
}

function QuestionnaireNext({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="questionnaire-next"
      className={cn(
        "col-start-3 row-start-1 min-h-11 justify-self-end rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors outline-none select-none hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50 sm:min-h-8",
        className
      )}
      type="button"
      {...props}
    >
      {children ?? "Next"}
    </button>
  )
}

function QuestionnaireSubmit({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="questionnaire-submit"
      className={cn(
        "col-start-3 row-start-1 min-h-11 justify-self-end rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors outline-none select-none hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50 sm:min-h-8",
        className
      )}
      type="submit"
      {...props}
    >
      {children ?? "Submit"}
    </button>
  )
}

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
}
