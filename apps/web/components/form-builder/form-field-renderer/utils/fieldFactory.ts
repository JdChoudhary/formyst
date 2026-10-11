import React from "react";

import type { FormField } from "@repo/shared";

import {
  BannerField,
  CheckboxField,
  DateInputField,
  DividerField,
  EmailInputField,
  FieldGroupField,
  FileUploadField,
  NumberInputField,
  RadioField,
  RatingField,
  SelectField,
  SignatureField,
  StatementField,
  TagsField,
  TextareaField,
  TextInputField,
} from "../components";
import { LinkInputField } from "../components/link-input-field";
import { PhoneInputField } from "../components/phone-input-field";
import { ContactInfoField } from "../components/contact-info-field";
import { MatrixField } from "../components/matrix-field";
import { NpsField } from "../components/nps-field";
import { OpinionScaleField } from "../components/opinion-scale-field";
import { PaymentField } from "../components/payment-field";
import { PictureChoiceField } from "../components/picture-choice-field";
import { RankingField } from "../components/ranking-field";
import { YesNoField } from "../components/yes-no-field";
import type { BaseFieldProps } from "../types";

/** Field types rendered natively by their own component. */
const NATIVE_TYPES = new Set([
  "nps",
  "matrix",
  "ranking",
  "opinion_scale",
  "picture_choice",
  "yes_no",
  "contact_info",
  "payment",
  "statement",
  "divider",
  "banner",
  "tags",
  "group",
]);

export function createFieldComponent(
  field: FormField,
  value: unknown,
  onChange: (value: unknown) => void,
  error?: string,
  fieldRef?: React.RefObject<unknown>,
  disabled?: boolean,
  formId?: string,
  builderMode?: boolean,
): React.ReactElement {
  const props: BaseFieldProps = {
    field,
    value,
    onChange,
    error,
    fieldRef,
    disabled,
    formId,
    builderMode,
  };

  switch (field.type) {
    case "nps":
      return React.createElement(NpsField, props);
    case "matrix":
      return React.createElement(MatrixField, props);
    case "ranking":
      return React.createElement(RankingField, props);
    case "opinion_scale":
      return React.createElement(OpinionScaleField, props);
    case "picture_choice":
      return React.createElement(PictureChoiceField, props);
    case "yes_no":
      return React.createElement(YesNoField, props);
    case "contact_info":
      return React.createElement(ContactInfoField, props);
    case "payment":
      return React.createElement(PaymentField, props);
    case "statement":
      return React.createElement(StatementField, props);
    case "divider":
      return React.createElement(DividerField, props);
    case "banner":
      return React.createElement(BannerField, props);
    case "tags":
      return React.createElement(TagsField, props);
    case "group":
      return React.createElement(FieldGroupField, props);
    case "short_text":
      return React.createElement(TextInputField, props);
    case "long_text":
      return React.createElement(TextareaField, props);
    case "email":
      return React.createElement(EmailInputField, props);
    case "number":
      return React.createElement(NumberInputField, props);
    case "phone_number":
      return React.createElement(PhoneInputField, props);
    case "website":
      return React.createElement(LinkInputField, props);
    case "date":
      return React.createElement(DateInputField, props);
    case "multiple_choice":
      return field.properties?.allow_multiple_selection
        ? React.createElement(CheckboxField, props)
        : React.createElement(RadioField, props);
    case "checkbox":
      return React.createElement(CheckboxField, props);
    case "dropdown":
      return React.createElement(SelectField, props);
    case "rating":
      return React.createElement(RatingField, props);
    case "file_upload":
      return React.createElement(FileUploadField, props);
    case "signature":
      return React.createElement(SignatureField, props);
    default:
      return React.createElement("div", {}, "Unsupported field type");
  }
}

export { NATIVE_TYPES };
