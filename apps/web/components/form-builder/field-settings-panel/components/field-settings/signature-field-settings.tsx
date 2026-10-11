import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function SignatureFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Signature Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="pen-color">
						Pen Color
					</Label>
					<div className="flex items-center gap-2">
						<Input
							aria-describedby="pen-color-help"
							autoComplete="off"
							className="w-16"
							id="pen-color"
							name="pen-color"
							onChange={(e) =>
								onUpdateSettings({
									penColor: e.target.value || "#1f2937",
								})
							}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									e.currentTarget.blur();
								}
							}}
							type="color"
							value={field.properties?.penColor as string | undefined || "#1f2937"}
						/>
						<Input
							autoComplete="off"
							className="flex-1"
							onChange={(e) =>
								onUpdateSettings({
									penColor: e.target.value || "#1f2937",
								})
							}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									e.currentTarget.blur();
								}
							}}
							placeholder="#1f2937"
							type="text"
							value={field.properties?.penColor as string | undefined || "#1f2937"}
						/>
					</div>
					<p className="text-muted-foreground text-xs" id="pen-color-help">
						Color of the signature pen
					</p>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Show Clear Button</Label>
						<p className="text-muted-foreground text-xs">
							Display a button to clear the signature
						</p>
					</div>
					<Switch
						checked={field.properties?.showClearButton as boolean | undefined ?? true}
						onCheckedChange={(checked) =>
							onUpdateSettings({ showClearButton: checked })
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
