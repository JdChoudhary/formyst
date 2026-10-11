export const FORM_BUILDER_CONSTANTS = {
	AUTOSAVE_DELAY: 1000,
	DEFAULT_FORM_TITLE: "",
	DEFAULT_FORM_DESCRIPTION: "",
	DEFAULT_SUBMIT_TEXT: "Submit",
	DEFAULT_SUCCESS_MESSAGE: "Thank you for your submission!",
	DEFAULT_REDIRECT_URL: "",
	HEADER_HEIGHT: "81px",
} as const;

export const DRAFT_KEYS = {
	getDraftKey: (formId?: string) =>
		formId ? `form-draft-${formId}` : "form-draft-new",
	IMPORTED_FORM_SCHEMA: "importedFormSchema",
} as const;

export const PANEL_SIZES = {
	LEFT_PANEL: {
		default: 18,
		min: 14,
		max: 22,
	},
	PREVIEW_PANEL: {
		default: 64,
		min: 50,
		max: 78,
	},
	RIGHT_PANEL: {
		default: 18,
		min: 14,
		max: 25,
	},
} as const;
