import type React from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { BaseFieldProps } from "../types";

import { applyBuilderMode, getBaseClasses, getBuilderMode } from "../utils";

export function TextareaField(props: BaseFieldProps) {
	const { field, value, onChange, error, fieldRef, disabled } = props;
	const baseClasses = getBaseClasses(field, error);
	const builderMode = getBuilderMode(props);

	const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Escape") {
			e.currentTarget.blur();
		}
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			e.currentTarget.blur();
		}
	};

	const textareaProps = applyBuilderMode(
		{
			className: cn(baseClasses, "rounded-xl px-4 py-3 text-base"),
			disabled,
			id: field.ref,
			name: field.ref,
			autoComplete: "off",
			onChange: handleValueChange,
			onKeyDown: handleKeyDown,
			placeholder: (field.properties?.placeholder as string) || "Write your answer...",
			ref: fieldRef,
			rows: 4,
			value: value || "",
		},
		builderMode
	);

	return (
		<div className="flex flex-col gap-2">
			<Textarea {...textareaProps} />
		</div>
	);
}
