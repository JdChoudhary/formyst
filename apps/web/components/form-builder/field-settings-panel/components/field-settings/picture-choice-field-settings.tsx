import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function PictureChoiceFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Picture Choice Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Allow Multiple Selections</Label>
						<p className="text-muted-foreground text-xs">
							Enable selecting more than one picture
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
							Shuffle picture order for each respondent
						</p>
					</div>
					<Switch
						checked={field.properties?.randomize ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ randomize: checked })
						}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Image Aspect Ratio</Label>
						<p className="text-muted-foreground text-xs">
							How each picture is cropped and displayed
						</p>
					</div>
					<Select
						onValueChange={(value) => onUpdateSettings({ picture_aspect: value })}
						value={(field.properties?.picture_aspect as string) ?? "square"}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="square">Square (1:1)</SelectItem>
							<SelectItem value="standard">Standard (4:3)</SelectItem>
							<SelectItem value="wide">Wide (16:9)</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Vertical Layout</Label>
						<p className="text-muted-foreground text-xs">
							Display pictures vertically instead of horizontally
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
