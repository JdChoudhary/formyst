import { FieldWrapper } from "./components";

import type { FormFieldRendererProps } from "./types";

import { createFieldComponent } from "./utils";

export function FormFieldRenderer({
	field,
	value,
	onChange,
	error,
	fieldRef,
	disabled,
	formId,
	builderMode = false,
	showAttachment = true,
	showLabel = true,
	recallContext,
}: FormFieldRendererProps) {
	return (
		<FieldWrapper
			builderMode={builderMode}
			error={error}
			field={field}
			recallContext={recallContext}
			showAttachment={showAttachment}
			showLabel={showLabel}
		>
			<div
				aria-hidden={builderMode ? true : undefined}
				className={builderMode ? "pointer-events-none select-none" : undefined}
				data-builder-mode={builderMode ? "true" : undefined}
				tabIndex={builderMode ? -1 : undefined}
			>
				{createFieldComponent(
					field,
					value,
					onChange,
					error,
					fieldRef,
					disabled,
					formId,
					builderMode
				)}
			</div>
		</FieldWrapper>
	);
}
