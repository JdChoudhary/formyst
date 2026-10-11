import type { FormField, FormSchema } from "@repo/shared";
import type { FormBlock } from "@repo/shared";

export interface FormPreviewProps {
  schema: FormSchema;
  selectedFieldId: string | null;
  selectedBlockId?: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldsReorder: (fields: FormField[]) => void;
  onFieldDelete: (fieldId: string) => void;
  onFormSettingsUpdate?: (settings: Partial<FormSchema["settings"]>) => void;
  onBlockUpdate?: (blockId: string, updates: Partial<FormBlock>) => void;
  onStepSelect?: (stepIndex: number) => void;
  onAddField?: (fieldType: FormField["type"]) => void;
  onBlockAdd?: () => void;
  onBlockDelete?: (blockId: string) => void;
  /** Hide editing chrome (drag handles, delete, add buttons) for a clean live preview. */
  previewOnly?: boolean;
  /** Allow controls to be used while keeping the preview free of editing chrome. */
  interactive?: boolean;
}

export interface FormHeaderProps {
  schema: FormSchema;
  onFormSettingsUpdate?: (settings: Partial<FormSchema["settings"]>) => void;
}

export interface MultiStepNavigationProps {
  schema: FormSchema;
  currentStepIndex: number;
  onStepSelect?: (stepIndex: number) => void;
  onStepChange: (index: number) => void;
  onBlockAdd?: () => void;
  onBlockDelete?: (blockId: string) => void;
}

export interface StepHeaderProps {
  currentStep: FormBlock;
  currentStepIndex: number;
  onBlockUpdate?: (blockId: string, updates: Partial<FormBlock>) => void;
}

export interface FormFieldsContainerProps {
  fields: FormField[];
  selectedFieldId: string | null;
  formData: Record<string, any>;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldsReorder: (fields: FormField[]) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldValueChange: (fieldId: string, value: any) => void;
  isMultiStep: boolean;
  onAddField?: (fieldType: FormField["type"]) => void;
  fieldVisibility?: Record<string, { visible: boolean; disabled: boolean }>;
  requiredOverrides?: Record<string, boolean>;
  /** Hide editing chrome (drag handles, delete, add buttons) for a clean live preview. */
  readOnly?: boolean;
  /** Allow form controls to be used in a non-editing preview. */
  interactive?: boolean;
  /** Show per-field media (image/video). Classical mode sets this to false. */
  showAttachment?: boolean;
}

export interface FormActionsProps {
  schema: FormSchema;
  currentStepIndex: number;
  fieldsLength: number;
  isMultiStep: boolean;
  onNextStep: () => void;
}

export interface EditableFieldProps {
  value: string;
  placeholder?: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  inputClassName?: string;
  component?: "input" | "textarea";
  rows?: number;
}
