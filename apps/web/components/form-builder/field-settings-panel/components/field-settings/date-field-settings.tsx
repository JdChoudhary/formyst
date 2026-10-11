import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FieldSettingsProps } from "./types";

export function DateFieldSettings({
	field,
	onUpdateSettings,
}: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Date Field Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="date-structure">
						Date Format
					</Label>
					<Select
						onValueChange={(value) =>
							onUpdateSettings({
								structure: value as "MMDDYYYY" | "DDMMYYYY" | "YYYYMMDD",
							})
						}
						value={field.properties?.structure || "DDMMYYYY"}
					>
						<SelectTrigger className="w-full" id="date-structure">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="DDMMYYYY">Day / Month / Year</SelectItem>
							<SelectItem value="MMDDYYYY">Month / Day / Year</SelectItem>
							<SelectItem value="YYYYMMDD">Year / Month / Day</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs">
						Order of the date components
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="date-separator">
						Separator
					</Label>
					<Select
						onValueChange={(value) =>
							onUpdateSettings({ separator: value as "/" | "-" | "." })
						}
						value={field.properties?.separator || "/"}
					>
						<SelectTrigger className="w-full" id="date-separator">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="/">Slash ( / )</SelectItem>
							<SelectItem value="-">Dash ( - )</SelectItem>
							<SelectItem value=".">Dot ( . )</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs">
						Character separating the date parts
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
