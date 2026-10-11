"use client"

import { Clock3, TimerReset } from "lucide-react"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  error?: boolean
  className?: string
  showCurrentTimeButton?: boolean
  id?: string
}

function to24Hour(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 % 12
  return (hour12 % 12) + 12
}

function to12Hour(hour24: number): { hour: number; period: "AM" | "PM" } {
  const h = hour24 % 24
  const period: "AM" | "PM" = h < 12 ? "AM" : "PM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { hour: hour12, period }
}

export function TimePicker({
  value,
  onChange,
  disabled,
  error,
  className,
  showCurrentTimeButton = true,
  id,
}: TimePickerProps) {
  const parsed = useMemo(() => {
    const match = typeof value === "string" ? value.match(/^(\d{1,2}):(\d{2})$/) : null
    if (match) {
      const hour24 = Number.parseInt(match[1], 10)
      const minute = Number.parseInt(match[2], 10)
      return { hour24, minute, ...to12Hour(hour24) }
    }
    return { hour24: 12, minute: 0, hour: 12, period: "AM" as const }
  }, [value])

  const emit = (hour24: number, minute: number) => {
    const next = `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    onChange?.(next)
  }

  const setHour = (hour12: number) => {
    emit(to24Hour(hour12, parsed.period), parsed.minute)
  }

  const setMinute = (minute: number) => {
    emit(parsed.hour24, minute)
  }

  const setPeriod = (period: "AM" | "PM") => {
    emit(to24Hour(parsed.hour, period), parsed.minute)
  }

  const setNow = () => {
    const now = new Date()
    emit(now.getHours(), now.getMinutes())
  }

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

  const selectClass = cn(
    "h-9 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
    error && "border-destructive"
  )

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
      <div className="flex items-center gap-1">
        <select
          aria-label="Hour"
          className={cn(selectClass, "border-0 bg-transparent dark:bg-transparent focus-visible:ring-0")}
          disabled={disabled}
          id={id}
          onChange={(e) => setHour(Number.parseInt(e.target.value, 10))}
          value={parsed.hour}
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="text-muted-foreground">:</span>
        <select
          aria-label="Minute"
          className={cn(selectClass, "border-0 bg-transparent dark:bg-transparent focus-visible:ring-0")}
          disabled={disabled}
          onChange={(e) => setMinute(Number.parseInt(e.target.value, 10))}
          value={parsed.minute}
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          aria-label="Period"
          className={cn(selectClass, "border-0 bg-transparent dark:bg-transparent focus-visible:ring-0")}
          disabled={disabled}
          onChange={(e) => setPeriod(e.target.value as "AM" | "PM")}
          value={parsed.period}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      {showCurrentTimeButton && (
        <button
          aria-label="Use current time"
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
          onClick={setNow}
          type="button"
        >
          <TimerReset aria-hidden="true" className="size-3.5" />
          Now
        </button>
      )}
    </div>
  )
}
