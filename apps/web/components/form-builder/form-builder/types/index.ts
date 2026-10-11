import type { FormField, FormSchema, WelcomeScreen, ThankyouScreen } from "@repo/shared";
import type { FormBlock } from "@repo/shared";

export interface FormBuilderProps {
  formId?: string;
}

export type BuilderView = "build" | "design" | "logic" | "settings";

/** The screen the builder is currently focused on. */
export type SelectedScreen = "welcome" | "ending" | null;

export interface FormBuilderState {
  loading: boolean;
  saving: boolean;
  autoSaving: boolean;
  publishing: boolean;
  isPublished: boolean;
  hasUnsavedChanges: boolean;
  selectedFieldId: string | null;
  selectedBlockId: string | null;
  /** Welcome / ending screen focus — mutually exclusive with a selected field. */
  selectedScreen: SelectedScreen;
  builderView: BuilderView;
  showSettings: boolean;
  showFormSettings: boolean;
  showJsonView: boolean;
  showShareModal: boolean;
  formSchema: FormSchema;
  formSlug: string | null;
}

export interface FormBuilderActions {
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setAutoSaving: (autoSaving: boolean) => void;
  setPublishing: (publishing: boolean) => void;
  setIsPublished: (isPublished: boolean) => void;
  setHasUnsavedChanges: (hasUnsavedChanges: boolean) => void;
  setSelectedFieldId: (fieldId: string | null) => void;
  setSelectedBlockId: (blockId: string | null) => void;
  setSelectedScreen: (screen: SelectedScreen) => void;
  setBuilderView: (view: BuilderView) => void;
  setShowSettings: (show: boolean) => void;
  setShowFormSettings: (show: boolean) => void;
  setShowJsonView: (show: boolean) => void;
  setShowShareModal: (show: boolean) => void;
  setFormSlug: (slug: string | null) => void;
  setFormSchema: (schema: FormSchema | ((prev: FormSchema) => FormSchema)) => void;
}
export type FormExperience = "classic" | "conversational";
export type FormLayout = "single" | "multi";

export interface FormBuilderHeaderProps {
  formSchema: FormSchema;
  autoSaving: boolean;
  saving: boolean;
  publishing: boolean;
  isPublished: boolean;
  formId?: string;
  builderView: BuilderView;
  hasUnsavedChanges: boolean;
  onViewChange: (view: BuilderView) => void;
  onTitleChange: (title: string) => void;
  onJsonView: () => void;
  onAnalytics: () => void;
  onShare: () => void;
  onSettings: () => void;
  onPublish: () => void;
  onSave: () => void;
  onPreview?: () => void;
}

export interface UnsavedChangesIndicatorProps {
  hasUnsavedChanges: boolean;
  autoSaving: boolean;
}

export interface FormBuilderPanelsProps {
  formSchema: FormSchema;
  selectedFieldId: string | null;
  selectedBlockId: string | null;
  selectedField: FormField | null;
  selectedScreen: SelectedScreen;
  /** Add a question field (or content block) to the form. */
  onFieldAdd: (contentType: string, index?: number) => void;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldUpdate: (field: FormField) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldDuplicate: (fieldId: string) => void;
  onFieldChangeType: (fieldId: string, type: FormField["type"]) => void;
  onFieldsReorder: (fields: FormField[]) => void;
  onScreenSelect: (screen: SelectedScreen) => void;
  /** Remove the intro / thank-you screen from the form entirely. */
  onScreenDelete: (kind: "welcome" | "ending") => void;
  onWelcomeUpdate: (updates: Partial<WelcomeScreen>) => void;
  onThankyouUpdate: (updates: Partial<ThankyouScreen>) => void;
  onBlockSelect: (blockId: string | null) => void;
  onBlocksUpdate: (blocks: FormBlock[]) => void;
  onBlockAdd: () => void;
  onBlockUpdate: (blockId: string, updates: Partial<FormBlock>) => void;
  onBlockDelete: (blockId: string) => void;
  onFormSettingsUpdate: (settings: Partial<FormSchema["settings"]>) => void;
  onSchemaUpdate: (updates: Partial<FormSchema>) => void;
  onStepSelect: (stepIndex: number) => void;
}

export interface FormBuilderModalsProps {
  showSettings: boolean;
  showFormSettings: boolean;
  showJsonView: boolean;
  showShareModal: boolean;
  formSchema: FormSchema;
  formId?: string;
  formSlug?: string | null;
  isPublished: boolean;
  onCloseSettings: () => void;
  onCloseFormSettings: () => void;
  onCloseJsonView: () => void;
  onCloseShareModal: () => void;
  onFormSettingsUpdate: (settings: Partial<FormSchema["settings"]>) => void;
  onSchemaUpdate: (updates: Partial<FormSchema>) => void;
  onPublish: () => Promise<void>;
  userEmail?: string;
}
