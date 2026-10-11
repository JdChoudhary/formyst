import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldSettingsProps } from "./types";

export function NpsFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					NPS Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="nps-left-label">
						Left Label (0)
					</Label>
					<Input
						aria-describedby="nps-left-label-help"
						autoComplete="off"
						id="nps-left-label"
						name="nps-left-label"
						onChange={(e) =>
							onUpdateSettings({
								labels: {
									...(field.properties?.labels ?? {}),
									left: e.target.value || "Not likely",
								},
							})
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Not likely"
						type="text"
						value={field.properties?.labels?.left || "Not likely"}
					/>
					<p className="text-muted-foreground text-xs" id="nps-left-label-help">
						Label shown at the low end of the scale
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="nps-right-label">
						Right Label (10)
					</Label>
					<Input
						aria-describedby="nps-right-label-help"
						autoComplete="off"
						id="nps-right-label"
						name="nps-right-label"
						onChange={(e) =>
							onUpdateSettings({
								labels: {
									...(field.properties?.labels ?? {}),
									right: e.target.value || "Extremely likely",
								},
							})
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Extremely likely"
						type="text"
						value={field.properties?.labels?.right || "Extremely likely"}
					/>
					<p className="text-muted-foreground text-xs" id="nps-right-label-help">
						Label shown at the high end of the scale
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
