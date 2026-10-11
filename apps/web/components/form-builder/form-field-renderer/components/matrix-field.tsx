import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";

export function MatrixField({ field, value, onChange, disabled, fieldRef }: BaseFieldProps) {
  const rows = (((field.properties as any)?.rows ?? []) as Array<{ id: string; label: string }>);
  const columns = (((field.properties as any)?.columns ?? []) as Array<{ id: string; label: string }>);
  const multiple = !!field.properties?.allow_multiple_selection;
  const current: Record<string, unknown> = value && typeof value === "object" ? value : {};

  const toggle = (rowId: string, colId: string) => {
    if (multiple) {
      const existing: string[] = Array.isArray(current[rowId]) ? (current[rowId] as string[]) : [];
      const next = existing.includes(colId)
        ? existing.filter((id) => id !== colId)
        : [...existing, colId];
      onChange({ ...current, [rowId]: next });
    } else {
      onChange({ ...current, [rowId]: current[rowId] === colId ? "" : colId });
    }
  };

  if (rows.length === 0 || columns.length === 0) return null;

  return (
    <div className="overflow-x-auto" ref={fieldRef}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left font-medium text-muted-foreground" />
            {columns.map((column) => (
              <th className="p-2 text-center font-medium text-muted-foreground" key={column.id}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-border" key={row.id}>
              <td className="p-2 font-medium">{row.label}</td>
              {columns.map((column) => {
                const rowValue = current[row.id];
                const active = multiple
                  ? Array.isArray(rowValue) && rowValue.includes(column.id)
                  : rowValue === column.id;
                return (
                  <td className="p-2 text-center" key={column.id}>
                    <button
                      aria-label={`${row.label}: ${column.label}`}
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-md border transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/60",
                        multiple && active && "rounded-sm",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                      disabled={disabled}
                      onClick={() => toggle(row.id, column.id)}
                      type="button"
                    >
                      {multiple && active ? "✓" : active ? "•" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
