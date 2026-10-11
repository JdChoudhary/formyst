"use client";

import { LogIn, PartyPopper, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ThankyouScreen, WelcomeScreen, FormSchema } from "@repo/shared";
import { RecallMentionInput } from "../../recall-mention";

interface ScreenSettingsPanelProps {
  kind: "welcome" | "ending";
  screen: WelcomeScreen | ThankyouScreen | null;
  onUpdate: (updates: Partial<WelcomeScreen | ThankyouScreen>) => void;
  onClose: () => void;
  /** Remove this screen from the form. */
  onDelete: () => void;
  /** Full form schema — enables recall mention support. */
  formSchema?: FormSchema;
}

/**
 * Inspector for the welcome / ending screens. Screen-level content editing
 * (the conversational canvas handles the visual editing; this is the
 * structured form).
 */
export function ScreenSettingsPanel({
  kind,
  screen,
  onUpdate,
  onClose,
  onDelete,
  formSchema,
}: ScreenSettingsPanelProps) {
  const isWelcome = kind === "welcome";
  const props = (screen?.properties ?? {}) as {
    description?: string;
    show_button?: boolean;
    button_text?: string;
    heading_alignment?: "left" | "center" | "right";
    show_divider?: boolean;
    divider_text?: string;
  };

  // Not created yet — offer a single clear action instead of a wall of empty inputs.
  if (!screen) {
    return (
      <div className="flex h-full min-h-0 flex-col border-border bg-background">
        <header className="flex flex-col border-border bg-card">
          <div className="flex w-full items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                {isWelcome ? (
                  <LogIn className="size-4 text-muted-foreground" />
                ) : (
                  <PartyPopper className="size-4 text-muted-foreground" />
                )}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-foreground">
                  {isWelcome ? "Welcome screen" : "Thank you screen"}
                </span>
                <span className="text-xs text-muted-foreground">Screen settings</span>
              </div>
            </div>
            <Button
              aria-label="Close screen settings"
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
          <Separator />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isWelcome ? <LogIn className="size-5" /> : <PartyPopper className="size-5" />}
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">
              {isWelcome ? "Add a welcome screen" : "Add a thank-you screen"}
            </h3>
            <p className="max-w-[240px] text-xs text-muted-foreground">
              {isWelcome
                ? "Start your form with a friendly intro before the first question."
                : "Thank respondents after they finish your form."}
            </p>
          </div>
          <Button
            className="mt-1"
            onClick={() =>
              onUpdate(
                isWelcome
                  ? {
                      title: "Welcome!",
                      properties: { description: "", show_button: true, button_text: "Start" },
                    }
                  : {
                      title: "Thank you for your submission!",
                      type: "thankyou_screen" as const,
                      properties: { show_button: true, button_text: "Submit another response" },
                    },
              )
            }
            size="sm"
          >
            {isWelcome ? "Create welcome screen" : "Create thank-you screen"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-border bg-background">
      <header className="flex flex-col border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              {isWelcome ? (
                <LogIn className="size-4 text-muted-foreground" />
              ) : (
                <PartyPopper className="size-4 text-muted-foreground" />
              )}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {isWelcome ? "Welcome screen" : "Thank you screen"}
              </span>
              <span className="text-xs text-muted-foreground">Screen settings</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label={
                isWelcome ? "Delete welcome screen" : "Delete thank-you screen"
              }
              className="text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              size="icon-sm"
              title="Delete screen"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              aria-label="Close screen settings"
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <Separator />
      </header>

      <ScrollArea className="h-0 min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm" htmlFor="screen-title">
              Title
            </Label>
            {formSchema ? (
              <RecallMentionInput
                formSchema={formSchema}
                onChange={(value) => onUpdate({ title: value })}
                placeholder={isWelcome ? "Welcome! Type @ to recall..." : "Thank you! Type @ to recall..."}
                value={screen?.title ?? ""}
              />
            ) : (
              <Input
                id="screen-title"
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder={isWelcome ? "Welcome!" : "Thank you!"}
                value={screen?.title ?? ""}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm" htmlFor="screen-description">
              Description
            </Label>
            {formSchema ? (
              <RecallMentionInput
                formSchema={formSchema}
                onChange={(value) =>
                  onUpdate({
                    properties: { ...props, description: value },
                  })
                }
                placeholder="A short message (type @ to recall)..."
                value={props.description ?? ""}
              />
            ) : (
              <Textarea
                className="resize-none"
                id="screen-description"
                onChange={(e) =>
                  onUpdate({
                    properties: { ...props, description: e.target.value },
                  })
                }
                placeholder="A short message shown to respondents..."
                rows={3}
                value={props.description ?? ""}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm" htmlFor="screen-align">
              Heading alignment
            </Label>
            <Select
              onValueChange={(value) =>
                onUpdate({
                  properties: { ...props, heading_alignment: value as "center" },
                })
              }
              value={props.heading_alignment ?? "center"}
            >
              <SelectTrigger className="w-32" id="screen-align">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Where the heading, divider and description sit on the screen.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-sm">Show divider</Label>
              <p className="text-xs text-muted-foreground">
                Draw a rule between the heading and the description.
              </p>
            </div>
            <Switch
              checked={props.show_divider ?? false}
              onCheckedChange={(show_divider) =>
                onUpdate({ properties: { ...props, show_divider } })
              }
            />
          </div>

          {props.show_divider === true && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm" htmlFor="screen-divider-text">
                Divider label
              </Label>
              <Input
                id="screen-divider-text"
                onChange={(e) =>
                  onUpdate({
                    properties: { ...props, divider_text: e.target.value },
                  })
                }
                placeholder="Optional label on the rule"
                value={props.divider_text ?? ""}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Label className="text-sm">Show button</Label>
              <p className="text-xs text-muted-foreground">
                {isWelcome
                  ? "Respondents tap Start to begin."
                  : "Respondents can submit another response."}
              </p>
            </div>
            <Switch
              checked={props.show_button !== false}
              onCheckedChange={(show_button) => onUpdate({ properties: { ...props, show_button } })}
            />
          </div>

          {props.show_button !== false && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm" htmlFor="screen-button">
                Button text
              </Label>
              <Input
                id="screen-button"
                onChange={(e) =>
                  onUpdate({
                    properties: { ...props, button_text: e.target.value },
                  })
                }
                placeholder={isWelcome ? "Start" : "Submit another response"}
                value={props.button_text ?? ""}
              />
            </div>
          )}

          <Separator />

          <Button
            className="w-full justify-center gap-1.5"
            onClick={onDelete}
            type="button"
            variant="destructive"
          >
            <Trash2 className="size-4" />
            {isWelcome ? "Delete welcome screen" : "Delete thank-you screen"}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
