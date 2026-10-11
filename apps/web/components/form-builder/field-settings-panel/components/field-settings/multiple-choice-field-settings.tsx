import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function MultipleChoiceFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Multiple Choice Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Allow Multiple Selections</Label>
						<p className="text-muted-foreground text-xs">
							Enable selecting more than one option
						</p>
					</div>
					<Switch
						checked={field.properties?.allow_multiple_selection ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ allow_multiple_selection: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Randomize Options</Label>
						<p className="text-muted-foreground text-xs">
							Shuffle option order for each respondent
						</p>
					</div>
					<Switch
						checked={field.properties?.randomize ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ randomize: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Allow "Other" Option</Label>
						<p className="text-muted-foreground text-xs">
							Let respondents enter a custom answer
						</p>
					</div>
					<Switch
						checked={field.properties?.allow_other_choice ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ allow_other_choice: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Vertical Layout</Label>
						<p className="text-muted-foreground text-xs">
							Display options vertically instead of horizontally
						</p>
					</div>
					<Switch
						checked={field.properties?.vertical_alignment ?? true}
						onCheckedChange={(checked) =>
							onUpdateSettings({ vertical_alignment: checked })
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
