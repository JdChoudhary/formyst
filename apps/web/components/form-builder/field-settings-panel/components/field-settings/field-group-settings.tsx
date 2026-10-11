import { Plus, Settings, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import type { FormField } from "@repo/shared";
import {
	createFieldFromType,
	FIELD_CATEGORIES,
	FIELD_TYPE_CONFIGS,
} from "@/lib/fields/field-config";
import { FieldSpecificSettings } from "../field-specific-settings";
import type { FieldSettingsProps } from "./types";

export function FieldGroupSettings({
	field,
	onUpdateSettings,
	onFieldUpdate,
}: FieldSettingsProps) {
	const groupFields: FormField[] = field.properties?.fields ?? [];
	const [pickerOpen, setPickerOpen] = useState(false);
	const [expandedFields, setExpandedFields] = useState<{
		[id: string]: boolean;
	}>({});

	const updateGroupFields = (fields: FormField[]) => {
		onUpdateSettings({ fields });
	};

	const addFieldToGroup = (fieldType: string) => {
		const newField = createFieldFromType(fieldType as any);
		updateGroupFields([...groupFields, newField]);
	};

	const removeFieldFromGroup = (fieldRef: string) => {
		updateGroupFields(groupFields.filter((f) => f.ref !== fieldRef));
		setExpandedFields((prev) => {
			const copy = { ...prev };
			delete copy[fieldRef];
			return copy;
		});
	};

	const updateGroupField = (fieldRef: string, updates: any) => {
		updateGroupFields(
			groupFields.map((f) => (f.ref === fieldRef ? { ...f, ...updates } : f))
		);
	};

	return (
		<div className="flex flex-col gap-4">
			<Card className="gap-2 p-4 shadow-none">
				<CardHeader className="p-0">
					<CardTitle className="flex items-center gap-2 text-lg">
						Group Fields ({groupFields.length})
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-2 p-0">
					<div className="flex justify-start">
						<Dialog onOpenChange={setPickerOpen} open={pickerOpen}>
							<DialogTrigger
								render={
									<Button
										aria-label="Add field to group"
										className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
										size="sm"
										type="button"
										variant="outline"
									>
										<Plus aria-hidden="true" className="size-4" />
										Add field
									</Button>
								}
							/>
							<DialogContent className="p-0">
								<DialogHeader className="px-4 pt-4">
									<DialogTitle>Add a field</DialogTitle>
								</DialogHeader>
								<ScrollArea className="max-h-[70vh] p-4 pt-2">
									<div className="grid grid-cols-1 gap-6">
										{Object.entries(FIELD_CATEGORIES).map(([key, title]) => (
											<div className="flex flex-col gap-3" key={key}>
												<div className="px-1 text-muted-foreground text-xs uppercase tracking-wide">
													{title}
												</div>
												<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
													{FIELD_TYPE_CONFIGS.filter(
														(f) => f.category === (key as any)
													).map((f) => (
														<Button
															className="h-19 w-full items-center justify-start text-left"
															key={f.type}
															onClick={() => {
																addFieldToGroup(f.type);
																setPickerOpen(false);
															}}
															type="button"
															variant="outline"
														>
															<div className="flex flex-col">
																<span className="font-medium text-foreground text-sm">
																	{f.label}
																</span>
																<span className="text-wrap text-muted-foreground text-xs">
																	{f.description}
																</span>
															</div>
														</Button>
													))}
												</div>
											</div>
										))}
									</div>
								</ScrollArea>
							</DialogContent>
						</Dialog>
					</div>

					{groupFields.length === 0 ? (
						<div
							aria-live="polite"
							className="rounded-md border border-border border-dashed p-6 text-center text-muted-foreground"
							role="status"
						>
							<p className="text-sm">No fields in this group yet.</p>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{groupFields.map((groupField) => {
								const fieldRef = groupField.ref ?? "";
								return (
									<Card className="gap-2 p-4 shadow-none" key={fieldRef}>
										<div className="flex flex-col gap-4">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="font-medium text-card-foreground text-sm">
														{groupField.title || `${groupField.type} Field`}
													</h4>
													<span className="rounded bg-muted px-2 py-1 text-muted-foreground text-xs">
														{groupField.type}
													</span>
												</div>
												<div className="flex items-center gap-1">
													<Button
														aria-label={`Settings for ${groupField.title || groupField.type} field`}
														className="size-8"
														onClick={() =>
															setExpandedFields((prev) => ({
																...prev,
																[fieldRef]: !prev[fieldRef],
															}))
														}
														size="icon"
														type="button"
														variant="ghost"
													>
														<Settings aria-hidden="true" className="size-4" />
													</Button>
													<Button
														aria-label={`Remove ${groupField.title || groupField.type} field`}
														className="size-8"
														onClick={() => removeFieldFromGroup(fieldRef)}
														size="icon"
														type="button"
														variant="destructive"
													>
														<X aria-hidden="true" className="size-4" />
													</Button>
												</div>
											</div>

											<div className="flex flex-col gap-2">
												<Label
													className="font-medium text-sm"
													htmlFor={`${fieldRef}-label`}
												>
													Field Label
												</Label>
												<Input
													autoComplete="off"
													id={`${fieldRef}-label`}
													name={`${fieldRef}-label`}
													onChange={(e) =>
														updateGroupField(fieldRef, {
															title: e.target.value,
														})
													}
													placeholder="Enter field label"
													type="text"
													value={groupField.title}
												/>
											</div>

											<div className="flex items-center justify-between">
												<div className="flex flex-col gap-1">
													<Label
														className="font-medium text-sm"
														htmlFor={`${fieldRef}-required`}
													>
														Required field
													</Label>
													<p className="text-muted-foreground text-xs">
														Make this field mandatory
													</p>
												</div>
												<Switch
													checked={groupField.validations?.required ?? false}
													id={`${fieldRef}-required`}
													name={`${fieldRef}-required`}
													onCheckedChange={(checked) =>
														updateGroupField(fieldRef, {
															validations: {
																...groupField.validations,
																required: checked,
															},
														})
													}
												/>
											</div>

											<Collapsible
												onOpenChange={(open) =>
													setExpandedFields((prev) => ({
														...prev,
														[fieldRef]: open,
													}))
												}
												open={!!expandedFields[fieldRef]}
											>
												<CollapsibleTrigger
													render={
														<Button
															aria-label={`Toggle advanced settings for ${groupField.title || groupField.type}`}
															className="w-full justify-between"
															type="button"
															variant="outline"
														>
															<span className="text-card-foreground text-sm">
																Advanced Settings
															</span>
														</Button>
													}
												/>
												<CollapsibleContent className="mt-2 flex flex-col gap-4">
													<div className="bg-background">
														<FieldSpecificSettings
															field={groupField}
															onFieldUpdate={(updatedField) =>
																updateGroupField(fieldRef, updatedField)
															}
															onUpdateSettings={(settings) =>
																updateGroupField(fieldRef, {
																	properties: {
																		...groupField.properties,
																		...settings,
																	},
																})
															}
														/>
													</div>
												</CollapsibleContent>
											</Collapsible>
										</div>
									</Card>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
