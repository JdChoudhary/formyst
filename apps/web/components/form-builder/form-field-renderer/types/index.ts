import type { RefObject } from "react";
import type { FormField } from "@repo/shared";

export interface FormFieldRendererProps {
	field: FormField;
	value: any;
	onChange: (value: any) => void;
	error?: string;
	fieldRef?: RefObject<any>;
	disabled?: boolean;
	formId?: string;
	builderMode?: boolean;
	/** Set false when the caller renders the attachment itself (conversational headers). */
	showAttachment?: boolean;
	/**
	 * Set false when the question title is rendered separately above the
	 * answer control (conversational canvas) so the label is never repeated.
	 */
	showLabel?: boolean;
	/** When provided, field titles/descriptions with recall tokens are interpolated */
	recallContext?: FieldRecallContext;
}

export interface FieldRecallContext {
	/** Current form answers keyed by field ref */
	answers: Record<string, unknown>;
	/** Current variable values */
	variables: Record<string, unknown>;
	/** Hidden field values from URL params */
	hidden: Record<string, unknown>;
	/** The full form schema (needed for field lookup) */
	schema: import("@repo/shared").FormSchema;
}

export interface FieldWrapperProps {
	field: FormField;
	error?: string;
	children: React.ReactNode;
	builderMode?: boolean;
	showAttachment?: boolean;
	showLabel?: boolean;
	/** When provided, field titles/descriptions with recall tokens are interpolated */
	recallContext?: FieldRecallContext;
}

export interface BaseFieldProps {
	field: FormField;
	value: any;
	onChange: (value: any) => void;
	error?: string;
	fieldRef?: RefObject<any>;
	className?: string;
	disabled?: boolean;
	formId?: string;
	builderMode?: boolean;
}

export type FieldSize = "sm" | "lg" | "default";
export type FieldVariant = "filled" | "ghost" | "underline" | "default";
export type FieldWidth = "half" | "third" | "quarter" | "full";
