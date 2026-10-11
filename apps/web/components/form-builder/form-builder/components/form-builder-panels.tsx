import type React from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ClassicBuilderCanvas } from "../../classic-builder-canvas";
import { FieldSettingsPanel } from "../../field-settings-panel";
import { LogicBuilderView } from "./logic/logic-builder-view";
import { FormSettingsPanel } from "../../form-settings-modal/form-settings-panel";
import { DesignTab } from "./design-tab";
import { ScreenSettingsPanel } from "./screen-settings-panel";
import { Safari } from "@/components/ui/safari";
import { cn } from "@/lib/utils";

import { PANEL_SIZES } from "../constants";

import type { BuilderView, FormBuilderPanelsProps } from "../types";
import { QuestionList } from "./question-list";
import { getWelcomeScreen, getDefaultThankyou } from "@repo/shared";

interface ExtendedFormBuilderPanelsProps extends FormBuilderPanelsProps {
  builderView: BuilderView;
  formId?: string;
  userEmail?: string;
  onViewChange?: (view: BuilderView) => void;
}

export const FormBuilderPanels: React.FC<ExtendedFormBuilderPanelsProps> = ({
  formSchema,
  selectedFieldId,
  selectedBlockId,
  selectedField,
  selectedScreen,
  builderView,
  onFieldAdd,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  onFieldDuplicate,
  onFieldChangeType,
  onFieldsReorder,
  onScreenDelete,
  onScreenSelect,
  onWelcomeUpdate,
  onThankyouUpdate,
  onBlockAdd,
  onBlockUpdate,
  onBlockDelete,
  onBlockSelect,
  onFormSettingsUpdate,
  onSchemaUpdate,
  onStepSelect,
  formId,
  userEmail,
  onViewChange,
}) => {
  const welcomeScreen = getWelcomeScreen(formSchema);
  const thankyouScreen = getDefaultThankyou(formSchema);

  // Logic view — full-width logic builder. Rules also control visibility,
  // enabled state, and required state inside a single-page form.
  if (builderView === "logic") {
    return (
      <div className="h-full">
        <LogicBuilderView schema={formSchema} onSchemaUpdate={onSchemaUpdate} />
      </div>
    );
  }

  // Settings view — the settings sections as a tab, not an overlay modal.
  if (builderView === "settings") {
    return (
      <div className="h-full">
        <FormSettingsPanel
          formId={formId}
          onBack={() => onViewChange?.("build")}
          onSchemaUpdate={onSchemaUpdate}
          schema={formSchema}
          userEmail={userEmail}
        />
      </div>
    );
  }

  // Design view — full-width theme/design controls
  if (builderView === "design") {
    return (
      <div className="h-full">
        <DesignTab
          formSchema={formSchema}
          onFormSettingsUpdate={onFormSettingsUpdate}
          onSchemaUpdate={onSchemaUpdate}
        />
      </div>
    );
  }

  // Build view — Typeform-style three-panel layout
  return (
    <ResizablePanelGroup
      className="h-full"
      orientation="horizontal"
      style={{
        overscrollBehavior: "contain",
      }}
    >
      {/* Left: content navigator */}
      <ResizablePanel
        defaultSize={PANEL_SIZES.LEFT_PANEL.default}
        maxSize={PANEL_SIZES.LEFT_PANEL.max}
        minSize={PANEL_SIZES.LEFT_PANEL.min}
        style={{
          overscrollBehavior: "contain",
        }}
      >
        <QuestionList
          formSchema={formSchema}
          onFieldAdd={onFieldAdd}
          onFieldDelete={onFieldDelete}
          onFieldDuplicate={onFieldDuplicate}
          onFieldSelect={onFieldSelect}
          onFieldsReorder={onFieldsReorder}
          onScreenDelete={onScreenDelete}
          onScreenSelect={onScreenSelect}
          selectedFieldId={selectedFieldId}
          selectedScreen={selectedScreen}
        />
      </ResizablePanel>

      <ResizableHandle />

      {/* Center: editing canvas — framed inside a Safari browser chrome
          so the builder experience mirrors the respondent's real browser view. */}
      <ResizablePanel
        defaultSize={PANEL_SIZES.PREVIEW_PANEL.default}
        maxSize={PANEL_SIZES.PREVIEW_PANEL.max}
        minSize={PANEL_SIZES.PREVIEW_PANEL.min}
        style={{
          overscrollBehavior: "contain",
        }}
      >
        <div className="flex h-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
          <Safari
            className="flex h-full w-full max-h-[min(820px,calc(100vh-120px))] max-w-[960px]"
            url="formyst.app/build"
          >
            <div className="h-full overflow-hidden">
              <ClassicBuilderCanvas
                onAddContent={onFieldAdd}
                onFieldDelete={onFieldDelete}
                onFieldDuplicate={onFieldDuplicate}
                onFieldSelect={onFieldSelect}
                onFieldUpdate={onFieldUpdate}
                onScreenSelect={onScreenSelect}
                onStepAdd={onBlockAdd}
                onStepDelete={onBlockDelete}
                onStepSelect={onBlockSelect}
                onStepUpdate={onBlockUpdate}
                onThankyouUpdate={onThankyouUpdate}
                onWelcomeUpdate={onWelcomeUpdate}
                schema={formSchema}
                selectedBlockId={selectedBlockId}
                selectedFieldId={selectedFieldId}
                selectedScreen={selectedScreen}
              />
            </div>
          </Safari>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Right: contextual inspector */}
      <ResizablePanel
        defaultSize={PANEL_SIZES.RIGHT_PANEL.default}
        maxSize={PANEL_SIZES.RIGHT_PANEL.max}
        minSize={PANEL_SIZES.RIGHT_PANEL.min}
        style={{
          overscrollBehavior: "contain",
        }}
      >
        <div
          className="flex h-full flex-col"
          style={{
            overscrollBehavior: "contain",
          }}
        >
          {selectedScreen === "welcome" ? (
            <ScreenSettingsPanel
              formSchema={formSchema}
              kind="welcome"
              onClose={() => onScreenSelect(null)}
              onDelete={() => onScreenDelete("welcome")}
              onUpdate={onWelcomeUpdate}
              screen={welcomeScreen ?? null}
            />
          ) : selectedScreen === "ending" ? (
            <ScreenSettingsPanel
              formSchema={formSchema}
              kind="ending"
              onClose={() => onScreenSelect(null)}
              onDelete={() => onScreenDelete("ending")}
              onUpdate={onThankyouUpdate}
              screen={thankyouScreen ?? null}
            />
          ) : (
            <FieldSettingsPanel
              field={selectedField}
              formMode="classic"
              formSchema={formSchema}
              onClose={() => onFieldSelect(null)}
              onFieldChangeType={onFieldChangeType}
              onSchemaUpdate={onSchemaUpdate}
              onFieldUpdate={onFieldUpdate}
            />
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
