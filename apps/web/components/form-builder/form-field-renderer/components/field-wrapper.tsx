import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { interpolateRecall } from "@repo/shared";

import { AttachmentMedia } from "./attachment-media";

import type { FieldWrapperProps } from "../types";

export function FieldWrapper({
	field,
	error,
	children,
	builderMode = false,
	showAttachment = true,
	showLabel = true,
	recallContext,
}: FieldWrapperProps) {  // Content blocks (statement, divider, banner) own their own text and never
  // collect an answer, so the wrapper must not add a question label above them.
	const isContentBlock =
		field.type === "statement" || field.type === "divider" || field.type === "banner";
	const shouldShowLabel = !isContentBlock && showLabel;
	const shouldShowError = !isContentBlock && error;

	const rawLabel = field.title?.replace("*", "") ?? "";
	const rawDescription = field.properties?.description;

	const fieldLabel = recallContext
		? interpolateRecall(rawLabel, recallContext.schema, recallContext.answers, recallContext.variables, recallContext.hidden)
		: rawLabel;
	const description = recallContext && rawDescription
		? interpolateRecall(rawDescription, recallContext.schema, recallContext.answers, recallContext.variables, recallContext.hidden)
		: rawDescription;
	const required = field.validations?.required ?? false;
	const fieldId = field.ref ?? "field";

	// Media can live on `field.attachment` (Typeform-style question media) or
	// on `field.layout.attachment` (set via the "Layout & Media" panel).
	const mediaAttachment = field.attachment ?? field.layout?.attachment;
	const isSplit =
		showAttachment && !!mediaAttachment?.href && field.layout?.type === "split";
	const placement = field.layout?.placement ?? "left";

	const labelNode = shouldShowLabel && fieldLabel ? (
		<Label
			className="gap-1 font-medium text-foreground text-sm"
			htmlFor={fieldId}
		>
			{fieldLabel}
			{required && <span className="text-destructive">*</span>}
		</Label>
	) : null;

	const descriptionNode = shouldShowLabel && description ? (
		<p className="form-description text-muted-foreground text-sm opacity-80">
			{description}
		</p>
	) : null;

	const errorNode = shouldShowError && error ? (
		<p
			aria-live="polite"
			className="flex items-start gap-1 text-destructive text-sm"
			role="alert"
		>
			{error}
		</p>
	) : null;

	const mediaNode =
		showAttachment && mediaAttachment?.href ? (
			<AttachmentMedia
				attachment={mediaAttachment}
				className={cn(
					"w-full rounded-xl",
					isSplit ? "max-h-72" : "mt-1 max-h-56",
				)}
			/>
		) : null;

	const contentNode = (
		<div className="flex min-w-0 flex-col gap-2">
			{labelNode}
			{descriptionNode}
			{!isSplit && mediaNode}
			{children}
			{errorNode}
		</div>
	);

	return (
		<div
			className="flex flex-col gap-2"
			data-builder-mode={builderMode ? "true" : undefined}
			onClick={
				builderMode
					? (e) => {
							e.stopPropagation();
							const card =
								(e.currentTarget.closest('[role="button"]') as HTMLElement) ??
								undefined;
							card?.click();
						}
					: undefined
			}
			role={builderMode ? "group" : undefined}
		>
			{isSplit && mediaNode ? (
				<div
					className={cn(
						"grid items-center gap-5",
						placement === "right"
							? "sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
							: "sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
					)}
				>
					{placement === "right" ? (
						<>
							{contentNode}
							<div className="min-w-0">{mediaNode}</div>
						</>
					) : (
						<>
							<div className="min-w-0">{mediaNode}</div>
							{contentNode}
						</>
					)}
				</div>
			) : (
				contentNode
			)}
		</div>
	);
}
