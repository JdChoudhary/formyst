import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createFieldId } from "@repo/shared";
import type { FieldSettingsProps } from "./types";	export function MatrixFieldSettings({ field, onUpdateSettings, onFieldUpdate }: FieldSettingsProps) {
	const rows = ((field.properties as any)?.rows ?? []) as Array<{ id: string; label: string }>;
	const columns = ((field.properties as any)?.columns ?? []) as Array<{
		id: string;
		label: string;
		value?: string;
	}>;

	const updateMatrix = (updates: Record<string, unknown>) => {
		onFieldUpdate({
			...field,
			properties: { ...field.properties, ...updates },
		} as any);
	};

	const addRow = () => {
		const newRow = {
			id: createFieldId("row"),
			label: `Row ${rows.length + 1}`,
		};
		updateMatrix({ rows: [...rows, newRow] });
	};

	const updateRow = (index: number, label: string) => {
		const newRows = [...rows];
		newRows[index] = { ...newRows[index], label };
		updateMatrix({ rows: newRows });
	};

	const removeRow = (index: number) => {
		const newRows = [...rows];
		newRows.splice(index, 1);
		updateMatrix({ rows: newRows });
	};

	const handleRowDragEnd = (result: any) => {
		if (!result.destination) return;
		const newRows = [...rows];
		const [removed] = newRows.splice(result.source.index, 1);
		newRows.splice(result.destination.index, 0, removed);
		updateMatrix({ rows: newRows });
	};

	const addColumn = () => {
		const newColumn = {
			id: createFieldId("col"),
			label: `Column ${columns.length + 1}`,
			value: `${columns.length + 1}`,
		};
		updateMatrix({ columns: [...columns, newColumn] });
	};

	const updateColumn = (index: number, label: string) => {
		const newColumns = [...columns];
		newColumns[index] = { ...newColumns[index], label, value: label };
		updateMatrix({ columns: newColumns });
	};

	const removeColumn = (index: number) => {
		const newColumns = [...columns];
		newColumns.splice(index, 1);
		updateMatrix({ columns: newColumns });
	};

	const handleColumnDragEnd = (result: any) => {
		if (!result.destination) return;
		const newColumns = [...columns];
		const [removed] = newColumns.splice(result.source.index, 1);
		newColumns.splice(result.destination.index, 0, removed);
		updateMatrix({ columns: newColumns });
	};

	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Matrix Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-6 p-0">
				{/* Settings */}
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<div className="flex flex-col">
							<Label className="font-medium text-sm">Multiple Selection Per Row</Label>
							<p className="text-muted-foreground text-xs">
								Allow selecting multiple columns per row
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
							<Label className="font-medium text-sm">Required Rows</Label>
							<p className="text-muted-foreground text-xs">
								Require a response for each row
							</p>
						</div>
					<Switch
						checked={(field.properties as any)?.requiredRows ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ requiredRows: checked })
						}
					/>
					</div>
				</div>

				{/* Rows Editor */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<Label className="font-medium text-sm">Rows</Label>
						<Button
							aria-label="Add new row"
							className="flex gap-2"
							onClick={addRow}
							size="sm"
							variant="outline"
						>
							<Plus aria-hidden="true" className="size-4" />
							Add Row
						</Button>
					</div>
					<DragDropContext onDragEnd={handleRowDragEnd}>
						<Droppable droppableId="matrix-rows">
							{(provided) => (
								<div
									{...provided.droppableProps}
									className="flex flex-col gap-2"
									ref={provided.innerRef}
								>
									{rows.map((row: any, index: number) => (
										<Draggable key={row.id} draggableId={row.id} index={index}>
											{(dragProvided, snapshot) => (
												<div
													ref={dragProvided.innerRef}
													{...dragProvided.draggableProps}
													className={`flex items-center gap-2 rounded-md border p-2 transition-all ${
														snapshot.isDragging
															? "shadow-lg ring-2 ring-primary/20"
															: "border-border"
													}`}
												>
													<div
														{...dragProvided.dragHandleProps}
														className="flex size-6 cursor-grab items-center justify-center rounded border border-muted-foreground/30 border-dashed bg-muted/30 text-muted-foreground"
													>
														<GripVertical className="size-3" />
													</div>
													<Input
														autoComplete="off"
														className="flex-1"
														onChange={(e) => updateRow(index, e.target.value)}
														placeholder={`Row ${index + 1}`}
														type="text"
														value={row.label || ""}
													/>
													<Button
														aria-label={`Remove row ${index + 1}`}
														className="size-6"
														onClick={() => removeRow(index)}
														size="icon"
														variant="destructive"
													>
														<X className="size-3" />
													</Button>
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</DragDropContext>
				</div>

				{/* Columns Editor */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<Label className="font-medium text-sm">Columns</Label>
						<Button
							aria-label="Add new column"
							className="flex gap-2"
							onClick={addColumn}
							size="sm"
							variant="outline"
						>
							<Plus aria-hidden="true" className="size-4" />
							Add Column
						</Button>
					</div>
					<DragDropContext onDragEnd={handleColumnDragEnd}>
						<Droppable droppableId="matrix-columns">
							{(provided) => (
								<div
									{...provided.droppableProps}
									className="flex flex-col gap-2"
									ref={provided.innerRef}
								>
									{columns.map((column: any, index: number) => (
										<Draggable key={column.id} draggableId={column.id} index={index}>
											{(dragProvided, snapshot) => (
												<div
													ref={dragProvided.innerRef}
													{...dragProvided.draggableProps}
													className={`flex items-center gap-2 rounded-md border p-2 transition-all ${
														snapshot.isDragging
															? "shadow-lg ring-2 ring-primary/20"
															: "border-border"
													}`}
												>
													<div
														{...dragProvided.dragHandleProps}
														className="flex size-6 cursor-grab items-center justify-center rounded border border-muted-foreground/30 border-dashed bg-muted/30 text-muted-foreground"
													>
														<GripVertical className="size-3" />
													</div>
													<Input
														autoComplete="off"
														className="flex-1"
														onChange={(e) => updateColumn(index, e.target.value)}
														placeholder={`Column ${index + 1}`}
														type="text"
														value={column.label || ""}
													/>
													<Button
														aria-label={`Remove column ${index + 1}`}
														className="size-6"
														onClick={() => removeColumn(index)}
														size="icon"
														variant="destructive"
													>
														<X className="size-3" />
													</Button>
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</DragDropContext>
				</div>
			</CardContent>
		</Card>
	);
}
