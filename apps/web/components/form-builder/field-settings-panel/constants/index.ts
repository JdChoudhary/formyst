export const FIELD_TYPES = {
	// v2 type names (Typeform-compatible schema).
	TEXT_TYPES: ["short_text", "email"],
	OPTION_TYPES: ["multiple_choice", "checkbox", "dropdown", "picture_choice", "ranking"],
	NUMBER_TYPE: "number",
	TEXTAREA_TYPE: "long_text",
	SLIDER_TYPE: "opinion_scale",
	TAGS_TYPE: "checkbox",
	SOCIAL_TYPE: "website",
	SELECT_TYPE: "dropdown",
	EMAIL_TYPE: "email",
} as const;

export const FIELD_SIZES = [
	{ value: "sm", label: "Small" },
	{ value: "md", label: "Medium" },
	{ value: "lg", label: "Large" },
] as const;

export const FIELD_WIDTHS = [
	{ value: "full", label: "Full Width" },
	{ value: "half", label: "Half Width" },
	{ value: "third", label: "Third Width" },
	{ value: "quarter", label: "Quarter Width" },
] as const;

export const FIELD_VARIANTS = [
	{ value: "default", label: "Default" },
	{ value: "filled", label: "Filled" },
	{ value: "ghost", label: "Ghost" },
	{ value: "underline", label: "Underline" },
] as const;

export const DEFAULT_VALUES = {
	TEXTAREA_ROWS: 4,
	SLIDER_MIN: 0,
	SLIDER_MAX: 100,
	SLIDER_STEP: 1,
	SLIDER_DEFAULT: 50,
	TAGS_MAX: 10,
	FIELD_SIZE: "md",
	FIELD_WIDTH: "full",
	FIELD_VARIANT: "default",
} as const;	export const FIELD_DESCRIPTIONS = {
	short_text: "Single line text input for short responses",
	email: "Email address input with built-in validation",
	long_text: "Multi-line text input for longer responses",
	multiple_choice: "Single or multi-select from a list of options",
	checkbox: "Checkboxes for selecting multiple options",
	number: "Numeric input with validation",
	dropdown: "Dropdown menu for selecting options",
	opinion_scale: "Range scale for numeric values",
	ranking: "Order options by preference",
} as const;
