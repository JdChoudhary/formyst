import type React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FormField } from "@/lib";
import { safeRegexTest } from "@/lib/utils/safe-regex";
import type { BaseFieldProps } from "../types";
import { applyBuilderMode, getBaseClasses, getBuilderMode } from "../utils";

export function getLivePatternError(field: FormField, value: string) {
	const pattern = field.properties?.regexp;
	if (pattern && value && !safeRegexTest(pattern, value)) {
		return "Invalid format";
	}
	return "";
}

export function TextInputField(props: BaseFieldProps) {
	const { field, value, onChange, error, fieldRef, disabled } = props;
	const baseClasses = getBaseClasses(field, error);
	const livePatternError = getLivePatternError(field, value);
	const builderMode = getBuilderMode(props);
	const fieldId = field.ref ?? "field";

	const inputProps = applyBuilderMode(
		{
			className: cn(baseClasses, "h-12 rounded-xl px-4 text-base"),
			disabled,
			id: fieldId,
			name: fieldId,
			autoComplete: "off",
			onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
				onChange(e.target.value),
			placeholder: (field.properties?.placeholder as string) || "Type your answer...",
			onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
				if (e.key === "Escape") {
					e.currentTarget.blur();
				}
			},
			ref: fieldRef,
			type: "text",
			value: value || "",
		},
		builderMode
	);

	return (
		<div className="flex flex-col gap-2">
			<Input {...inputProps} />
			{livePatternError && (
				<div
					aria-live="polite"
					className="text-destructive text-xs"
					role="alert"
				>
					{livePatternError}
				</div>
			)}
		</div>
	);
}
