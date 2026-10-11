import * as React from "react"

import { cn } from "@/lib/utils"

type SlotProps = {
  children?: React.ReactNode
  className?: string
  [key: string]: unknown
}

/**
 * Renders a single child element with the slot's props merged into it —
 * the same "asChild" composition pattern used by Radix/Base UI.
 *
 * Event handlers present on both the slot and the child are composed so both
 * run (matching Radix Slot semantics) — e.g. a trigger's onClick still fires
 * when the child button also provides its own onClick.
 */
const Slot = React.forwardRef<HTMLElement, SlotProps>(function Slot(
  props: SlotProps,
  forwardedRef
) {
  const { children, className, ...slotProps } = props

  if (!React.isValidElement(children)) {
    return null
  }

  const child = children as React.ReactElement<
    Record<string, unknown> & { ref?: React.Ref<unknown> }
  >

  // Merge props, but compose matching event handlers instead of letting the
  // child's prop silently replace the slot's.
  const merged: Record<string, unknown> = {
    ...slotProps,
    ...child.props,
  }
  for (const key of Object.keys(slotProps)) {
    if (!key.startsWith("on")) continue
    const slotHandler = slotProps[key]
    const childHandler = child.props[key]
    if (
      typeof slotHandler === "function" &&
      typeof childHandler === "function"
    ) {
      merged[key] = (...args: unknown[]) => {
        ;(slotHandler as (...a: unknown[]) => void)(...args)
        ;(childHandler as (...a: unknown[]) => void)(...args)
      }
    }
  }

  // React 19: `ref` is a regular prop on elements, so read it from
  // `child.props.ref` (the legacy `element.ref` accessor is deprecated).
  const childRef =
    forwardedRef ?? (child.props.ref as React.Ref<unknown> | undefined)

  return React.cloneElement(
    child,
    {
      ...merged,
      ref: childRef,
      className: cn(
        className as string | undefined,
        child.props.className as string | undefined
      ),
    } as Record<string, unknown> & { ref?: React.Ref<unknown> }
  )
})

export { Slot }
