"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { BaseFieldProps } from "../types";

import { getBuilderMode, getErrorRingClasses } from "../utils";

export function RadioField(props: BaseFieldProps) {
	const { field, value, onChange, error, disabled } = props;
	const builderMode = getBuilderMode(props);
	const errorRingClasses = getErrorRingClasses(error);

	const fieldId = field.ref ?? "field";
	const labelId = `${fieldId}-label`;
	const descId = `${fieldId}-description`;
	const errorId = `${fieldId}-error`;

	const options = field.properties?.choices ?? [];
	const description = field.properties?.description;

	const getOptionValue = (option: { ref?: string; label: string }): string =>
		option.ref ?? option.label;

	// The group wrapper stays bare on purpose: every option draws its own border,
	// so wrapping the set in a Card would add a second, redundant box around it.
	const renderRadioOptions = () => {
		return (
			<RadioGroup
				aria-describedby={
					`${error ? errorId : ""}${description ? (error ? " " : "") + descId : ""}` ||
					undefined
				}
				aria-labelledby={field.title ? labelId : undefined}
				className={`flex flex-col gap-2.5 ${errorRingClasses}`}
				disabled={disabled}
				onValueChange={(next) => {
					if (!disabled) onChange(next);
				}}
				value={value || ""}
			>
				{options.map((option, index) => {
					const optionValue = getOptionValue(option);
					if (!optionValue) return null;
					const isSelected = (value || "") === optionValue;

					return (
						<div
							aria-checked={isSelected}
							className={cn(
								"flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all",
								isSelected
									? "border-primary/60 bg-primary/5"
									: "border-border hover:border-foreground/25 hover:bg-accent/50",
								disabled && "cursor-not-allowed opacity-60",
							)}
							key={index}
							onClick={() => {
								if (!disabled) onChange(optionValue);
							}}
							role="radio"
							tabIndex={disabled ? -1 : 0}
							onKeyDown={(e) => {
								if (!disabled && (e.key === "Enter" || e.key === " ")) {
									e.preventDefault();
									onChange(optionValue);
								}
							}}
						>
							<RadioGroupItem className="mt-0" value={optionValue} />
							<Label className="flex flex-1 cursor-pointer items-center py-1 font-medium text-[15px]">
								{option.label}
							</Label>
						</div>
					);
				})}
			</RadioGroup>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className={builderMode ? "pointer-events-none" : ""}>
				{renderRadioOptions()}
			</div>
			{error && (
				<div
					aria-live="polite"
					className="rounded-md bg-destructive/10 p-3 text-destructive text-sm"
					id={errorId}
					role="alert"
				>
					{error}
				</div>
			)}
		</div>
	);
}

interface RadioFieldSkeletonProps {
	optionsCount?: number;
}

export function RadioFieldSkeleton({ optionsCount = 3 }: RadioFieldSkeletonProps) {
	return (
		<div className="flex flex-col gap-2">
			<Skeleton className="h-5 w-24" />
			<div className="flex flex-col gap-3">
				{Array.from({ length: optionsCount }).map((_, index) => (
					<div className="flex items-center gap-3" key={index}>
						<Skeleton className="size-4 rounded-full" />
						<Skeleton className="h-4 w-20" />
					</div>
				))}
			</div>
			<Skeleton className="h-4 w-32" />
		</div>
	);
}
