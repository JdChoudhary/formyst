import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldSettingsProps } from "./types";

export function ShortTextFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Short Text Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="text-pattern">
						Pattern (Regex)
					</Label>
					<Input
						aria-describedby="text-pattern-help"
						autoComplete="off"
						id="text-pattern"
						name="text-pattern"
						onChange={(e) =>
							onUpdateSettings({
								regexp: e.target.value || undefined,
							})
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="No pattern"
						type="text"
						value={field.properties?.regexp || ""}
					/>
					<p className="text-muted-foreground text-xs" id="text-pattern-help">
						Custom regex pattern for validation
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
