"use client";

import { Check, Target } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FieldProperties, FormField } from "@repo/shared";

interface QuizFieldSettingsProps {
	field: FormField;
	onUpdateSettings: (settings: Partial<FieldProperties>) => void;
}

const ANSWER_TYPES = new Set([
	"multiple_choice",
	"checkbox",
	"dropdown",
	"picture_choice",
	"yes_no",
	"rating",
	"nps",
	"opinion_scale",
]);

/**
 * Quiz scoring for a single question. Writes the field-level keys the quiz
 * scorer reads (`isQuizField`, `correctAnswer`, `points`, `explanation`) so the
 * result screen can actually score answers.
 */
export function QuizFieldSettings({ field, onUpdateSettings }: QuizFieldSettingsProps) {
	const props = (field.properties ?? {}) as FieldProperties & {
		isQuizField?: boolean;
		correctAnswer?: string | string[];
		points?: number;
		explanation?: string;
	};

	const enabled = props.isQuizField ?? false;
	const choices = (field.properties?.choices ?? []).filter((c) => c && c.label);
	const optionValue = (choice: { ref?: string; label: string }) => choice.ref ?? choice.label;

	const correctList: string[] = Array.isArray(props.correctAnswer)
		? props.correctAnswer
		: props.correctAnswer
			? [props.correctAnswer]
			: [];

	const supportsChoices = choices.length > 0 && ANSWER_TYPES.has(field.type);

	const toggleCorrect = (value: string) => {
		const next = correctList.includes(value)
			? correctList.filter((v) => v !== value)
			: [...correctList, value];
		onUpdateSettings({ correctAnswer: next });
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<Label className="font-medium text-sm">Use for scoring</Label>
					<p className="text-muted-foreground text-xs">
						Count this answer towards the respondent&apos;s score
					</p>
				</div>
				<Switch
					checked={enabled}
					onCheckedChange={(checked) =>
						onUpdateSettings({
							isQuizField: checked,
							...(checked ? { points: props.points ?? 1 } : {}),
						})
					}
				/>
			</div>

			{enabled && (
				<>
					<div className="flex flex-col gap-2">
						<Label className="flex items-center gap-1.5 font-medium text-sm">
							<Target className="size-3.5" />
							Correct answer
						</Label>

						{supportsChoices ? (
							<div className="flex flex-col gap-1">
								{choices.map((choice) => {
									const value = optionValue(choice);
									const active = correctList.includes(value);
									return (
										<button
											className={cn(
												"flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors",
												active
													? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
													: "border-border text-muted-foreground hover:bg-muted/60",
											)}
											key={value}
											onClick={() => toggleCorrect(value)}
											type="button"
										>
											<span
												className={cn(
													"flex size-4 shrink-0 items-center justify-center rounded border",
													active
														? "border-emerald-500 bg-emerald-500 text-white"
														: "border-border",
												)}
											>
												{active && <Check className="size-3" />}
											</span>
											<span className="truncate">{choice.label}</span>
										</button>
									);
								})}
							</div>
						) : (
							<Input
								onChange={(e) => onUpdateSettings({ correctAnswer: e.target.value })}
								placeholder="The expected answer"
								value={typeof props.correctAnswer === "string" ? props.correctAnswer : ""}
							/>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<Label className="font-medium text-sm">Points</Label>
						<Input
							min={1}
							onChange={(e) =>
								onUpdateSettings({
									points: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
								})
							}
							type="number"
							value={props.points ?? 1}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="font-medium text-sm">
							Explanation <span className="text-muted-foreground">(optional)</span>
						</Label>
						<Input
							onChange={(e) => onUpdateSettings({ explanation: e.target.value })}
							placeholder="Shown with the answer after submitting"
							value={props.explanation ?? ""}
						/>
					</div>
				</>
			)}
		</div>
	);
}
