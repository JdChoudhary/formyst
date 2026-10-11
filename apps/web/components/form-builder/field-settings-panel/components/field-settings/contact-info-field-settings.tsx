import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function ContactInfoFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Contact Info Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">First Name</Label>
						<p className="text-muted-foreground text-xs">
							Include first name input
						</p>
					</div>
					<Switch
						checked={(field.properties?.firstName as boolean | undefined) ?? true}
						onCheckedChange={(checked) =>
							onUpdateSettings({ firstName: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Last Name</Label>
						<p className="text-muted-foreground text-xs">
							Include last name input
						</p>
					</div>
					<Switch
						checked={(field.properties?.lastName as boolean | undefined) ?? true}
						onCheckedChange={(checked) =>
							onUpdateSettings({ lastName: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Email</Label>
						<p className="text-muted-foreground text-xs">
							Include email input
						</p>
					</div>
					<Switch
						checked={(field.properties?.email as boolean | undefined) ?? true}
						onCheckedChange={(checked) =>
							onUpdateSettings({ email: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Phone</Label>
						<p className="text-muted-foreground text-xs">
							Include phone input
						</p>
					</div>
					<Switch
						checked={(field.properties?.phone as boolean | undefined) ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ phone: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Company</Label>
						<p className="text-muted-foreground text-xs">
							Include company input
						</p>
					</div>
					<Switch
						checked={(field.properties?.company as boolean | undefined) ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ company: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Address</Label>
						<p className="text-muted-foreground text-xs">
							Include address input
						</p>
					</div>
					<Switch
						checked={(field.properties?.address as boolean | undefined) ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ address: checked })
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
