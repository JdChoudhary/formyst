"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { BaseFieldProps } from "../types";

import { getBuilderMode } from "../utils";

export function CheckboxField(props: BaseFieldProps) {
	const { field, value, onChange, error, disabled } = props;
	const builderMode = getBuilderMode(props);
	const fieldId = field.ref ?? "field";

	const options = field.properties?.choices ?? [];

	const getOptionValue = (option: { ref?: string; label: string }): string =>
		option.ref ?? option.label;

	const currentValues: string[] = Array.isArray(value) ? value : [];

	const toggleOption = (optionValue: string) => {
		if (currentValues.includes(optionValue)) {
			onChange(currentValues.filter((v: string) => v !== optionValue));
		} else {
			onChange([...currentValues, optionValue]);
		}
	};

	const renderCheckboxOptions = () => {
		return (
			<Card className="border-0 p-0 shadow-none">
				<CardContent className="p-0">
					<div className="flex flex-col gap-2.5">
						{options.map((option, index) => {
							const optionValue = getOptionValue(option);
							const isChecked = currentValues.includes(optionValue);

							return (
								<div
									aria-checked={isChecked}
									className={cn(
										"flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all",
										isChecked
											? "border-primary/60 bg-primary/5"
											: "border-border hover:border-foreground/25 hover:bg-accent/50",
										disabled && "cursor-not-allowed opacity-60",
									)}
									key={index}
									onClick={() => {
										if (!disabled) toggleOption(optionValue);
									}}
									role="checkbox"
									tabIndex={disabled ? -1 : 0}
									onKeyDown={(e) => {
										if (!disabled && (e.key === "Enter" || e.key === " ")) {
											e.preventDefault();
											toggleOption(optionValue);
										}
									}}
								>
									<Checkbox
										checked={isChecked}
										className="pointer-events-none mt-0"
										disabled={disabled}
									/>
									<Label className="flex flex-1 cursor-pointer items-center py-1 font-medium text-[15px]">
										{option.label}
									</Label>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className={builderMode ? "pointer-events-none" : ""}>
				{renderCheckboxOptions()}
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
