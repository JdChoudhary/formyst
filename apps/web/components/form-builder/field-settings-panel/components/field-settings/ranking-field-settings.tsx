import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function RankingFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Ranking Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Randomize Options</Label>
						<p className="text-muted-foreground text-xs">
							Shuffle option order before ranking
						</p>
					</div>
					<Switch
						checked={field.properties?.randomize ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ randomize: checked })
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
