"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Image,
  LayoutTemplate,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Wrench,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { FormField, FormSchema } from "@repo/shared";
import { FIELD_TYPE_CONFIGS } from "@/lib/fields/field-config";
import {
  EmptyState,
  FieldSpecificSettings,
  LayoutSettings,
  LogicRulesPanel,
  MediaSettings,
  OptionsSettings,
  PrepopulationSettings,
  QuizFieldSettings,
  SettingsPanelHeader,
  ValidationSettings,
} from "./components";

import { useFieldUpdates } from "./utils";

interface FieldSettingsPanelProps {
  field: FormField | null;
  onFieldUpdate: (field: FormField) => void;
  onClose: () => void;
  /** Current form mode — drives which sections are shown. */
  formMode?: "classic" | "conversational";
  /** Change the answer type of the selected question. */
  onFieldChangeType?: (fieldId: string, type: FormField["type"]) => void;
  /** The full form schema — needed for logic rules panel. */
  formSchema?: FormSchema;
  /** Update the form schema (for logic, scoring, etc.). */
  onSchemaUpdate?: (updates: Partial<FormSchema>) => void;
}

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  /** Render the chevron collapsed (closed by default). */
  collapsed?: boolean;
  children: React.ReactNode;
}

function SettingsSection({
  title,
  icon: Icon,
  defaultOpen = false,
  collapsed = false,
  children,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      className="overflow-hidden rounded-lg border border-border/60"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger
        className="flex w-full cursor-pointer items-center gap-2.5 bg-muted/30 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        render={<button type="button" />}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">{title}</span>
        {open || collapsed ? (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border/60 border-t bg-background px-3.5 py-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FieldSettingsPanel({
  field,
  formMode = "classic",
  onFieldUpdate,
  onClose,
  onFieldChangeType,
  formSchema,
  onSchemaUpdate,
}: FieldSettingsPanelProps) {
  const { updateValidation, updateSettings } = useFieldUpdates(field, onFieldUpdate);

  if (!field) {
    return <EmptyState onClose={onClose} />;
  }

  const isConversational = formMode === "conversational";
  const isChoiceField = [
    "multiple_choice",
    "checkbox",
    "dropdown",
    "picture_choice",
    "ranking",
  ].includes(field.type);

  const handleTypeChange = (type: FormField["type"]) => {
    if (type === field.type) return;
    onFieldChangeType?.(field.ref ?? "", type);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col border-border bg-background"
      style={{
        overscrollBehavior: "contain",
      }}
    >
      <SettingsPanelHeader field={field} onClose={onClose} />
      <ScrollArea
        className="h-0 min-h-0 flex-1"
        style={{
          overscrollBehavior: "contain",
        }}
      >
        <div className="flex flex-col gap-2.5 p-3">
          {/* Answer — prominent answer type + type-specific settings */}
          <SettingsSection collapsed defaultOpen={false} icon={SlidersHorizontal} title="Answer">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Answer type</span>
                <Select onValueChange={handleTypeChange} value={field.type}>
                  <SelectTrigger className="font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_CONFIGS.map((config) => (
                      <SelectItem key={config.type} value={config.type}>
                        <span className="flex items-center gap-2">
                          <config.icon className="size-3.5 text-muted-foreground" />
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isChoiceField ? (
                <OptionsSettings field={field} onFieldUpdate={onFieldUpdate} />
              ) : (
                <FieldSpecificSettings
                  field={field}
                  onFieldUpdate={onFieldUpdate}
                  onUpdateSettings={updateSettings}
                />
              )}
            </div>
          </SettingsSection>

          {/* Media — Conversational only, optional image/video per question.
              Also shown for statement fields: a statement with media is the
              standalone image/video content block. */}
          {isConversational && (
            <SettingsSection collapsed icon={Image} title="Media">
              <MediaSettings field={field} onFieldUpdate={onFieldUpdate} />
            </SettingsSection>
          )}

          {/* Layout — Conversational only, visual layout previews */}
          {isConversational && (
            <SettingsSection collapsed icon={LayoutTemplate} title="Layout">
              <LayoutSettings field={field} onFieldUpdate={onFieldUpdate} />
            </SettingsSection>
          )}

          {/* Validation */}
          <SettingsSection collapsed icon={ShieldCheck} title="Validation">
            <ValidationSettings field={field} onUpdateValidation={updateValidation} />
          </SettingsSection>

          {/* Quiz scoring — feeds the result screen's score */}
          <SettingsSection collapsed icon={Target} title="Quiz & scoring">
            <QuizFieldSettings field={field} onUpdateSettings={updateSettings} />
          </SettingsSection>

          {/* Logic — conditional branching, recall, scoring */}
          {formSchema && onSchemaUpdate && (
            <SettingsSection collapsed icon={GitBranch} title="Logic & Branching">
              <LogicRulesPanel
                field={field}
                formSchema={formSchema}
                onFieldUpdate={onFieldUpdate}
                onSchemaUpdate={onSchemaUpdate}
              />
            </SettingsSection>
          )}

          {/* Advanced — prepopulation & hidden defaults */}
          <SettingsSection collapsed icon={Wrench} title="Advanced">
            <PrepopulationSettings field={field} onFieldUpdate={onFieldUpdate} />
          </SettingsSection>
        </div>
      </ScrollArea>
    </div>
  );
}
