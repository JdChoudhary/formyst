import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function DropdownFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Dropdown Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
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
						<Label className="font-medium text-sm">Alphabetical Order</Label>
						<p className="text-muted-foreground text-xs">
							Sort options alphabetically
						</p>
					</div>
					<Switch
						checked={field.properties?.alphabetical_order ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ alphabetical_order: checked })
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
			</CardContent>
		</Card>
	);
}
