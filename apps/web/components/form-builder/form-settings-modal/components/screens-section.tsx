"use client";

import { useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { FormSchema, WelcomeScreen, ThankyouScreen } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface ScreensSectionProps {
  schema: FormSchema;
  onSchemaUpdate: (updates: Partial<FormSchema>) => void;
}

function WelcomeScreenEditor({
  screen,
  onChange,
  onRemove,
}: {
  screen: WelcomeScreen;
  onChange: (updates: Partial<WelcomeScreen>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Welcome Screen</Label>
        <Button onClick={onRemove} size="icon-sm" type="button" variant="ghost">
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Title</Label>
        <Input
          value={screen.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Welcome!"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Textarea
          value={screen.properties?.description ?? ""}
          onChange={(e) =>
            onChange({
              properties: { ...screen.properties, description: e.target.value },
            })
          }
          placeholder="Optional description shown below the title"
          rows={2}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label className="text-xs text-muted-foreground">Show button</Label>
        <Switch
          checked={screen.properties?.show_button !== false}
          onCheckedChange={(checked) =>
            onChange({
              properties: { ...screen.properties, show_button: checked },
            })
          }
        />
      </div>
      {screen.properties?.show_button !== false && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Button text</Label>
          <Input
            value={screen.properties?.button_text ?? "Start"}
            onChange={(e) =>
              onChange({
                properties: { ...screen.properties, button_text: e.target.value },
              })
            }
            placeholder="Start"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Image URL (optional)</Label>
        <Input
          value={screen.attachment?.href ?? ""}
          onChange={(e) =>
            onChange(
              e.target.value
                ? { attachment: { type: "image", href: e.target.value } }
                : { attachment: undefined },
            )
          }
          placeholder="https://example.com/image.png"
        />
      </div>
    </div>
  );
}

function ThankyouScreenEditor({
  screen,
  onChange,
  onRemove,
}: {
  screen: ThankyouScreen;
  onChange: (updates: Partial<ThankyouScreen>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Thank You Screen</Label>
        <Button onClick={onRemove} size="icon-sm" type="button" variant="ghost">
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Title</Label>
        <Input
          value={screen.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Thank you!"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label className="text-xs text-muted-foreground">Show button</Label>
        <Switch
          checked={screen.properties?.show_button !== false}
          onCheckedChange={(checked) =>
            onChange({
              properties: { ...screen.properties, show_button: checked },
            })
          }
        />
      </div>
      {screen.properties?.show_button !== false && (
        <>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Button text</Label>
            <Input
              value={screen.properties?.button_text ?? "Submit another response"}
              onChange={(e) =>
                onChange({
                  properties: { ...screen.properties, button_text: e.target.value },
                })
              }
              placeholder="Submit another response"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Button action</Label>
            <Select
              value={screen.properties?.button_mode ?? "reload"}
              onValueChange={(val) =>
                onChange({
                  properties: {
                    ...screen.properties,
                    button_mode: val as "reload" | "default_redirect" | "redirect",
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reload">Reload form</SelectItem>
                <SelectItem value="default_redirect">Redirect to default URL</SelectItem>
                <SelectItem value="redirect">Custom redirect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {screen.properties?.button_mode === "redirect" && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Redirect URL</Label>
              <Input
                value={screen.properties?.redirect_url ?? ""}
                onChange={(e) =>
                  onChange({
                    properties: { ...screen.properties, redirect_url: e.target.value },
                  })
                }
                placeholder="https://example.com/thank-you"
              />
            </div>
          )}
        </>
      )}
      <div className="flex items-center justify-between gap-4">
        <Label className="text-xs text-muted-foreground">Screen type</Label>
        <Select
          value={screen.type ?? "thankyou_screen"}
          onValueChange={(val) => onChange({ type: val as "thankyou_screen" | "url_redirect" })}
        >
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thankyou_screen">Thank you message</SelectItem>
            <SelectItem value="url_redirect">URL redirect</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Image URL (optional)</Label>
        <Input
          value={screen.attachment?.href ?? ""}
          onChange={(e) =>
            onChange(
              e.target.value
                ? { attachment: { type: "image", href: e.target.value } }
                : { attachment: undefined },
            )
          }
          placeholder="https://example.com/image.png"
        />
      </div>
    </div>
  );
}

export function ScreensSection({ schema, onSchemaUpdate }: ScreensSectionProps) {
  const welcomeScreen = schema.welcome_screens?.[0];
  const thankyouScreens = schema.thankyou_screens ?? [];

  const updateWelcome = useCallback(
    (updates: Partial<WelcomeScreen>) => {
      if (!welcomeScreen) return;
      onSchemaUpdate({
        welcome_screens: [{ ...welcomeScreen, ...updates }],
      });
    },
    [welcomeScreen, onSchemaUpdate],
  );

  const addWelcome = useCallback(() => {
    onSchemaUpdate({
      welcome_screens: [
        {
          ref: "welcome",
          title: "Welcome!",
          properties: {
            description: "",
            show_button: true,
            button_text: "Start",
          },
        },
      ],
    });
  }, [onSchemaUpdate]);

  const removeWelcome = useCallback(() => {
    onSchemaUpdate({ welcome_screens: [] });
  }, [onSchemaUpdate]);

  const updateThankyou = useCallback(
    (index: number, updates: Partial<ThankyouScreen>) => {
      const updated = [...thankyouScreens];
      updated[index] = { ...updated[index], ...updates };
      onSchemaUpdate({ thankyou_screens: updated });
    },
    [thankyouScreens, onSchemaUpdate],
  );

  const addThankyou = useCallback(() => {
    onSchemaUpdate({
      thankyou_screens: [
        ...thankyouScreens,
        {
          ref: `thankyou_${Date.now()}`,
          title: "Thank you!",
          type: "thankyou_screen",
          properties: {
            show_button: true,
            button_text: "Submit another response",
            button_mode: "reload",
          },
        },
      ],
    });
  }, [thankyouScreens, onSchemaUpdate]);

  const removeThankyou = useCallback(
    (index: number) => {
      const updated = thankyouScreens.filter((_, i) => i !== index);
      onSchemaUpdate({ thankyou_screens: updated });
    },
    [thankyouScreens, onSchemaUpdate],
  );

  return (
    <div className="flex flex-col gap-6 p-1">
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Add an optional start page before the questions, then customize the thank-you screen shown
        after submission.
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Welcome Screen</Label>
        </div>
        {welcomeScreen ? (
          <WelcomeScreenEditor
            onChange={updateWelcome}
            onRemove={removeWelcome}
            screen={welcomeScreen}
          />
        ) : (
          <Button onClick={addWelcome} type="button" variant="outline">
            <Plus className="size-4" />
            Add start page
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Thank You Screens</Label>
        </div>
        {thankyouScreens.length > 0 ? (
          thankyouScreens.map((screen, index) => (
            <ThankyouScreenEditor
              key={screen.ref ?? index}
              onChange={(updates) => updateThankyou(index, updates)}
              onRemove={() => removeThankyou(index)}
              screen={screen}
            />
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No thank you screens configured.</p>
        )}
      </div>
    </div>
  );
}
