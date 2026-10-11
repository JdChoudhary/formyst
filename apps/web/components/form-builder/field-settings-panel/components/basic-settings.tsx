import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { BasicSettingsProps } from "../types";

import { createFieldUpdater } from "../utils";
import { RecallMentionInput } from "../../recall-mention";

export const BasicSettings: React.FC<BasicSettingsProps> = ({
  field,
  onFieldUpdate,
  formSchema,
}) => {
  const { updateField, updateSettings, updateValidation } = createFieldUpdater(
    field,
    onFieldUpdate,
  );

  // Only text-style answers show a placeholder.
  const supportsPlaceholder = [
    "short_text",
    "long_text",
    "email",
    "number",
    "phone_number",
    "website",
    "date",
  ].includes(field.type);

  return (
    <Card className="gap-2 p-4 shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          Basic Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="field-label">
            Question
          </Label>
          <RecallMentionInput
            currentFieldRef={field.ref}
            formSchema={formSchema}
            onChange={(value) => updateField({ title: value })}
            placeholder="What do you want to ask? Type @ to recall..."
            value={field.title}
          />
          <p className="text-muted-foreground text-xs" id="field-label-help">
            The question shown to respondents{" "}
            <span className="text-primary/70">· Type @ to recall values</span>
          </p>
        </div>

        {supportsPlaceholder && (
          <div className="flex flex-col gap-2">
            <Label className="font-medium text-sm" htmlFor="field-placeholder">
              Placeholder
            </Label>
            <Input
              autoComplete="off"
              id="field-placeholder"
              name="field-placeholder"
              onChange={(e) =>
                updateSettings({ placeholder: e.target.value || undefined })
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Hint shown inside the answer box"
              type="text"
              value={field.properties?.placeholder || ""}
            />
            <p
              className="text-muted-foreground text-xs"
              id="field-placeholder-help"
            >
              Example text shown inside the answer box
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="field-description">
            Description
          </Label>
          <RecallMentionInput
            currentFieldRef={field.ref}
            formSchema={formSchema}
            onChange={(value) =>
              updateSettings({ description: value || undefined })
            }
            placeholder="Additional help text (type @ to recall)"
            value={field.properties?.description || ""}
          />
          <p className="text-muted-foreground text-xs" id="field-description-help">
            Additional help text shown below the field
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Label className="font-medium text-sm" htmlFor="field-required">
              Required field
            </Label>
            <p className="text-muted-foreground text-xs">
              Users must fill this field to submit the form
            </p>
          </div>
          <Switch
            aria-describedby="field-required-help"
            checked={field.validations?.required ?? false}
            id="field-required"
            name="field-required"
            onCheckedChange={(required) => updateValidation({ required })}
          />
        </div>
      </CardContent>
    </Card>
  );
};
