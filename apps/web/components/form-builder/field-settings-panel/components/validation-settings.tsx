import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { FormField, Validations } from "@repo/shared";

interface ValidationSettingsProps {
	field: FormField;
	onUpdateValidation: (updates: Partial<Validations>) => void;
}

export function ValidationSettings({
	field,
	onUpdateValidation,
}: ValidationSettingsProps) {
	const isTextType = ["short_text", "email", "long_text"].includes(field.type);
	const isNumberType = field.type === "number";

	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Validation
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				{/* Required toggle — always shown */}
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<Label className="font-medium text-sm">Required field</Label>
						<p className="text-muted-foreground text-xs">
							Users must fill this field to submit the form
						</p>
					</div>
					<Switch
						checked={field.validations?.required ?? false}
						onCheckedChange={(required) => onUpdateValidation({ required })}
					/>
				</div>

				{isTextType && (
					<div className="flex flex-col gap-2">
						<Label className="font-medium text-sm" htmlFor="max-length">
							Maximum Length
						</Label>
						<Input
							aria-describedby="max-length-help"
							autoComplete="off"
							id="max-length"
							name="max-length"
							onChange={(e) =>
								onUpdateValidation({
									max_length:
										Number.parseInt(e.target.value, 10) || undefined,
								})
							}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									e.currentTarget.blur();
								}
							}}
							placeholder="No maximum"
							type="number"
							value={field.validations?.max_length || ""}
						/>
						<p className="text-muted-foreground text-xs" id="max-length-help">
							Maximum number of characters allowed
						</p>
					</div>
				)}

				{isNumberType && (
					<>
						<div className="flex flex-col gap-2">
							<Label className="font-medium text-sm" htmlFor="min-value">
								Minimum Value
							</Label>
							<Input
								aria-describedby="min-value-help"
								autoComplete="off"
								id="min-value"
								name="min-value"
								onChange={(e) =>
									onUpdateValidation({
										min_value: Number.parseFloat(e.target.value) || undefined,
									})
								}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										e.currentTarget.blur();
									}
								}}
								placeholder="No minimum"
								type="number"
								value={field.validations?.min_value ?? ""}
							/>
							<p className="text-muted-foreground text-xs" id="min-value-help">
								Minimum numeric value allowed
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<Label className="font-medium text-sm" htmlFor="max-value">
								Maximum Value
							</Label>
							<Input
								aria-describedby="max-value-help"
								autoComplete="off"
								id="max-value"
								name="max-value"
								onChange={(e) =>
									onUpdateValidation({
										max_value: Number.parseFloat(e.target.value) || undefined,
									})
								}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										e.currentTarget.blur();
									}
								}}
								placeholder="No maximum"
								type="number"
								value={field.validations?.max_value ?? ""}
							/>
							<p className="text-muted-foreground text-xs" id="max-value-help">
								Maximum numeric value allowed
							</p>
						</div>
					</>
				)}				</CardContent>
		</Card>
	);
}
