import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldSettingsProps } from "./types";

export function StatementFieldSettings({
	field,
	onUpdateSettings,
	onFieldUpdate,
}: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Statement Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="statement-heading">
						Heading
					</Label>
					<Input
						aria-describedby="statement-heading-help"
						autoComplete="off"
						id="statement-heading"
						name="statement-heading"
						onChange={(e) => onFieldUpdate({ ...field, title: e.target.value })}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Enter statement heading"
						type="text"
						value={field.title}
					/>
					<p className="text-muted-foreground text-xs" id="statement-heading-help">
						Main heading for the statement
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="statement-description">
						Description
					</Label>
					<Textarea
						aria-describedby="statement-description-help"
						className="resize-none"
						id="statement-description"
						name="statement-description"
						onChange={(e) =>
							onUpdateSettings({ description: e.target.value })
						}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Enter statement description"
						rows={3}
						value={field.properties?.description || ""}
					/>
					<p
						className="text-muted-foreground text-xs"
						id="statement-description-help"
					>
						Detailed description for the statement
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="statement-button-text">
						Button Text
					</Label>
					<Input
						aria-describedby="statement-button-text-help"
						autoComplete="off"
						id="statement-button-text"
						name="statement-button-text"
						onChange={(e) => onUpdateSettings({ button_text: e.target.value })}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						placeholder="Continue"
						type="text"
						value={field.properties?.button_text || "Continue"}
					/>
					<p
						className="text-muted-foreground text-xs"
						id="statement-button-text-help"
					>
						Text displayed on the continue button
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
