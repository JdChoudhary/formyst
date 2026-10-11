import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldSettingsProps } from "./types";

export function NumberFieldSettings({
	field,
	onFieldUpdate,
}: FieldSettingsProps) {
	const updateValidations = (updates: Record<string, number | undefined>) => {
		onFieldUpdate({
			...field,
			validations: { ...field.validations, ...updates },
		});
	};

	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Number Field Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="number-min">
						Minimum Value
					</Label>
					<Input
						aria-describedby="number-min-help"
						autoComplete="off"
						id="number-min"
						name="number-min"
						onChange={(e) =>
							updateValidations({
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
					<p className="text-muted-foreground text-xs" id="number-min-help">
						Minimum numeric value allowed
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="number-max">
						Maximum Value
					</Label>
					<Input
						aria-describedby="number-max-help"
						autoComplete="off"
						id="number-max"
						name="number-max"
						onChange={(e) =>
							updateValidations({
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
					<p className="text-muted-foreground text-xs" id="number-max-help">
						Maximum numeric value allowed
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
