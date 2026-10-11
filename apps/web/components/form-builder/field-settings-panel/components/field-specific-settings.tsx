import type React from "react";
import type { FieldProperties, FormField } from "@repo/shared";
import { EmailValidationSettings } from "./email-validation-settings";
import {
  BannerFieldSettings,
  CheckboxFieldSettings,
  ContactInfoFieldSettings,
  DateFieldSettings,
  DividerFieldSettings,
  DropdownFieldSettings,
  FieldGroupSettings,
  FileFieldSettings,
  MatrixFieldSettings,
  MultipleChoiceFieldSettings,
  NpsFieldSettings,
  NumberFieldSettings,
  OpinionScaleFieldSettings,
  PaymentFieldSettings,
  PhoneFieldSettings,
  PictureChoiceFieldSettings,
  RankingFieldSettings,
  RatingFieldSettings,
  ShortTextFieldSettings,
  SignatureFieldSettings,
  StatementFieldSettings,
  TagsFieldSettings,
  TextareaFieldSettings,
  YesNoFieldSettings,
} from "./field-settings";
import type { FieldSettingsProps } from "./field-settings";

interface FieldSpecificSettingsProps {
  field: FormField;
  onUpdateSettings: (updates: Partial<FieldProperties>) => void;
  onFieldUpdate: (field: FormField) => void;
}

export function FieldSpecificSettings({
  field,
  onUpdateSettings,
  onFieldUpdate,
}: FieldSpecificSettingsProps) {
  // Map field types to their settings components
  const fieldSettingsMap: Record<string, React.ComponentType<FieldSettingsProps>> = {
    // Text & scalar fields
    short_text: ShortTextFieldSettings,
    long_text: TextareaFieldSettings,
    email: EmailValidationSettings,
    phone_number: PhoneFieldSettings,
    number: NumberFieldSettings,
    date: DateFieldSettings,
    contact_info: ContactInfoFieldSettings,

    // Choice fields
    multiple_choice: MultipleChoiceFieldSettings,
    checkbox: CheckboxFieldSettings,
    dropdown: DropdownFieldSettings,
    picture_choice: PictureChoiceFieldSettings,
    ranking: RankingFieldSettings,
    yes_no: YesNoFieldSettings,

    // Scale fields
    nps: NpsFieldSettings,
    opinion_scale: OpinionScaleFieldSettings,
    rating: RatingFieldSettings,
    matrix: MatrixFieldSettings,

    // Media & utility fields
    file_upload: FileFieldSettings,
    signature: SignatureFieldSettings,
    payment: PaymentFieldSettings,
    statement: StatementFieldSettings,
    divider: DividerFieldSettings,
    banner: BannerFieldSettings,
    tags: TagsFieldSettings,
    group: FieldGroupSettings,
  };

  const FieldComponent = fieldSettingsMap[field.type];

  if (!FieldComponent) {
    return null;
  }

  return (
    <FieldComponent
      field={field}
      onFieldUpdate={onFieldUpdate}
      onUpdateSettings={onUpdateSettings}
    />
  );
}
