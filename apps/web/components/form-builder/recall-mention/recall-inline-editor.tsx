"use client";

import React, { useState, useMemo } from "react";
import type { FormSchema } from "@repo/shared";
import { RecallMentionInput } from "./recall-mention-input";
import { cn } from "@/lib/utils";

interface RecallInlineEditorProps {
  value: string;
  onUpdate: (value: string) => void;
  formSchema?: FormSchema | null;
  currentFieldRef?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function formatTokenLabel(token: string, formSchema?: FormSchema | null): string {
  const match = token.match(/^\{\{(field|variable|var|url_param|url):([^}]*)\}\}$/);
  if (match) {
    const [, type, ref] = match;
    if (type === "field") {
      const field = formSchema?.fields?.find((f) => f.ref === ref);
      return field?.title || ref;
    }
    if (type === "variable" || type === "var") return `var: ${ref}`;
    if (type === "url_param" || type === "url") return `url: ${ref}`;
  }
  if (token === "{{score}}") return "Score";
  if (token === "{{price}}") return "Price";
  return token;
}

function parseDisplayContent(
  value: string,
  formSchema?: FormSchema | null,
): Array<{ type: "text" | "token"; content: string; label?: string }> {
  const parts: Array<{ type: "text" | "token"; content: string; label?: string }> = [];
  const regex = /\{\{(field|variable|var|url_param|url|score|price):?([^}]*)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: value.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "token",
      content: match[0],
      label: formatTokenLabel(match[0], formSchema),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", content: value.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: value }];
}

/**
 * Inline editor with recall @ mention support.
 * Display mode looks like InlineEdit — tokens show as clean pills with field titles.
 * Click to edit — switches to RecallMentionInput with @ dropdown support.
 */
export function RecallInlineEditor({
  value,
  onUpdate,
  formSchema,
  currentFieldRef,
  className = "",
  placeholder = "Click to edit",
  disabled,
}: RecallInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  const parts = useMemo(() => parseDisplayContent(value, formSchema), [value, formSchema]);

  if (isEditing) {
    return (
      <div className="relative inline-flex max-w-full flex-col">
        <RecallMentionInput
          currentFieldRef={currentFieldRef}
          formSchema={formSchema}
          inputClassName="border-0 bg-transparent shadow-none ring-0 px-1 -mx-1 focus-visible:ring-0 focus-visible:ring-offset-0 text-inherit"
          onChange={(v) => onUpdate(v)}
          placeholder={placeholder}
          value={value}
        />
        <button
          className="mt-0.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
          onClick={() => setIsEditing(false)}
          type="button"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "group/inline relative inline-flex max-w-full flex-wrap items-center",
        "cursor-pointer",
        !value && "text-muted-foreground/60",
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      {parts.map((part, i) =>
        part.type === "token" ? (
          <span
            key={`pill-${i}`}
            className={cn(
              "inline-flex items-center rounded-[0.25rem] px-1 py-px mx-px",
              "bg-primary/10 text-primary font-medium",
              "border border-primary/20",
              "align-baseline text-[0.92em] leading-snug",
              "select-all",
              "dark:bg-primary/15 dark:text-primary dark:border-primary/25",
            )}
          >
            {part.label}
          </span>
        ) : (
          <span key={`text-${i}`} className="whitespace-pre-wrap">
            {part.content}
          </span>
        ),
      )}
      {!value && <span>{placeholder}</span>}
    </span>
  );
}

export default RecallInlineEditor;
