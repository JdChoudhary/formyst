import { Label } from "@/components/ui/label";

import type { BaseFieldProps } from "../types";

import { createFieldComponent } from "../utils/fieldFactory";

export function FieldGroupField({
	field,
	value,
	onChange,
	error,
	disabled,
	formId,
}: BaseFieldProps) {
	const groupFields = field.properties?.fields ?? [];

	const getContainerClassName = () => "grid grid-cols-1 gap-4 md:grid-cols-2";

	const getFieldValue = (fieldRef: string) => value?.[fieldRef];

	const getFieldError = (fieldRef: string) => {
		if (typeof error === "object" && error !== null && fieldRef in error) {
			return (error as Record<string, string | undefined>)[fieldRef];
		}
		return;
	};

	const handleGroupFieldChange = (fieldRef: string, fieldValue: any) => {
		const currentValues = value || {};
		onChange({
			...currentValues,
			[fieldRef]: fieldValue,
		});
	};

	const renderGroupFieldLabel = (groupField: any) => {
		if (!groupField.title) return null;

		return (
			<Label className="font-medium text-foreground text-sm">
				{groupField.title}
				{groupField.validations?.required && (
					<span className="ml-1 text-destructive">*</span>
				)}
			</Label>
		);
	};

	const renderGroupField = (groupField: any) => {
		const fieldRef = groupField.ref ?? "";
		const fieldValue = getFieldValue(fieldRef);
		const fieldError = getFieldError(fieldRef);

		return (
			<div className="flex-1" key={fieldRef}>
				<div className="flex flex-col gap-2">
					{renderGroupFieldLabel(groupField)}
					{createFieldComponent(
						groupField,
						fieldValue,
						(fieldValue) => handleGroupFieldChange(fieldRef, fieldValue),
						fieldError,
						undefined,
						disabled,
						formId
					)}
				</div>
			</div>
		);
	};

	return (
		<div className={getContainerClassName()}>
			{groupFields.map(renderGroupField)}
		</div>
	);
}
