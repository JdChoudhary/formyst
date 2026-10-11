import { TagInput } from "@/components/ui/tag-input";
import type { BaseFieldProps } from "../types";
import { getErrorClasses } from "../utils";

/**
 * Tags — free-form labels the respondent types and commits with Enter/comma.
 * The value is always an array of strings.
 */
export function TagsField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  const tags = Array.isArray(value) ? (value as string[]).filter((t) => typeof t === "string") : [];

  return (
    <TagInput
      allowDuplicates={field.properties?.allow_duplicates ?? false}
      className={getErrorClasses(error)}
      disabled={disabled}
      id={field.ref}
      maxTags={field.properties?.max_tags ?? 20}
      onTagsChange={onChange}
      placeholder={field.properties?.placeholder || "Type and press Enter..."}
      tagSize="sm"
      tags={tags}
    />
  );
}
