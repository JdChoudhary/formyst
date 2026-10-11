"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import type { BaseFieldProps } from "../types";

import { applyBuilderMode, getBuilderMode, getErrorClasses } from "../utils";

export function SelectField(props: BaseFieldProps) {
	const { field, value, onChange, error, disabled } = props;
	const builderMode = getBuilderMode(props);
	const errorClasses = getErrorClasses(error);

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
			<Card className="border-0 p-0 shadow-none">
				<CardContent className="p-0">
					<Select {...selectProps}>
						<SelectTrigger
							{...selectTriggerProps}
							className="h-12"
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
				</CardContent>
			</Card>
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
