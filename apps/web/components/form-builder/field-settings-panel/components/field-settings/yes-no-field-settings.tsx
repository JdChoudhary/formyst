import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldSettingsProps } from "./types";

export function YesNoFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Yes/No Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="yes-label">
						"Yes" Label
					</Label>
					<Input
						aria-describedby="yes-label-help"
						autoComplete="off"
						id="yes-label"
						name="yes-label"
					onChange={(e) =>
						onUpdateSettings({
							labels: {
								...(field.properties?.labels ?? {}),
								right: e.target.value || "Yes",
							},
						})
					}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Yes"
						type="text"
						value={field.properties?.labels?.right || "Yes"}
					/>
					<p className="text-muted-foreground text-xs" id="yes-label-help">
						Custom label for the "Yes" option
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="no-label">
						"No" Label
					</Label>
					<Input
						aria-describedby="no-label-help"
						autoComplete="off"
						id="no-label"
						name="no-label"
					onChange={(e) =>
							onUpdateSettings({
								labels: {
									...(field.properties?.labels ?? {}),
									left: e.target.value || "No",
								},
							})
					}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="No"
						type="text"
						value={field.properties?.labels?.left || "No"}
					/>
					<p className="text-muted-foreground text-xs" id="no-label-help">
						Custom label for the "No" option
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
