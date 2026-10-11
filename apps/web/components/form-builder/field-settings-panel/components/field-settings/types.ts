import type { FieldProperties, FormField } from "@repo/shared";

export interface FieldSettingsProps {
	field: FormField;
	onUpdateSettings: (updates: Partial<FieldProperties>) => void;
	onFieldUpdate: (field: FormField) => void;
}
