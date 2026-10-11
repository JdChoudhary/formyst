import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Base textarea — a lighter variant of the standard textarea used by the
 * form field renderer so field-level styling (size/variant classes) applies
 * on top without fighting the default chrome.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea-base"
      className={cn(
        "flex field-sizing-content min-h-14 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
