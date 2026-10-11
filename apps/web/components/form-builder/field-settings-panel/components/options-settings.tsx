import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Plus, X, Image } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Choice } from "@repo/shared";
import { createOption } from "@repo/shared";

import type { OptionsSettingsProps } from "../types";

export const OptionsSettings: React.FC<OptionsSettingsProps> = ({
	field,
	onFieldUpdate,
}) => {
	const options: Choice[] = field.properties?.choices ?? [];
	const isPictureChoice = field.type === "picture_choice";

	const updateChoices = (choices: Choice[]) => {
		onFieldUpdate({
			...field,
			properties: { ...field.properties, choices },
		});
	};

	const addOption = () => {
		updateChoices([...options, createOption(`Option ${options.length + 1}`)]);
	};

	const updateOption = (index: number, updates: Partial<Choice>) => {
		const newOptions = [...options];
		newOptions[index] = { ...newOptions[index], ...updates };
		updateChoices(newOptions);
	};

	const removeOption = (index: number) => {
		const newOptions = [...options];
		newOptions.splice(index, 1);
		updateChoices(newOptions);
	};

	const handleDragEnd = (result: any) => {
		if (!result.destination) return;

		const newOptions = [...options];
		const [removed] = newOptions.splice(result.source.index, 1);
		newOptions.splice(result.destination.index, 0, removed);

		updateChoices(newOptions);
	};

	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-lg">
						Options
					</CardTitle>
					<Button
						aria-label="Add new option"
						className="flex gap-2"
						onClick={addOption}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								addOption();
							}
						}}
						size="sm"
						variant="outline"
					>
						<Plus aria-hidden="true" className="size-4" />
						Add Option
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<DragDropContext onDragEnd={handleDragEnd}>
					<Droppable droppableId="options">
						{(provided) => (
							<div
								{...provided.droppableProps}
								className="flex flex-col gap-2"
								ref={provided.innerRef}
							>
								{options.map((option, index) => (
									<Draggable
										key={option.ref ?? `opt-${index}`}
										draggableId={option.ref ?? `opt-${index}`}
										index={index}
									>
										{(dragProvided, snapshot) => (
											<div
												ref={dragProvided.innerRef}
												{...dragProvided.draggableProps}
												className={`flex flex-col gap-2 rounded-md border p-3 transition-all ${
													snapshot.isDragging
														? "shadow-lg ring-2 ring-primary/20"
														: "border-border"
												}`}
											>
												<div className="flex items-center gap-2">
													<div
														{...dragProvided.dragHandleProps}
														className="flex size-8 cursor-grab items-center justify-center rounded-md border border-muted-foreground/30 border-dashed bg-muted/30 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/50 hover:text-foreground active:cursor-grabbing"
														aria-label={`Drag to reorder ${option.label}`}
													>
														<GripVertical className="size-4" />
													</div>
													<div className="flex-1">
														<Input
															autoComplete="off"
															onChange={(e) =>
																updateOption(index, {
																	label: e.target.value,
																})
															}
															placeholder={`Option ${index + 1}`}
															type="text"
															value={option.label || ""}
														/>
													</div>
													<Button
														aria-label={`Remove option ${index + 1}`}
														className="flex size-8 gap-2"
														onClick={() => removeOption(index)}
														onKeyDown={(e) => {
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																removeOption(index);
															}
														}}
														size="icon"
														variant="destructive"
													>
														<X aria-hidden="true" className="size-4" />
													</Button>
												</div>

												{isPictureChoice && (
													<div className="ml-10 flex items-center gap-2">
														<Image className="size-4 text-muted-foreground" />
														<Input
															autoComplete="off"
															className="flex-1"
															onChange={(e) =>
																updateOption(index, {
																	attachment: e.target.value
																		? {
																				type: "image",
																				href: e.target.value,
																			}
																		: undefined,
																})
															}
															placeholder="Image URL (optional)"
															type="url"
															value={option.attachment?.href || ""}
														/>
													</div>
												)}
											</div>
										)}
									</Draggable>
								))}
								{provided.placeholder}
							</div>
						)}
					</Droppable>
				</DragDropContext>

				{options.length === 0 && (
					<p
						aria-live="polite"
						className="text-muted-foreground text-sm"
						role="status"
					>
						No options added yet
					</p>
				)}
			</CardContent>
		</Card>
	);
};
