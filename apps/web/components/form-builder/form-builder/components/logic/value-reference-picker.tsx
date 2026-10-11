"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ValueReference, FormField, VariableDefinition } from "@repo/shared";

interface ValueReferencePickerProps {
  value: ValueReference | undefined;
  onChange: (val: ValueReference) => void;
  fields: FormField[];
  variables?: VariableDefinition[];
  fieldLabels?: Record<string, string>;
  /** Show the "score" option (for scoring/quiz forms). */
  showScore?: boolean;
  /** Show the "system" option. */
  showSystem?: boolean;
  /** Filter the source type dropdown to specific types only. */
  allowedTypes?: Array<"field" | "variable" | "constant" | "score" | "system">;
  /** Placeholder for the trigger input. */
  placeholder?: string;
  /** Smaller size variant. */
  compact?: boolean;
}

const TYPE_OPTIONS = [
  { value: "field", label: "Field answer" },
  { value: "variable", label: "Variable" },
  { value: "constant", label: "Fixed value" },
  { value: "score", label: "Score" },
  { value: "system", label: "System" },
] as const;

const SYSTEM_KEYS = [
  { value: "currentStep", label: "Current step" },
  { value: "currentPage", label: "Current page" },
  { value: "progress", label: "Progress" },
  { value: "submissionCount", label: "Submission count" },
] as const;

export function ValueReferencePicker({
  value,
  onChange,
  fields,
  variables = [],
  fieldLabels,
  showScore = false,
  showSystem = false,
  allowedTypes,
  placeholder,
  compact = false,
}: ValueReferencePickerProps) {
  const refType = value?.type ?? "constant";
  const h = compact ? "h-7" : "h-8";
  const text = compact ? "text-xs" : "text-xs";

  const availableTypes = TYPE_OPTIONS.filter((opt) => {
    if (allowedTypes) return allowedTypes.includes(opt.value as any);
    if (opt.value === "score") return showScore;
    if (opt.value === "system") return showSystem;
    return true;
  });

  return (
    <div className="flex flex-col gap-1.5">
      {/* Type selector */}
      <Select
        value={refType}
        onValueChange={(type) => {
          switch (type) {
            case "field":
              onChange({ type: "field", ref: "" });
              break;
            case "variable":
              onChange({ type: "variable", ref: "" });
              break;
            case "constant":
              onChange({ type: "constant", value: "" });
              break;
            case "score":
              onChange({ type: "score" });
              break;
            case "system":
              onChange({ type: "system", key: "currentStep" });
              break;
          }
        }}
      >
        <SelectTrigger className={`${h} ${text}`}>
          <SelectValue placeholder={placeholder ?? "Select source"} />
        </SelectTrigger>
        <SelectContent>
          {availableTypes.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sub-picker based on type */}
      {refType === "field" && (
        <Select
          value={value?.type === "field" ? value.ref : ""}
          onValueChange={(ref) => onChange({ type: "field", ref })}
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {fields
              .filter((f) => f.ref && f.type !== "statement")
              .map((f) => (
                <SelectItem key={f.ref} value={f.ref ?? ""}>
                  {fieldLabels?.[f.ref ?? ""] || f.title || f.ref}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {refType === "variable" && (
        <Select
          value={value?.type === "variable" ? value.ref : ""}
          onValueChange={(ref) => onChange({ type: "variable", ref })}
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue placeholder="Select variable" />
          </SelectTrigger>
          <SelectContent>
            {variables.map((v) => (
              <SelectItem key={v.key} value={v.key}>
                {v.key} ({v.type})
              </SelectItem>
            ))}
            {variables.length === 0 && (
              <SelectItem value="__none" disabled>
                No variables defined
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}

      {refType === "constant" && (
        <Input
          className={`${h} ${text}`}
          placeholder="Enter value"
          value={value?.type === "constant" ? String(value.value ?? "") : ""}
          onChange={(e) => {
            const raw = e.target.value;
            // Try to parse as number
            const num = Number(raw);
            const parsed = raw !== "" && !isNaN(num) ? num : raw;
            onChange({ type: "constant", value: parsed });
          }}
        />
      )}

      {refType === "system" && (
        <Select
          value={value?.type === "system" ? value.key : ""}
          onValueChange={(key) =>
            onChange({
              type: "system",
              key: key as "currentStep" | "currentPage" | "progress" | "submissionCount",
            })
          }
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue placeholder="Select system value" />
          </SelectTrigger>
          <SelectContent>
            {SYSTEM_KEYS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionTarget picker — for jump/skip/show/hide/etc. that need a target ref
// ---------------------------------------------------------------------------

interface ActionTargetPickerProps {
  target: { type: string; ref: string };
  onChange: (target: { type: string; ref: string }) => void;
  fields: FormField[];
  thankyouScreens?: Array<{ ref?: string; title: string }>;
  outcomes?: Array<{ id: string; title: string }>;
  groups?: Array<{ id: string; ref?: string; title: string }>;
  fieldLabels?: Record<string, string>;
  /** Which target types to show. Defaults to all. */
  allowedTargetTypes?: Array<"field" | "group" | "thankyou" | "outcome">;
  compact?: boolean;
}

export function ActionTargetPicker({
  target,
  onChange,
  fields,
  thankyouScreens = [],
  outcomes = [],
  groups = [],
  fieldLabels,
  allowedTargetTypes,
  compact = false,
}: ActionTargetPickerProps) {
  const h = compact ? "h-7" : "h-8";
  const text = "text-xs";
  const showAll = !allowedTargetTypes || allowedTargetTypes.length > 1;

  return (
    <div className="flex flex-col gap-1.5">
      {showAll && (
        <Select
          value={target.type}
          onValueChange={(type) => onChange({ type, ref: "" })}
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(!allowedTargetTypes || allowedTargetTypes.includes("field")) && (
              <SelectItem value="field">Field</SelectItem>
            )}
            {(!allowedTargetTypes || allowedTargetTypes.includes("group")) && (
              <SelectItem value="group">Group</SelectItem>
            )}
            {(!allowedTargetTypes || allowedTargetTypes.includes("thankyou")) && (
              <SelectItem value="thankyou">Thank-you screen</SelectItem>
            )}
            {(!allowedTargetTypes || allowedTargetTypes.includes("outcome")) && (
              <SelectItem value="outcome">Outcome</SelectItem>
            )}
          </SelectContent>
        </Select>
      )}

      {target.type === "field" && (
        <Select
          value={target.ref}
          onValueChange={(ref) => onChange({ ...target, ref })}
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.ref} value={f.ref ?? ""}>
                {fieldLabels?.[f.ref ?? ""] || f.title || f.ref}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {target.type === "group" && (
        <Select
          value={target.ref}
          onValueChange={(ref) => onChange({ ...target, ref })}
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.ref ?? g.id}>
                {g.title || g.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {target.type === "thankyou" && (
        <Select
          value={target.ref}
          onValueChange={(ref) => onChange({ ...target, ref })}
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue placeholder="Select screen" />
          </SelectTrigger>
          <SelectContent>
            {thankyouScreens.map((s) => (
              <SelectItem key={s.ref} value={s.ref ?? ""}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {target.type === "outcome" && (
        <Select
          value={target.ref}
          onValueChange={(ref) => onChange({ ...target, ref })}
        >
          <SelectTrigger className={`${h} ${text}`}>
            <SelectValue placeholder="Select outcome" />
          </SelectTrigger>
          <SelectContent>
            {outcomes.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
