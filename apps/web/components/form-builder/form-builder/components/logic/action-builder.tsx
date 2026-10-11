"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Target,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
  Copy,
  Variable,
  Calculator,
  Plus,
  Minus,
  Zap,
  ExternalLink,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { LogicAction, FormField, VariableDefinition } from "@repo/shared";
import {
  ValueReferencePicker,
  ActionTargetPicker,
} from "./value-reference-picker";
import {
  ACTION_TYPES,
  ACTION_CATEGORIES,
  VARIABLE_ACTION_TYPES,
  FIELD_ONLY_TARGET_TYPES,
  VALUE_REF_ACTION_TYPES,
  buildFieldLabels,
} from "./utils";

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ArrowRight,
  Eye,
  EyeOff,
  Target,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
  Copy,
  Variable,
  Calculator,
  Plus,
  Minus,
  Zap,
  ExternalLink,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActionBuilderProps {
  action: LogicAction;
  onChange: (action: LogicAction) => void;
  fields: FormField[];
  variables: VariableDefinition[];
  thankyouScreens: Array<{ ref?: string; title: string }>;
  outcomes: Array<{ id: string; title: string }>;
  groups: Array<{ id: string; ref?: string; title: string }>;
  fieldLabels: Record<string, string>;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionBuilder({
  action,
  onChange,
  fields,
  variables,
  thankyouScreens,
  outcomes,
  groups,
  fieldLabels,
  compact = true,
}: ActionBuilderProps) {
  const h = compact ? "h-7" : "h-8";

  const handleTypeChange = (newType: string) => {
    const defaultAction = createDefaultAction(newType, fields);
    onChange(defaultAction as LogicAction);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background p-3">
      {/* Action type selector */}
      <Select value={action.type} onValueChange={handleTypeChange}>
        <SelectTrigger className={`${h} text-xs`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_CATEGORIES.flatMap((cat) => {
            const items = ACTION_TYPES.filter((a) => a.category === cat);
            return items.map((at) => (
              <SelectItem key={at.type} value={at.type}>
                {at.label}
              </SelectItem>
            ));
          })}
        </SelectContent>
      </Select>

      {/* Type-specific editors */}
      <ActionTypeEditor
        action={action}
        onChange={onChange}
        fields={fields}
        variables={variables}
        thankyouScreens={thankyouScreens}
        outcomes={outcomes}
        groups={groups}
        fieldLabels={fieldLabels}
        compact={compact}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type-specific editor
// ---------------------------------------------------------------------------

function ActionTypeEditor({
  action,
  onChange,
  fields,
  variables,
  thankyouScreens,
  outcomes,
  groups,
  fieldLabels,
  compact,
}: ActionBuilderProps) {
  const h = compact ? "h-7" : "h-8";

  // --- jump (full ActionTarget) ---
  if (action.type === "jump") {
    return (
      <ActionTargetPicker
        target={action.target}
        onChange={(target) => onChange({ ...action, target: target as any })}
        fields={fields}
        thankyouScreens={thankyouScreens}
        outcomes={outcomes}
        groups={groups}
        fieldLabels={fieldLabels}
        compact={compact}
      />
    );
  }

  // --- skip_group ---
  if (action.type === "skip_group") {
    return (
      <Select
        value={action.target.ref}
        onValueChange={(ref) =>
          onChange({ ...action, target: { type: "group", ref } })
        }
      >
        <SelectTrigger className={`${h} text-xs`}>
          <SelectValue placeholder="Select group to skip" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.ref ?? g.id}>
              {g.title || g.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // --- show/hide group ---
  if (action.type === "show_group" || action.type === "hide_group") {
    return (
      <Select
        value={action.target.ref}
        onValueChange={(ref) =>
          onChange({ ...action, target: { type: "group", ref } })
        }
      >
        <SelectTrigger className={`${h} text-xs`}>
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
    );
  }

  // --- Field-only target types ---
  if (FIELD_ONLY_TARGET_TYPES.has(action.type)) {
    const a = action as { type: string; target: { type: string; ref: string } };
    return (
      <Select
        value={a.target.ref}
        onValueChange={(ref) =>
          onChange({ ...a, target: { type: "field", ref } } as any)
        }
      >
        <SelectTrigger className={`${h} text-xs`}>
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.ref} value={f.ref ?? ""}>
              {fieldLabels[f.ref ?? ""] || f.title || f.ref}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // --- set_value / clear_value ---
  if (action.type === "set_value" || action.type === "clear_value") {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-muted-foreground">Target:</span>
        <ActionTargetPicker
          target={action.target}
          onChange={(target) => onChange({ ...action, target: target as any })}
          fields={fields}
          thankyouScreens={thankyouScreens}
          outcomes={outcomes}
          groups={groups}
          fieldLabels={fieldLabels}
          compact={compact}
        />
        {action.type === "set_value" && (
          <>
            <span className="text-[11px] text-muted-foreground">Value:</span>
            <ValueReferencePicker
              value={action.value}
              onChange={(value) => onChange({ ...action, value })}
              fields={fields}
              variables={variables}
              fieldLabels={fieldLabels}
              compact
            />
          </>
        )}
      </div>
    );
  }

  // --- copy_value ---
  if (action.type === "copy_value") {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-muted-foreground">From:</span>
        <ValueReferencePicker
          value={action.source}
          onChange={(source) => onChange({ ...action, source })}
          fields={fields}
          variables={variables}
          fieldLabels={fieldLabels}
          compact
        />
        <span className="text-[11px] text-muted-foreground">To:</span>
        <ActionTargetPicker
          target={action.target}
          onChange={(target) => onChange({ ...action, target: target as any })}
          fields={fields}
          thankyouScreens={thankyouScreens}
          outcomes={outcomes}
          groups={groups}
          fieldLabels={fieldLabels}
          compact={compact}
        />
      </div>
    );
  }

  // --- Variable operations with value ---
  if (VARIABLE_ACTION_TYPES.has(action.type) && VALUE_REF_ACTION_TYPES.has(action.type)) {
    const a = action as { type: string; target: string; value: any };
    const labels: Record<string, string> = {
      set_variable: "Set",
      add_variable: "Add",
      subtract_variable: "Subtract",
      multiply_variable: "Multiply by",
      divide_variable: "Divide by",
    };
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-muted-foreground">
          {labels[a.type] || "Value for"} variable:
        </span>
        <Select
          value={a.target}
          onValueChange={(target) => onChange({ ...a, target } as any)}
        >
          <SelectTrigger className={`${h} text-xs`}>
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
        <ValueReferencePicker
          value={a.value}
          onChange={(value) => onChange({ ...a, value } as any)}
          fields={fields}
          variables={variables}
          fieldLabels={fieldLabels}
          compact
        />
      </div>
    );
  }

  // --- increment / decrement_variable ---
  if (action.type === "increment_variable" || action.type === "decrement_variable") {
    const a = action as { type: string; target: string };
    return (
      <Select
        value={a.target}
        onValueChange={(target) => onChange({ ...a, target } as any)}
      >
        <SelectTrigger className={`${h} text-xs`}>
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
    );
  }

  // --- end_form ---
  if (action.type === "end_form") {
    return (
      <Select
        value={action.target?.ref ?? "__default"}
        onValueChange={(ref) =>
          onChange({
            ...action,
            target: ref === "__default" ? undefined : { type: "thankyou", ref },
          })
        }
      >
        <SelectTrigger className={`${h} text-xs`}>
          <SelectValue placeholder="Optional: select end screen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__default">Default thank-you</SelectItem>
          {thankyouScreens.map((s) => (
            <SelectItem key={s.ref} value={s.ref ?? ""}>
              {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // --- redirect ---
  if (action.type === "redirect") {
    return (
      <Input
        className={`${h} text-xs`}
        placeholder="https://example.com/thank-you"
        value={action.url}
        onChange={(e) => onChange({ ...action, url: e.target.value })}
      />
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Default action factory
// ---------------------------------------------------------------------------

function createDefaultAction(type: string, fields: FormField[]): Record<string, unknown> {
  const firstFieldRef = fields[0]?.ref ?? "";

  switch (type) {
    case "jump":
      return { type: "jump", target: { type: "field", ref: firstFieldRef } };
    case "skip_field":
      return { type: "skip_field", target: { type: "field", ref: firstFieldRef } };
    case "skip_group":
      return { type: "skip_group", target: { type: "group", ref: "" } };
    case "show_field":
      return { type: "show_field", target: { type: "field", ref: firstFieldRef } };
    case "hide_field":
      return { type: "hide_field", target: { type: "field", ref: firstFieldRef } };
    case "show_group":
      return { type: "show_group", target: { type: "group", ref: "" } };
    case "hide_group":
      return { type: "hide_group", target: { type: "group", ref: "" } };
    case "make_required":
      return { type: "make_required", target: { type: "field", ref: firstFieldRef } };
    case "make_optional":
      return { type: "make_optional", target: { type: "field", ref: firstFieldRef } };
    case "enable_field":
      return { type: "enable_field", target: { type: "field", ref: firstFieldRef } };
    case "disable_field":
      return { type: "disable_field", target: { type: "field", ref: firstFieldRef } };
    case "set_value":
      return { type: "set_value", target: { type: "field", ref: firstFieldRef }, value: { type: "constant", value: "" } };
    case "clear_value":
      return { type: "clear_value", target: { type: "field", ref: firstFieldRef } };
    case "copy_value":
      return { type: "copy_value", source: { type: "field", ref: firstFieldRef }, target: { type: "field", ref: "" } };
    case "set_variable":
      return { type: "set_variable", target: "", value: { type: "constant", value: "" } };
    case "add_variable":
      return { type: "add_variable", target: "", value: { type: "constant", value: 0 } };
    case "subtract_variable":
      return { type: "subtract_variable", target: "", value: { type: "constant", value: 0 } };
    case "multiply_variable":
      return { type: "multiply_variable", target: "", value: { type: "constant", value: 1 } };
    case "divide_variable":
      return { type: "divide_variable", target: "", value: { type: "constant", value: 1 } };
    case "increment_variable":
      return { type: "increment_variable", target: "" };
    case "decrement_variable":
      return { type: "decrement_variable", target: "" };
    case "end_form":
      return { type: "end_form" };
    case "redirect":
      return { type: "redirect", url: "" };
    default:
      return { type: "jump", target: { type: "field", ref: "" } };
  }
}
