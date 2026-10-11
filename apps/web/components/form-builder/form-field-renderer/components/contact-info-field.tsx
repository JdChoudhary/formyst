import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BaseFieldProps } from "../types";

const FIELDS = [
  { key: "firstName", label: "First name", type: "text", autocomplete: "given-name" },
  { key: "lastName", label: "Last name", type: "text", autocomplete: "family-name" },
  { key: "email", label: "Email", type: "email", autocomplete: "email" },
  { key: "phone", label: "Phone", type: "tel", autocomplete: "tel" },
  { key: "company", label: "Company", type: "text", autocomplete: "organization" },
  { key: "address", label: "Address", type: "text", autocomplete: "street-address" },
] as const;

export function ContactInfoField({ field, value, onChange, disabled, fieldRef }: BaseFieldProps) {
  const settings = (field.properties ?? {}) as Record<string, boolean | undefined>;
  const current: Record<string, string> = value && typeof value === "object" ? value : {};

  const update = (key: string, newValue: string) => {
    onChange({ ...current, [key]: newValue });
  };

  const visible = FIELDS.filter(({ key }) => settings[key] !== false);

  return (
    <div className="grid gap-4 sm:grid-cols-2" ref={fieldRef}>
      {visible.map(({ key, label, type, autocomplete }) => (
        <div className="flex flex-col gap-1.5" key={key}>
          <Label className="text-sm" htmlFor={`${field.ref}-${key}`}>
            {label}
          </Label>
          <Input
            autoComplete={autocomplete}
            disabled={disabled}
            id={`${field.ref}-${key}`}
            onChange={(event) => update(key, event.target.value)}
            type={type}
            value={current[key] ?? ""}
          />
        </div>
      ))}
    </div>
  );
}
