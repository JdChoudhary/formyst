import { useEffect, useRef, useState } from "react";

import { computeFieldVisibility, resolveStepRouting } from "@repo/shared";
import type { FormField, FormSchema } from "@repo/shared";
import { getBlocksFromSchema } from "../../form-builder/utils";

const getDefaultValueForField = (field: FormField): any => {
  // v2 type names — map each question type to its natural empty value.
  switch (field.type) {
    case "checkbox":
    case "picture_choice":
      return [];
    case "multiple_choice":
    case "dropdown":
      return "";
    case "rating":
      return 0;
    case "nps":
      return "";
    case "number":
      return "";
    case "yes_no":
      return "";
    case "matrix":
      return {};
    case "contact_info":
      return {};
    case "ranking":
      return [];
    case "signature":
      return "";
    case "file_upload":
      return [];
    case "payment":
      return null;
    case "statement":
      return null;
    case "opinion_scale":
      return "";
    default:
      return "";
  }
};

const initializeFormData = (fields: FormField[]): Record<string, any> => {
  const formData: Record<string, any> = {};

  fields.forEach((field) => {
    formData[field.ref ?? ""] = getDefaultValueForField(field);
  });

  return formData;
};

export function useFormPreviewState(schema: FormSchema, selectedBlockId?: string | null) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const initializedFieldsRef = useRef<Set<string>>(new Set());

  // Blocks are a derived view over the v2 schema (fields + groups).
  // Multi-step = more than one page, for both classic and conversational forms.
  const blocks = getBlocksFromSchema(schema);
  const isMultiStep = blocks.length > 1;
  // Prefer fields from blocks, but fall back to the top-level `fields` array
  // when there are no blocks (e.g. every step was deleted). `[] || x` would
  // never reach `x`, so check the length explicitly.
  const allFields = blocks?.length
    ? blocks.flatMap((block) => block.fields || [])
    : schema.fields || [];
  const currentStep = isMultiStep ? blocks?.[currentStepIndex] : null;
  const currentStepFields = isMultiStep ? currentStep?.fields || [] : allFields;

  useEffect(() => {
    const currentFieldIds = new Set(allFields.map((field) => field.ref ?? ""));
    const newFieldIds = [...currentFieldIds].filter((id) => !initializedFieldsRef.current.has(id));

    if (newFieldIds.length > 0) {
      const newFormData = { ...formData };
      allFields.forEach((field) => {
        if (newFieldIds.includes(field.ref ?? "")) {
          newFormData[field.ref ?? ""] = getDefaultValueForField(field);
        }
      });
      setFormData(newFormData);
      newFieldIds.forEach((id) => initializedFieldsRef.current.add(id));
    }
  }, [allFields.length]);

  useEffect(() => {
    if (selectedBlockId && blocks) {
      const blockIndex = blocks.findIndex((block) => block.id === selectedBlockId);
      if (blockIndex !== -1) {
        setCurrentStepIndex(blockIndex);
      }
    }
  }, [selectedBlockId, JSON.stringify(blocks.map((b) => b.id))]);

  const handleFieldValueChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const nextStep = () => {
    const routing = resolveStepRouting(schema, formData);
    const targetIndex = routing.targetStepId
      ? blocks.findIndex((block) => block.id === routing.targetStepId)
      : -1;
    const skippedStepIds = routing.skipStepIds;
    let nextIndex = targetIndex > currentStepIndex ? targetIndex : currentStepIndex + 1;

    while (nextIndex < blocks.length && skippedStepIds.has(blocks[nextIndex]?.id ?? "")) {
      nextIndex += 1;
    }

    if (nextIndex < (blocks?.length || 1)) {
      setCurrentStepIndex(nextIndex);
      return nextIndex;
    }
    return currentStepIndex;
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStepIndex(prevIndex);
      return prevIndex;
    }
    return currentStepIndex;
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < (blocks?.length || 1)) {
      setCurrentStepIndex(stepIndex);
    }
  };

  const logicResult = computeFieldVisibility(schema, formData);
  const fieldVisibility = logicResult.visibility;

  return {
    formData,
    currentStepIndex,
    isMultiStep,
    allFields,
    currentStep,
    currentStepFields,
    handleFieldValueChange,
    nextStep,
    prevStep,
    goToStep,
    fieldVisibility,
    requiredOverrides: logicResult.requiredOverrides,
    logicMessages: logicResult.logicMessages,
  };
}
