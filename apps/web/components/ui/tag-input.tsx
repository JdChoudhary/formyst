"use client"

import { XIcon } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface TagInputProps {
  tags?: string[]
  onTagsChange?: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  maxTags?: number
  allowDuplicates?: boolean
  className?: string
  tagSize?: "sm" | "md" | "lg"
  tagVariant?: "default" | "outline" | "secondary"
  id?: string
}

export function TagInput({
  tags = [],
  onTagsChange,
  placeholder = "Type and press Enter...",
  disabled,
  maxTags = 20,
  allowDuplicates = false,
  className,
  tagSize = "sm",
  tagVariant = "default",
  id,
}: TagInputProps) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const normalized = useMemo(
    () => (Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : []),
    [tags]
  )

  const atLimit = normalized.length >= maxTags

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/,+$/, "")
    if (!value || disabled || atLimit) return
    if (!allowDuplicates && normalized.includes(value)) return

    onTagsChange?.([...normalized, value])
    setInput("")
  }

  const removeTag = (index: number) => {
    if (disabled) return
    const next = [...normalized]
    next.splice(index, 1)
    onTagsChange?.(next)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(input)
    } else if (e.key === "Backspace" && !input && normalized.length > 0) {
      removeTag(normalized.length - 1)
    } else if (e.key === "Escape") {
      e.currentTarget.blur()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text")
    const chunks = pasted
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (chunks.length === 0) return
    const next = [...normalized]
    for (const chunk of chunks) {
      if (next.length >= maxTags) break
      if (!allowDuplicates && next.includes(chunk)) continue
      next.push(chunk)
    }
    onTagsChange?.(next)
  }

  const chipSizes = {
    sm: "h-5 gap-1 rounded px-1.5 text-xs",
    md: "h-6 gap-1.5 rounded-md px-2 text-sm",
    lg: "h-7 gap-1.5 rounded-md px-2.5 text-sm",
  } as const

  const chipVariants = {
    default: "bg-primary/10 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-input text-foreground",
  } as const

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {normalized.map((tag, index) => (
        <span
          className={cn(
            "inline-flex items-center text-foreground select-none",
            chipSizes[tagSize],
            chipVariants[tagVariant]
          )}
          key={`${tag}-${index}`}
        >
          {tag}
          <button
            aria-label={`Remove ${tag}`}
            className="rounded-full opacity-60 transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              removeTag(index)
            }}
            type="button"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        aria-label="Add tag"
        className="h-6 min-w-[8ch] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        disabled={disabled || atLimit}
        id={id}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={atLimit ? "Limit reached" : placeholder}
        value={input}
      />
    </div>
  )
}
