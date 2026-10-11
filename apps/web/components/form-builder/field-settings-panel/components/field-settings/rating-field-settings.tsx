import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FieldSettingsProps } from "./types";

export function RatingFieldSettings({
	field,
	onUpdateSettings,
}: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Rating Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="rating-star-count">
						Number of Icons
					</Label>
					<Input
						aria-describedby="rating-star-count-help"
						autoComplete="off"
						className="w-20"
						id="rating-star-count"
						max={10}
						min={1}
						name="rating-star-count"
						onChange={(e) =>
							onUpdateSettings({
								steps: Math.max(
									1,
									Math.min(10, Number.parseInt(e.target.value) || 5)
								),
							})
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						type="number"
						value={field.properties?.steps || 5}
					/>
					<p
						className="text-muted-foreground text-xs"
						id="rating-star-count-help"
					>
						Number of rating icons (1-10)
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="rating-icon">
						Icon Type
					</Label>
					<Select
						onValueChange={(val) => onUpdateSettings({ shape: val as any })}
						value={field.properties?.shape || "star"}
					>
						<SelectTrigger className="w-24" id="rating-icon">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="star">Star</SelectItem>
							<SelectItem value="heart">Heart</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs" id="rating-icon-help">
						Choose the icon type for ratings
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
