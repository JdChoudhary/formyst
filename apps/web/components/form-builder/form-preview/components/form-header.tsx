import { getInternalFormTitle } from "@/lib/utils/form-utils";
import type { FormHeaderProps } from "../types";
import { EditableField } from "./editable-field";

export function FormHeader({ schema, onFormSettingsUpdate }: FormHeaderProps) {
	const handleTitleUpdate = (title: string) => {
		onFormSettingsUpdate?.({
			meta: { ...schema.settings?.meta, title: title || "" },
		});
	};

	const handleDescriptionUpdate = (description: string) => {
		onFormSettingsUpdate?.({
			meta: { ...schema.settings?.meta, description },
		});
	};

	const internalTitle = getInternalFormTitle(schema);

	return (
		<div className="flex flex-col">
			<EditableField
				className="flex items-center gap-2"
				disabled={!onFormSettingsUpdate}
				inputClassName="text-3xl font-bold bg-background w-full"
				onSave={handleTitleUpdate}
				placeholder="Click to add title..."
				value={schema.settings?.meta?.title || schema.title || ""}
			>
				<div className="flex flex-col gap-1">
					<h1 className="truncate font-bold text-3xl text-foreground">
						{internalTitle}
					</h1>
				</div>
			</EditableField>

			<EditableField
				className="flex items-start gap-2"
				component="textarea"
				disabled={!onFormSettingsUpdate}
				inputClassName="bg-background w-full"
				onSave={handleDescriptionUpdate}
				placeholder="Click to add a description..."
				rows={Math.max(
					(schema.settings?.meta?.description || "").split("\n").length || 1,
					1
				)}
				value={schema.settings?.meta?.description || ""}
			>
				{schema.settings?.meta?.description ? (
					<p className="whitespace-pre-wrap text-muted-foreground">
						{schema.settings?.meta?.description}
					</p>
				) : onFormSettingsUpdate ? (
					<p className="text-muted-foreground italic">
						Click to add a description...
					</p>
				) : null}
			</EditableField>
		</div>
	);
}
