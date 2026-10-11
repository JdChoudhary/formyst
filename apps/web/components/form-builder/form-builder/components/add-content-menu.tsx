"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FIELD_TYPE_CONFIGS } from "@/lib/fields/field-config";
import { getWelcomeScreen, getDefaultThankyou } from "@repo/shared";
import type { FormSchema } from "@repo/shared";
import { LayoutTemplate, LogIn, PartyPopper } from "lucide-react";

/** Special content identifiers resolved by the builder (not field types). */
export const CONTENT_TYPES = {
  WELCOME: "content_welcome",
  ENDING: "content_ending",
  PAGE: "content_page",
} as const;

interface AddContentMenuProps {
  formSchema: FormSchema;
  onSelect: (contentType: string) => void;
}

/**
 * Searchable "Add content" palette. Distinguishes question fields from
 * standalone content blocks (welcome screen, statement, page, thank-you
 * screen). Media attaches to an existing question on the canvas instead.
 */
export function AddContentMenu({ formSchema, onSelect }: AddContentMenuProps) {
  const hasWelcome = !!getWelcomeScreen(formSchema);
  const hasEnding = !!getDefaultThankyou(formSchema);

  // Layout field types are content blocks (statement / divider / banner), not
  // questions, so they are listed under "Content" with the screens.
  const questionTypes = FIELD_TYPE_CONFIGS.filter((config) => config.category !== "layout");
  const contentBlocks = FIELD_TYPE_CONFIGS.filter((config) => config.category === "layout");

  return (
    <Command>
      <CommandInput placeholder="Search content..." />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No content found.</CommandEmpty>

        <CommandGroup heading="Questions">
          {questionTypes.map((config) => {
            const Icon = config.icon;
            return (
              <CommandItem
                key={config.type}
                onSelect={() => onSelect(config.type)}
                value={`question ${config.label} ${config.type}`}
              >
                <Icon className="size-4 text-muted-foreground" />
                <span>{config.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Content">
          <CommandItem
            onSelect={() => onSelect(CONTENT_TYPES.WELCOME)}
            value="content welcome screen intro"
          >
            <LogIn className="size-4 text-muted-foreground" />
            <span className="flex-1">{hasWelcome ? "Welcome screen" : "Welcome screen"}</span>
            <span className="text-xs text-muted-foreground">Intro</span>
          </CommandItem>
          {contentBlocks.map((config) => {
            const Icon = config.icon;
            return (
              <CommandItem
                key={config.type}
                onSelect={() => onSelect(config.type)}
                value={`content ${config.label} ${config.type}`}
              >
                <Icon className="size-4 text-muted-foreground" />
                <span>{config.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Structure">
          <CommandItem
            onSelect={() => onSelect(CONTENT_TYPES.PAGE)}
            value="structure page section step"
          >
            <LayoutTemplate className="size-4 text-muted-foreground" />
            <span>Page / Section</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Ending">
          <CommandItem
            onSelect={() => onSelect(CONTENT_TYPES.ENDING)}
            value="ending thank you thank-you screen"
          >
            <PartyPopper className="size-4 text-muted-foreground" />
            <span>{hasEnding ? "Thank you screen" : "Thank you screen"}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
