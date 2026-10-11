"use client";

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { RecallEngine } from "@repo/form-engine";
import type { FormSchema } from "@repo/shared";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/* ------------------------------------------------------------------ *
 * Token helpers
 * ------------------------------------------------------------------ */
const TOKEN_REGEX = /\{\{(field|variable|var|url_param|url|score|price)(?::([^}]+))?\}\}/g;

function tokenize(value: string): Array<{ type: "text" | "token"; content: string }> {
  const parts: Array<{ type: "text" | "token"; content: string }> = [];
  TOKEN_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_REGEX.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: value.slice(lastIndex, match.index) });
    }
    parts.push({ type: "token", content: match[0] });
    lastIndex = TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < value.length) {
    parts.push({ type: "text", content: value.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: "text", content: value }];
}

function resolveTokenLabel(token: string, formSchema?: FormSchema | null): string {
  const match = token.match(
    /^\{\{(field|variable|var|url_param|url|score|price)(?::([^}]+))?\}\}$/,
  );
  if (!match) return token;
  const [, type, key] = match;
  switch (type) {
    case "field": {
      const field = formSchema?.fields?.find((f) => f.ref === key);
      return field?.title || key || "Unknown";
    }
    case "variable":
    case "var":
      return key || "var";
    case "url_param":
    case "url":
      return key || "url";
    case "score":
      return "Score";
    case "price":
      return "Price";
    default:
      return token;
  }
}

/* ------------------------------------------------------------------ *
 * Recall source list
 * ------------------------------------------------------------------ */
interface RecallItem {
  label: string;
  token: string;
  icon: string;
}

function buildRecallItems(
  formSchema: FormSchema | undefined | null,
  currentFieldRef?: string,
): RecallItem[] {
  if (!formSchema) return [];
  const items: RecallItem[] = [];
  const fields = formSchema.fields ?? [];
  const currentIdx = currentFieldRef ? fields.findIndex((f) => f.ref === currentFieldRef) : -1;
  const priorFields = currentIdx >= 0 ? fields.slice(0, currentIdx) : fields;

  for (const f of priorFields) {
    if (f.type === "group" || f.type === "statement") continue;
    items.push({
      label: (f.title || f.ref || "Untitled") as string,
      token: RecallEngine.referenceToToken({ type: "field", ref: f.ref ?? "" }),
      icon: "📝",
    });
  }

  const varDefs = formSchema.variableDefinitions ?? [];
  for (const v of varDefs) {
    items.push({
      label: v.key,
      token: RecallEngine.referenceToToken({ type: "variable", ref: v.key }),
      icon: "🔢",
    });
  }

  const varRecord = formSchema.variables ?? {};
  for (const key of Object.keys(varRecord)) {
    if (
      !items.some((s) => s.token === RecallEngine.referenceToToken({ type: "variable", ref: key }))
    ) {
      items.push({
        label: key,
        token: RecallEngine.referenceToToken({ type: "variable", ref: key }),
        icon: "🔢",
      });
    }
  }

  // URL parameters — `urlParams` is canonical, `hidden` is the legacy alias.
  const urlParams = Array.from(
    new Set([...(formSchema.urlParams ?? []), ...(formSchema.hidden ?? [])]),
  );
  for (const key of urlParams) {
    if (!key) continue;
    const token = RecallEngine.referenceToToken({ type: "url_param", key });
    if (!items.some((s) => s.token === token)) {
      items.push({
        label: key,
        token,
        icon: "🔗",
      });
    }
  }

  items.push({
    label: "Score",
    token: RecallEngine.referenceToToken({ type: "score" }),
    icon: "⭐",
  });
  items.push({
    label: "Price",
    token: RecallEngine.referenceToToken({ type: "price" }),
    icon: "💰",
  });
  return items;
}

/* ------------------------------------------------------------------ *
 * Pill element helper
 * ------------------------------------------------------------------ */
function createPillElement(token: string, formSchema?: FormSchema | null): HTMLSpanElement {
  const label = resolveTokenLabel(token, formSchema);
  const pill = document.createElement("span");
  pill.className = "inline-recall-pill";
  pill.contentEditable = "false";
  pill.dataset.token = token;
  pill.textContent = label;
  return pill;
}

/* ------------------------------------------------------------------ *
 * Sync DOM → raw value
 * Walks the contentEditable children and reconstructs the raw string.
 * Pill elements become {{token}}, text nodes become plain text.
 * ------------------------------------------------------------------ */
function domToValue(container: HTMLElement): string {
  let result = "";
  for (const node of container.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      // It's a pill
      if (el.dataset.token) {
        result += el.dataset.token;
      } else if (el.tagName === "BR") {
        result += "\n";
      } else {
        // Some other element — get its text
        result += el.textContent || "";
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || "";
    }
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * Sync value → DOM (rebuild the contentEditable children)
 * Replaces children with text nodes and pill elements.
 * ------------------------------------------------------------------ */
function syncValueToDom(container: HTMLElement, value: string, formSchema?: FormSchema | null) {
  // Clear container
  container.textContent = "";

  const regex = /\{\{(field|variable|var|url_param|url|score|price)(?::([^}]+))?\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    // Text before token
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(value.slice(lastIndex, match.index)));
    }
    // Pill
    container.appendChild(createPillElement(match[0], formSchema));
    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < value.length) {
    container.appendChild(document.createTextNode(value.slice(lastIndex)));
  }

  // If empty, ensure there's at least a text node for the caret
  if (container.childNodes.length === 0) {
    container.appendChild(document.createTextNode(""));
  }
}

/* ------------------------------------------------------------------ *
 * InlineRecallEdit
 *
 * contentEditable-based editor that renders recall tokens as styled pills.
 * - Click to enter editing mode → contentEditable div with inline pills
 * - Type @ → recall picker opens below
 * - Select item → pill inserted, user continues typing
 * - Blur → switches back to display-only mode with pills
 * - Supports multiline (Enter = newline)
 * ------------------------------------------------------------------ */
export function InlineRecallEdit({
  value,
  onUpdate,
  className,
  placeholder,
  multiline = false,
  formSchema,
  currentFieldRef,
}: {
  value: string;
  onUpdate: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  formSchema?: FormSchema;
  currentFieldRef?: string;
}) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const recallOpenRef = useRef(false);
  const [search, setSearch] = useState("");
  const recallRangeRef = useRef<Range | null>(null);
  const skipSyncRef = useRef(false);
  const lastValueRef = useRef(value);

  const setRecallOpenStable = useCallback((val: boolean) => {
    recallOpenRef.current = val;
    setRecallOpen(val);
  }, []);

  const parts = useMemo(() => tokenize(value), [value]);
  const hasTokens = parts.some((p) => p.type === "token");

  const recallItems = useMemo(
    () => buildRecallItems(formSchema, currentFieldRef),
    [formSchema, currentFieldRef],
  );

  const filteredItems = useMemo(() => {
    if (!search) return recallItems;
    const q = search.toLowerCase();
    return recallItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [recallItems, search]);

  /* ---- Sync value → DOM when value changes externally or entering edit mode ---- */
  useEffect(() => {
    if (!isEditing || !editableRef.current) return;
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    if (value !== lastValueRef.current) {
      syncValueToDom(editableRef.current, value, formSchema);
      lastValueRef.current = value;
    }
  }, [value, isEditing, formSchema]);

  /* ---- On entering edit mode, build the DOM ---- */
  const enterEditMode = useCallback(() => {
    setIsEditing(true);
    requestAnimationFrame(() => {
      const el = editableRef.current;
      if (el) {
        syncValueToDom(el, value, formSchema);
        lastValueRef.current = value;
        el.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }, [value, formSchema]);

  /* ---- Handle input in contentEditable ---- */
  const handleInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;

    const newValue = domToValue(el);
    skipSyncRef.current = true;
    lastValueRef.current = newValue;
    onUpdate(newValue);

    // Detect @ to open recall picker — consume the @ character
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (range.collapsed) {
        const { node: textNode, offset: charOffset } = getTextNodeAtCursor(el, range);
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || "";
          // Check if character before cursor is @
          if (charOffset > 0 && text[charOffset - 1] === "@") {
            // Keep the @ in the DOM while the user searches. This preserves
            // the exact replacement range even when the popover takes focus.
            recallRangeRef.current = range.cloneRange();
            setRecallOpenStable(true);
            setSearch("");
            return;
          }
          // If recall is open, update search
          if (recallOpenRef.current && charOffset > 0) {
            const beforeCursor = text.slice(0, charOffset);
            const atIndex = beforeCursor.lastIndexOf("@");
            if (atIndex >= 0) {
              setSearch(beforeCursor.slice(atIndex + 1));
            } else {
              setRecallOpenStable(false);
            }
          }
        }
      }
    }
  }, [onUpdate, setRecallOpenStable]);

  /* ---- Get the text node and offset at the current cursor position ---- */
  function getTextNodeAtCursor(
    container: HTMLElement,
    range: Range,
  ): { node: Node | null; offset: number } {
    let node = range.startContainer;
    let offset = range.startOffset;
    // If we're on an element, find the text node inside it
    if (node.nodeType === Node.ELEMENT_NODE) {
      const children = node.childNodes;
      if (offset < children.length) {
        node = children[offset];
        offset = 0;
      }
    }
    return { node, offset };
  }

  /* ---- Insert a recall token pill at the @ position ---- */
  const insertRecallToken = useCallback(
    (token: string) => {
      const el = editableRef.current;
      if (!el) return;

      const sel = window.getSelection();
      const savedRange = recallRangeRef.current;
      const range =
        savedRange?.cloneRange() ??
        (sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null);

      el.focus();

      // Find the @ character and remove it, then insert the pill.
      if (range) {
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }

        // Walk backwards to find the @
        const { node: textNode, offset: charOffset } = getTextNodeAtCursor(el, range);
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || "";
          let atIndex = -1;
          // Search backwards from cursor for @
          for (let i = charOffset - 1; i >= 0; i--) {
            if (text[i] === "@") {
              atIndex = i;
              break;
            }
          }

          if (atIndex >= 0) {
            // Remove @ and any search text after it
            const textNodeCasted = textNode as Text;
            const beforeText = text.slice(0, atIndex);
            const afterText = text.slice(charOffset);
            textNodeCasted.textContent = beforeText;
            const pill = createPillElement(token, formSchema);
            const trailingText = document.createTextNode(afterText);
            textNodeCasted.parentNode?.insertBefore(pill, textNodeCasted.nextSibling);
            textNodeCasted.parentNode?.insertBefore(trailingText, pill.nextSibling);

            if (sel) {
              const nextRange = document.createRange();
              nextRange.setStart(trailingText, 0);
              nextRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(nextRange);
            }
          } else {
            // No @ found, just insert pill at cursor
            const pill = createPillElement(token, formSchema);
            range.insertNode(pill);
            // Move cursor after pill
            range.setStartAfter(pill);
            range.collapse(true);
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        }
      } else {
        // Fallback: append pill at end
        const pill = createPillElement(token, formSchema);
        el.appendChild(pill);
        // Add a text node after for continued typing
        el.appendChild(document.createTextNode(""));
      }

      // Sync DOM → value
      const newValue = domToValue(el);
      skipSyncRef.current = true;
      lastValueRef.current = newValue;
      onUpdate(newValue);

      setRecallOpenStable(false);
      setSearch("");
      recallRangeRef.current = null;
    },
    [formSchema, onUpdate, setRecallOpenStable],
  );

  /* ---- Keyboard handling ---- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && recallOpenRef.current) {
        e.preventDefault();
        setRecallOpenStable(false);
        return;
      }
      // Enter: always blur unless Shift is held AND field supports multiline
      if (e.key === "Enter" && !recallOpenRef.current) {
        if (multiline && e.shiftKey) {
          // Shift+Enter = insert newline in multiline fields
          e.preventDefault();
          document.execCommand("insertLineBreak");
        } else {
          // Plain Enter = blur (single-line fields, or multiline without Shift)
          e.preventDefault();
          editableRef.current?.blur();
        }
      }
    },
    [multiline, setRecallOpenStable],
  );

  /* ---- Blur handler ---- */
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      // Don't close editing while the recall picker is open — the user is
      // interacting with it (it's portaled, so this blur fires on the
      // contentEditable when focus moves to the picker).
      if (recallOpenRef.current) return;
      setIsEditing(false);
    }, 200);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  }, []);

  /* ---- Pill styling (injected via a style tag) ---- */
  const pillStyle = `
    .inline-recall-pill {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      border-radius: 6px;
      padding: 1px 8px;
      margin: 0 2px;
      background: hsl(var(--primary) / 0.1);
      color: hsl(var(--primary));
      font-weight: 500;
      font-size: 0.88em;
      line-height: 1.4;
      border: 1px solid hsl(var(--primary) / 0.2);
      cursor: default;
      user-select: none;
      vertical-align: baseline;
      white-space: nowrap;
    }
  `;

  /* ---- Render ---- */
  return (
    <span className="relative inline-flex max-w-full">
      <style dangerouslySetInnerHTML={{ __html: pillStyle }} />

      {/* Non-editing display */}
      {!isEditing && (
        <span
          className={cn(
            "inline-flex max-w-full flex-wrap items-center cursor-text min-h-[1.2em]",
            !value && "text-muted-foreground/50",
            className,
          )}
          onClick={(e) => {
            e.stopPropagation();
            enterEditMode();
          }}
        >
          {hasTokens
            ? parts.map((part, i) =>
                part.type === "token" ? (
                  <span key={i} className="inline-recall-pill" contentEditable={false}>
                    {resolveTokenLabel(part.content, formSchema)}
                  </span>
                ) : (
                  <span key={i} className="whitespace-pre-wrap">
                    {part.content}
                  </span>
                ),
              )
            : value || placeholder || "\u00A0"}
        </span>
      )}

      {/* Editing mode — contentEditable div with inline pills */}
      {isEditing && (
        <div
          ref={editableRef}
          className={cn(
            "inline-editable-content min-h-[1.2em] outline-none cursor-text",
            "whitespace-pre-wrap break-words",
            className,
          )}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-placeholder={placeholder}
          style={{
            caretColor: "currentColor",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        />
      )}

      {/* Recall picker — portaled via Popover so clicks don't blur the contentEditable */}
      <Popover open={recallOpen} onOpenChange={setRecallOpenStable}>
        <PopoverTrigger
          className="pointer-events-none absolute left-0 top-full size-0 overflow-hidden opacity-0"
          nativeButton={false}
          render={<span />}
        />
        <PopoverContent align="start" side="bottom" sideOffset={4} className="w-[280px] p-0">
          <div className="border-b border-border p-2" onMouseDown={(e) => e.preventDefault()}>
            <input
              autoFocus
              className="w-full rounded-md border-0 bg-muted px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search recall..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setRecallOpenStable(false);
                  editableRef.current?.focus();
                }
              }}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              filteredItems.map((item, idx) => (
                <button
                  key={`${item.token}-${idx}`}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertRecallToken(item.token);
                  }}
                  type="button"
                >
                  <span className="shrink-0 text-base">{item.icon}</span>
                  <span className="flex-1 truncate font-medium">{item.label}</span>
                  <span className="shrink-0 text-[10px] font-mono opacity-60 text-muted-foreground">
                    {item.token}
                  </span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}
