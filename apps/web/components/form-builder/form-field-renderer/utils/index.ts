/**
 * Answer inputs draw a single bottom rule instead of a full box, so a form
 * reads like a page of underlined answers rather than a stack of boxes.
 *
 * The side-specific widths are deliberate: the `Input`/`Textarea` primitives
 * supply an all-sides `border`, and Tailwind emits `border-b` *after* it, so
 * the bottom rule wins without needing `!important`.
 */
export const getAnswerInputClasses = (error?: string) => {
	const base =
		"rounded-none border-0 border-x-0 border-t-0 border-b bg-transparent px-0 shadow-none " +
		"transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent";

	return error
		? `${base} border-b-destructive focus-visible:border-b-destructive`
		: `${base} border-b-input/70 hover:border-b-foreground/40 focus-visible:border-b-primary`;
};

export const getErrorClasses = (error?: string) =>
	error ? "border-destructive focus:border-destructive" : "";

export const getErrorRingClasses = (error?: string) =>
	error ? "ring-2 ring-destructive/20" : "";

export { applyBuilderMode, getBuilderMode } from "./builderMode";
export { createFieldComponent } from "./fieldFactory";
