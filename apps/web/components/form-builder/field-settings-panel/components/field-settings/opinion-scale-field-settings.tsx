import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function OpinionScaleFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Opinion Scale Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="scale-steps">
						Number of Steps
					</Label>
					<Input
						aria-describedby="scale-steps-help"
						autoComplete="off"
						id="scale-steps"
						min="5"
						max="11"
						name="scale-steps"
						onChange={(e) =>
							onUpdateSettings({
								steps: Number.parseInt(e.target.value, 10) || 5,
							})
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="5"
						type="number"
						value={field.properties?.steps || 5}
					/>
					<p className="text-muted-foreground text-xs" id="scale-steps-help">
						Number of steps (5-11)
					</p>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Start at 1</Label>
						<p className="text-muted-foreground text-xs">
							Scale starts at 1 instead of 0
						</p>
					</div>
					<Switch
						checked={field.properties?.start_at_one ?? true}
						onCheckedChange={(checked) =>
							onUpdateSettings({ start_at_one: checked })
						}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="scale-left-label">
						Left Label
					</Label>
					<Input
						aria-describedby="scale-left-label-help"
						autoComplete="off"
						id="scale-left-label"
						name="scale-left-label"
						onChange={(e) =>
							onUpdateSettings({
								labels: {
									...(field.properties?.labels ?? {}),
									left: e.target.value || undefined,
								},
							})
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Optional"
						type="text"
						value={field.properties?.labels?.left || ""}
					/>
					<p className="text-muted-foreground text-xs" id="scale-left-label-help">
						Label for the lowest value
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="scale-right-label">
						Right Label
					</Label>
					<Input
						aria-describedby="scale-right-label-help"
						autoComplete="off"
						id="scale-right-label"
						name="scale-right-label"
						onChange={(e) =>
							onUpdateSettings({
								labels: {
									...(field.properties?.labels ?? {}),
									right: e.target.value || undefined,
								},
							})
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Optional"
						type="text"
						value={field.properties?.labels?.right || ""}
					/>
					<p className="text-muted-foreground text-xs" id="scale-right-label-help">
						Label for the highest value
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
