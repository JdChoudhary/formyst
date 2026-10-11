import { createOption, createRef } from "@repo/shared";
import type { Choice, FieldProperties, FormField, Validations } from "@repo/shared";

const stringifyOptions = (options: Choice[] | undefined): Choice[] => options ?? [];

export const getFieldOptionList = (field: FormField): Choice[] => {
	const raw = field.properties?.choices;
	return stringifyOptions(raw);
};

export const getFieldHelpers = (field: FormField) => ({
	hasOptions: ["multiple_choice", "checkbox", "dropdown", "picture_choice", "ranking"].includes(
		field.type
	),
	isTextType: ["short_text", "email"].includes(field.type),
	isNumberType: field.type === "number",
	isTextareaType: field.type === "long_text",
	isSelectType: field.type === "dropdown",
});

export const useFieldUpdates = (
	field: FormField | null,
	onFieldUpdate: (field: FormField) => void
) => {
	if (!field) {
		return {
			updateField: () => {},
			updateValidation: () => {},
			updateSettings: () => {},
		};
	}

	return {
		updateField: (updates: Partial<FormField>) => {
			onFieldUpdate({ ...field, ...updates } as FormField);
		},

		updateValidation: (validationUpdates: Partial<Validations>) => {
			onFieldUpdate({
				...field,
				validations: { ...field.validations, ...validationUpdates },
			} as FormField);
		},

		updateSettings: (settingsUpdates: Partial<FieldProperties>) => {
			onFieldUpdate({
				...field,
				properties: { ...field.properties, ...settingsUpdates },
			} as FormField);
		},
	};
};

export const createFieldUpdater = (
	field: FormField,
	onFieldUpdate: (field: FormField) => void
) => ({
	updateField: (updates: Partial<FormField>) => {
		onFieldUpdate({ ...field, ...updates } as FormField);
	},

	updateValidation: (validationUpdates: Partial<Validations>) => {
		onFieldUpdate({
			...field,
			validations: { ...field.validations, ...validationUpdates },
		} as FormField);
	},

	updateSettings: (settingsUpdates: Partial<FieldProperties>) => {
		onFieldUpdate({
			...field,
			properties: { ...field.properties, ...settingsUpdates },
		} as FormField);
	},
});

export const createOptionHandlers = (
	field: FormField,
	updateField: (updates: Partial<FormField>) => void
) => ({
	addOption: () => {
		const currentOptions = getFieldOptionList(field);
		const next = createOption(`Option ${currentOptions.length + 1}`);
		updateField({
			properties: {
				...(field.properties ?? {}),
				choices: [...currentOptions, next],
			},
		});
	},

	updateOption: (index: number, value: string) => {
		const newOptions = [...getFieldOptionList(field)];
		const trimmedValue = value.trim() || `Option ${index + 1}`;
		newOptions[index] = {
			...newOptions[index],
			ref: newOptions[index]?.ref ?? createRef(trimmedValue),
			label: trimmedValue,
		};
		updateField({
			properties: {
				...(field.properties ?? {}),
				choices: newOptions,
			},
		});
	},

	removeOption: (index: number) => {
		const newOptions = [...getFieldOptionList(field)];
		newOptions.splice(index, 1);
		updateField({
			properties: {
				...(field.properties ?? {}),
				choices: newOptions,
			},
		});
	},
});

export const formatFieldType = (type: string): string =>
	type.charAt(0).toUpperCase() + type.slice(1);
