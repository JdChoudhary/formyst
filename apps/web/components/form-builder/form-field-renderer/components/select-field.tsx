"use client";

import React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import type { BaseFieldProps } from "../types";

import { applyBuilderMode, getAnswerInputClasses, getBuilderMode } from "../utils";

export function SelectField(props: BaseFieldProps) {
	const { field, value, onChange, error, disabled } = props;
	const builderMode = getBuilderMode(props);
	const errorClasses = getAnswerInputClasses(error);

	const options = field.properties?.choices ?? [];

	const getPlaceholder = () => "Select an option...";

	const handleValueChange = (newValue: string) => {
		onChange(newValue);
	};

	const renderSelectField = () => {
		const selectProps = applyBuilderMode(
			{
				disabled,
				onValueChange: handleValueChange,
				value: value || "",
			},
			builderMode
		);

		const selectTriggerProps = applyBuilderMode(
			{
				className: errorClasses,
				disabled,
			},
			builderMode
		);

		return (
			<Select {...selectProps}>
				<SelectTrigger
					{...selectTriggerProps}
					className="h-12 w-full pr-8 text-lg"
				>
					<SelectValue placeholder={getPlaceholder()} />
				</SelectTrigger>
				<SelectContent>
					{options
						.filter((option) => option.label.trim() !== "")
						.map((option, index) => (
							<SelectItem
								key={index}
								value={option.ref ?? option.label}
							>
								{option.label}
							</SelectItem>
						))}
				</SelectContent>
			</Select>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className={builderMode ? "pointer-events-none" : ""}>
				{renderSelectField()}
			</div>
			{error && (
				<div
					aria-live="polite"
					className="rounded-md bg-destructive/10 p-3 text-destructive text-sm"
					role="alert"
				>
					{error}
				</div>
			)}
		</div>
	);
}
