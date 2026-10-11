"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { RecallEngine, type RecallReference } from "@repo/form-engine";
import type { FormSchema } from "@repo/shared";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Eye, Sparkles } from "lucide-react";

export interface RecallSource {
  type: "field" | "variable" | "url_param" | "score" | "price";
  label: string;
  ref: string;
  icon: string;
}

interface RecallMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  formSchema?: FormSchema | null;
  currentFieldRef?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

function formSchemaToSources(form: FormSchema, currentFieldRef?: string): RecallSource[] {
  const sources: RecallSource[] = [];

  // Previous answers
  const fields = form.fields ?? [];
  const currentIdx = currentFieldRef ? fields.findIndex((f) => f.ref === currentFieldRef) : -1;

  const priorFields = currentIdx >= 0 ? fields.slice(0, currentIdx) : fields;

  for (const f of priorFields) {
    if (f.type === "group") continue;
    const title = f.title || f.ref || "Untitled";
    sources.push({
      type: "field",
      label: title as string,
      ref: f.ref ?? "",
      icon: "📝",
    });
  }

  // Variables from array
  const varDefs = form.variableDefinitions ?? [];
  for (const v of varDefs) {
    sources.push({
      type: "variable",
      label: v.key,
      ref: v.key,
      icon: "🔢",
    });
  }

  // Variables from Record
  const varRecord = form.variables ?? {};
  for (const key of Object.keys(varRecord)) {
    if (!sources.some((s) => s.type === "variable" && s.ref === key)) {
      sources.push({
        type: "variable",
        label: key,
        ref: key,
        icon: "🔢",
      });
    }
  }

  // URL parameters
  const urlParams = (form as Record<string, unknown>).urlParameters;
  if (Array.isArray(urlParams)) {
    for (const p of urlParams as Array<{ key?: string; name?: string }>) {
      const key = p.key ?? p.name;
      if (key) {
        if (!sources.some((source) => source.type === "url_param" && source.ref === key)) {
          sources.push({
            type: "url_param",
            label: key,
            ref: key,
            icon: "🔗",
          });
        }
      }
    }
  }

  // Hidden URL parameters are stored on the form as `hidden` (legacy) or
  // `urlParams` (canonical). Merge both so forms saved under either key
  // expose their parameters here.
  const declaredUrlParams = Array.from(
    new Set([...(form.urlParams ?? []), ...(form.hidden ?? [])]),
  );
  for (const ref of declaredUrlParams) {
    if (!ref) continue;
    if (!sources.some((source) => source.type === "url_param" && source.ref === ref)) {
      sources.push({
        type: "url_param",
        label: ref,
        ref,
        icon: "🔗",
      });
    }
  }

  // Score & Price
  sources.push({ type: "score", label: "Score", ref: "score", icon: "⭐" });
  sources.push({ type: "price", label: "Price", ref: "price", icon: "💰" });

  return sources;
}

function sourceToReference(source: RecallSource): RecallReference {
  switch (source.type) {
    case "field":
      return { type: "field", ref: source.ref };
    case "variable":
      return { type: "variable", ref: source.ref };
    case "url_param":
      return { type: "url_param", key: source.ref };
    case "score":
      return { type: "score" };
    case "price":
      return { type: "price" };
  }
}

function sourceToToken(source: RecallSource): string {
  return RecallEngine.referenceToToken(sourceToReference(source));
}

function tokenize(value: string): Array<{ type: "text" | "token"; content: string }> {
  const parts: Array<{ type: "text" | "token"; content: string }> = [];
  const regex = /\{\{(field|variable|var|url_param|url|score|price):?([^}]*)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: value.slice(lastIndex, match.index),
      });
    }
    parts.push({ type: "token", content: match[0] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", content: value.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: value }];
}

function formatTokenDisplay(token: string, formSchema?: FormSchema | null): string {
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

function groupByType(sources: RecallSource[]): Map<string, RecallSource[]> {
  const map = new Map<string, RecallSource[]>();
  for (const s of sources) {
    const label =
      s.type === "field"
        ? "Previous answers"
        : s.type === "variable"
          ? "Variables"
          : s.type === "url_param"
            ? "URL parameters"
            : s.type === "score"
              ? "Score"
              : "Price";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(s);
  }

  return map;
}

function getPreviewResponse(formSchema: FormSchema | null | undefined, ref: string) {
  const schema = formSchema as
    | (FormSchema & {
        answers?: Record<string, unknown>;
        responses?: Record<string, unknown>;
      })
    | null
    | undefined;
  const answers = schema?.answers ?? schema?.responses;
  const answer = answers?.[ref];

  if (answer === undefined || answer === null || answer === "") return "__";
  if (Array.isArray(answer)) return answer.join(", ");
  return String(answer);
}

export function RecallMentionInput({
  value,
  onChange,
  formSchema,
  currentFieldRef,
  placeholder,
  className = "",
  inputClassName,
  disabled,
  readOnly,
}: RecallMentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedSource, setSelectedSource] = useState<RecallSource | null>(null);
  const recallCursorRef = useRef<number | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Derive this from the current schema on every render. Builder updates can
  // preserve the schema object while replacing nested arrays, and a memo
  // keyed only by the root object would leave newly added variables or URL
  // parameters out of the picker.
  const allSources = formSchema ? formSchemaToSources(formSchema, currentFieldRef) : [];

  const groups = useMemo(() => groupByType(allSources), [allSources]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      onChange(newVal);

      const pos = e.target.selectionStart ?? newVal.length;

      // Detect @ right before cursor
      if (pos > 0 && newVal[pos - 1] === "@") {
        recallCursorRef.current = pos;
        setOpen(true);
        setSearchValue("");
        setSelectedSource(allSources[0] ?? null);
        return;
      }

      // If dropdown is open, update search from after the @
      if (open && pos > 0) {
        const atIndex = newVal.lastIndexOf("@", pos - 1);
        if (atIndex >= 0) {
          setSearchValue(newVal.slice(atIndex + 1, pos));
          return;
        }
      }
    },
    [allSources, onChange, open],
  );

  const insertRecall = useCallback(
    (source: RecallSource) => {
      const token = sourceToToken(source);
      const input = inputRef.current;

      if (!input) {
        onChange(value + token);
        setOpen(false);
        return;
      }

      const v = input.value;
      const pos = recallCursorRef.current ?? input.selectionStart ?? v.length;
      const atIndex = v.lastIndexOf("@", pos - 1);

      if (atIndex >= 0) {
        const before = v.slice(0, atIndex);
        const after = v.slice(pos);
        const newVal = before + token + after;
        onChange(newVal);
        requestAnimationFrame(() => {
          const newPos = atIndex + token.length;
          input.selectionStart = newPos;
          input.selectionEnd = newPos;
          input.focus();
        });
      } else {
        const newVal = v.slice(0, pos) + token + v.slice(pos);
        onChange(newVal);
        requestAnimationFrame(() => {
          input.selectionStart = pos + token.length;
          input.selectionEnd = pos + token.length;
          input.focus();
        });
      }

      setOpen(false);
      setSearchValue("");
      recallCursorRef.current = null;
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    },
    [open],
  );

  // Render token pills
  const parts = useMemo(() => tokenize(value), [value]);
  const hasTokens = parts.some((p) => p.type === "token");

  return (
    <div className={`relative ${className}`}>
      {/* Hidden anchor for popover positioning */}
      <div ref={anchorRef} className="absolute top-full left-0 z-50 h-0 w-0" />

      {/* Token pills */}
      {hasTokens && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {parts
            .filter((p) => p.type === "token")
            .map((p, i) => (
              <span
                key={`pill-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
              >
                {formatTokenDisplay(p.content, formSchema)}
                {!disabled && !readOnly && (
                  <button
                    type="button"
                    className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(value.replace(p.content, ""));
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
        </div>
      )}

      {/* Input with popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <div>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                className={cn(
                  "w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                  inputClassName,
                )}
                autoComplete="off"
              />
            </div>
          }
        ></PopoverTrigger>
        <PopoverContent
          className="w-[min(620px,calc(100vw-2rem))] p-0"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder="Search questions, variables, score, or price..."
            />
            <div className="grid grid-cols-[minmax(0,1fr)_220px]">
              <CommandList className="max-h-82.5 p-2">
                <CommandEmpty>No matching sources.</CommandEmpty>
                {Array.from(groups.entries()).map(([groupLabel, items]) => (
                  <CommandGroup key={groupLabel} heading={groupLabel}>
                    {items.map((source) => (
                      <CommandItem
                        key={`${source.type}-${source.ref}`}
                        value={`${source.label} ${source.ref} ${source.type}`}
                        onMouseEnter={() => setSelectedSource(source)}
                        onSelect={() => insertRecall(source)}
                        className="cursor-pointer rounded-lg"
                      >
                        <span className="mr-1">{source.icon}</span>
                        <span className="flex-1 truncate">{source.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground font-mono">
                          {sourceToToken(source)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
              <div className="hidden border-l bg-muted/20 p-4 sm:block">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
                  <Eye className="size-3.5 text-primary" />
                  Preview
                </div>
                {selectedSource ? (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Question
                      </p>
                      <p className="text-sm font-medium leading-snug">{selectedSource.label}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Response
                      </p>
                      <p className="rounded-md border bg-background px-2.5 py-2 text-sm text-muted-foreground">
                        {selectedSource.type === "field"
                          ? getPreviewResponse(formSchema, selectedSource.ref)
                          : selectedSource.type === "score"
                            ? "0 points"
                            : selectedSource.type === "price"
                              ? "$0.00"
                              : "__"}
                      </p>
                    </div>
                    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                      This value is filled in automatically when the form is completed.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Select a question to see its response preview.
                  </p>
                )}
              </div>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Hint */}
      <p className="text-[11px] text-muted-foreground mt-1">
        Type <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">@</kbd> to recall a
        previous answer
      </p>
    </div>
  );
}

export default RecallMentionInput;
