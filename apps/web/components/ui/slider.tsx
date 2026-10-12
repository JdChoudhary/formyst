import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "cn"

type SliderValue = number | readonly number[]

const toValues = (value: SliderValue): number[] => {
  if (typeof value === "number") return [value]
  return Array.from(value)
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onValueChange,
  onValueCommitted,
  enableRangeDrag: _enableRangeDrag,
  ...props
}: Omit<
  SliderPrimitive.Root.Props,
  "value" | "defaultValue" | "onValueChange" | "onValueCommitted"
> & {
  value?: number | number[]
  defaultValue?: number | number[]
  onValueChange?: (value: number[]) => void
  onValueCommitted?: (value: number[]) => void
  /**
   * Accepted for API compatibility. Base UI 1.6 does not expose range-drag
   * support on the Slider root, so this is intentionally ignored.
   */
  enableRangeDrag?: boolean
}) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : typeof value === "number"
        ? [value]
        : typeof defaultValue === "number"
          ? [defaultValue]
          : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      onValueChange={
        onValueChange
          ? (next: SliderValue) => onValueChange(toValues(next))
          : undefined
      }
      onValueCommitted={
        onValueCommitted
          ? (next: SliderValue) => onValueCommitted(toValues(next))
          : undefined
      }
      {...props}
    >
      <SliderPrimitive.Control
        className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }

