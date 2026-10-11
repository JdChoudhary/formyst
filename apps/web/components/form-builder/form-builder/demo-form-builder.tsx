"use client";

import React, { useMemo, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { FormField, FormSchema, ThankyouScreen, WelcomeScreen } from "@repo/shared";
import type { FormBlock } from "@repo/shared";
import { createFieldFromType } from "@/lib/fields/field-config";
import { createDefaultFormSchema } from "@/lib/forms/form-defaults";
import { FieldPalette } from "../field-palette";
import { FieldSettingsPanel } from "../field-settings-panel";
import { FormPreview } from "../form-preview";
import { FormBuilderHeader } from "./components/form-builder-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormBuilderModals } from "./components/form-builder-modals";
import { FormBuilderPanels } from "./components/form-builder-panels";
import { PreviewWorkspace } from "../preview/preview-workspace";
import { WorkflowView } from "./components/workflow-view";
import type { BuilderView } from "./types";
import {
  addFieldToSchema,
  findSelectedField,
  generateBlockId,
  getBlocksFromSchema,
  removeFieldFromSchema,
  syncSchemaFromBlocks,
  updateFieldInSchema,
} from "./utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function DemoFormBuilder() {
  const isMobile = useIsMobile();
  const [formSchema, setFormSchema] = useState<FormSchema>(() =>
    createDefaultFormSchema({
      title: "Demo Form",
      description: "Try building a form!",
    }),
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    () => getBlocksFromSchema(formSchema)[0]?.id || null,
  );
  const [showFormSettings, setShowFormSettings] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFieldPalette, setShowFieldPalette] = useState(false);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [builderView, setBuilderView] = useState<BuilderView>("build");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const selectedField = useMemo(
    () => findSelectedField(formSchema, selectedFieldId),
    [formSchema, selectedFieldId],
  );

  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    if (isMobile && fieldId) setShowFieldSettings(true);
    if (isMobile && !fieldId) setShowFieldSettings(false);
  };

  const addField = (fieldType: string) => {
    const newField = createFieldFromType(fieldType as FormField["type"]);
    const updatedSchema = addFieldToSchema(formSchema, newField, selectedBlockId);
    setFormSchema(updatedSchema);
    setSelectedFieldId(newField.ref ?? null);
  };

  const handleAddField = (fieldType: FormField["type"]) => {
    addField(fieldType);
    setShowFieldPalette(false);
  };

  const updateField = (updatedField: FormField) => {
    const updatedSchema = updateFieldInSchema(formSchema, updatedField);
    setFormSchema(updatedSchema);
  };

  const deleteField = (fieldId: string) => {
    const updatedSchema = removeFieldFromSchema(formSchema, fieldId);
    setFormSchema(updatedSchema);
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const reorderFields = (fields: FormField[]) => {
    setFormSchema((prev) => {
      const blocks = getBlocksFromSchema(prev);
      const targetIndex = blocks.findIndex((b) => b.id === selectedBlockId);
      const index = targetIndex >= 0 ? targetIndex : 0;
      if (blocks[index]) {
        blocks[index] = { ...blocks[index], fields };
      }
      return syncSchemaFromBlocks(prev, blocks);
    });
  };

  const addBlock = () => {
    const blocks = getBlocksFromSchema(formSchema);
    const newBlock: FormBlock = {
      id: generateBlockId(),
      title: `Step ${blocks.length + 1}`,
      description: "",
      fields: [],
    };
    setFormSchema((prev) => {
      const current = getBlocksFromSchema(prev);
      const synced = syncSchemaFromBlocks(prev, [...current, newBlock]);
      const nextBlocks = getBlocksFromSchema(synced);
      return {
        ...synced,
        mode: prev.mode || "classic",
        settings: { ...synced.settings, show_progress_bar: nextBlocks.length > 1 },
      };
    });
    setSelectedBlockId(newBlock.id);
  };

  const updateBlocks = (blocks: FormBlock[]) => {
    setFormSchema((prev) => syncSchemaFromBlocks(prev, blocks));
  };

  const updateBlock = (blockId: string, updates: Partial<FormBlock>) => {
    setFormSchema((prev) => {
      const blocks = getBlocksFromSchema(prev).map((block) =>
        block.id === blockId ? { ...block, ...updates } : block,
      );
      return syncSchemaFromBlocks(prev, blocks);
    });
  };

  const deleteBlock = (blockId: string) => {
    setFormSchema((prev) => {
      const blocks = getBlocksFromSchema(prev).filter((block) => block.id !== blockId);
      const synced = syncSchemaFromBlocks(prev, blocks);
      return {
        ...synced,
        mode: prev.mode || "classic",
        settings: {
          ...synced.settings,
          show_progress_bar: blocks.length > 1,
        },
      };
    });
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const updateFormSettings = (settings: Partial<FormSchema["settings"]>) => {
    setFormSchema((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  };

  const updateWelcomeScreen = (updates: Partial<WelcomeScreen>) => {
    setFormSchema((prev) => {
      const current = (prev.welcome_screens ?? [])[0];
      const merged = current
        ? { ...current, ...updates }
        : { ref: "welcome", title: "Welcome!", ...updates };
      return { ...prev, welcome_screens: [merged] };
    });
  };

  const updateThankyouScreen = (updates: Partial<ThankyouScreen>) => {
    setFormSchema((prev) => {
      const current = (prev.thankyou_screens ?? [])[0];
      const merged = current
        ? { ...current, ...updates }
        : {
            ref: "default_thankyou",
            title: "Thank you for your submission!",
            type: "thankyou_screen" as const,
            ...updates,
          };
      return { ...prev, thankyou_screens: [merged] };
    });
  };

  const removeScreen = (kind: "welcome" | "ending") => {
    setFormSchema((prev) => ({
      ...prev,
      welcome_screens: kind === "welcome" ? [] : prev.welcome_screens,
      thankyou_screens: kind === "ending" ? [] : prev.thankyou_screens,
    }));
  };

  const handleSchemaUpdate = (updates: Partial<FormSchema>) => {
    setFormSchema((prev) => ({
      ...prev,
      ...updates,
      settings: {
        ...prev.settings,
        ...(updates.settings || {}),
      },
    }));
  };

  const handleStepSelection = (stepIndex: number) => {
    const blocks = getBlocksFromSchema(formSchema);
    if (blocks[stepIndex]) {
      setSelectedBlockId(blocks[stepIndex].id);
    }
  };

  const handleLayoutChange = (layout: "single" | "multi") => {
    const blocks = getBlocksFromSchema(formSchema);

    if (layout === "multi") {
      if (blocks.length <= 1 && blocks[0]?.id === "default") {
        const currentFields = blocks[0]?.fields || formSchema.fields || [];
        const stepOne: FormBlock = {
          id: "step-1",
          title: "Step 1",
          description: "First step of your form",
          fields: currentFields,
        };
        const synced = syncSchemaFromBlocks(formSchema, [stepOne]);
        setFormSchema({
          ...synced,
          mode: "classic",
          settings: { ...synced.settings, show_progress_bar: true },
        });
        setSelectedBlockId("step-1");
      } else {
        setFormSchema((prev) => ({
          ...prev,
          mode: "classic",
          settings: { ...prev.settings, show_progress_bar: true },
        }));
      }
    } else {
      const allFields = blocks.flatMap((block) => block.fields || []);
      const defaultBlock: FormBlock = {
        id: "default",
        title: "Form Fields",
        description: "",
        fields: allFields,
      };
      const synced = syncSchemaFromBlocks(formSchema, [defaultBlock]);
      setFormSchema({
        ...synced,
        mode: "classic",
        settings: { ...synced.settings, show_progress_bar: false },
      });
      setSelectedBlockId("default");
    }
  };

  const handleReset = () => {
    setFormSchema(
      createDefaultFormSchema({
        title: "Demo Form",
        description: "Try building a form!",
      }),
    );
    setSelectedFieldId(null);
    setSelectedBlockId("default");
  };

  const noop = () => {};
  const asyncNoop = async () => {};

  const handleBuilderViewChange = (view: BuilderView) => {
    setBuilderView(view);
    if (view === "settings") setShowFormSettings(true);
  };

  const closeFormSettings = () => {
    setShowFormSettings(false);
    if (builderView === "settings") setBuilderView("build");
  };

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <div className="sticky top-0 z-30 bg-card">
          <FormBuilderHeader
            autoSaving={false}
            builderView={builderView}
            formId={undefined}
            formSchema={formSchema}
            hasUnsavedChanges={false}
            isPublished={false}
            onAnalytics={noop}
            onJsonView={() => setShowJsonView(true)}
            onPreview={() => setShowPreviewDialog(true)}
            onPublish={noop}
            onSave={noop}
            onSettings={() => setShowFormSettings(true)}
            onShare={noop}
            onTitleChange={(title) => setFormSchema((prev) => ({ ...prev, title }))}
            onViewChange={handleBuilderViewChange}
            publishing={false}
            saving={false}
          />
        </div>
        {builderView === "logic" ? (
          <ScrollArea className="relative min-h-0 flex-1">
            <WorkflowView schema={formSchema} />
          </ScrollArea>
        ) : (
          <>
            <ScrollArea className="relative min-h-0 flex-1">
              <div className="h-full w-full">
                <FormPreview
                  onAddField={addField}
                  onBlockUpdate={updateBlock}
                  onFieldDelete={deleteField}
                  onFieldSelect={handleFieldSelect}
                  onFieldsReorder={reorderFields}
                  onFormSettingsUpdate={updateFormSettings}
                  onStepSelect={handleStepSelection}
                  schema={formSchema}
                  selectedBlockId={selectedBlockId}
                  selectedFieldId={selectedFieldId}
                />
              </div>
            </ScrollArea>
            <Drawer onOpenChange={setShowFieldPalette} open={showFieldPalette}>
              <DrawerContent className="mx-auto w-full rounded-t-2xl p-4">
                <div className="h-[70vh] w-full">
                  <FieldPalette onAddField={handleAddField} />
                </div>
              </DrawerContent>
            </Drawer>
            <Drawer
              onOpenChange={(open) => {
                setShowFieldSettings(open);
                if (!open) setSelectedFieldId(null);
              }}
              open={showFieldSettings}
            >
              <DrawerContent className="mx-auto w-full rounded-t-2xl p-0">
                <div className="flex h-[80vh] flex-col">
                  <FieldSettingsPanel
                    field={selectedField}
                    onClose={() => {
                      setShowFieldSettings(false);
                      setSelectedFieldId(null);
                    }}
                    onFieldUpdate={updateField}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          </>
        )}
        <FormBuilderModals
          formId={undefined}
          formSchema={formSchema}
          isPublished={false}
          onCloseFormSettings={closeFormSettings}
          onCloseJsonView={() => setShowJsonView(false)}
          onCloseSettings={() => setShowSettings(false)}
          onCloseShareModal={() => setShowShareModal(false)}
          onFormSettingsUpdate={updateFormSettings}
          onPublish={asyncNoop}
          onSchemaUpdate={handleSchemaUpdate}
          showFormSettings={showFormSettings}
          showJsonView={showJsonView}
          showSettings={showSettings}
          showShareModal={showShareModal}
          userEmail={undefined}
        />
        <PreviewWorkspace
          formSchema={formSchema}
          onClose={() => setShowPreviewDialog(false)}
          open={showPreviewDialog}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col overflow-hidden rounded-2xl border bg-background">
      <FormBuilderHeader
        autoSaving={false}
        builderView={builderView}
        formId={undefined}
        formSchema={formSchema}
        hasUnsavedChanges={false}
        isPublished={false}
        onAnalytics={noop}
        onJsonView={() => setShowJsonView(true)}
        onPreview={() => setShowPreviewDialog(true)}
        onPublish={noop}
        onSave={noop}
        onSettings={() => setShowFormSettings(true)}
        onShare={noop}
        onTitleChange={(title) => setFormSchema((prev) => ({ ...prev, title }))}
        onViewChange={handleBuilderViewChange}
        publishing={false}
        saving={false}
      />
      {builderView === "logic" ? (
        <ScrollArea className="min-h-0 flex-1">
          <WorkflowView schema={formSchema} />
        </ScrollArea>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <FormBuilderPanels
            builderView={builderView}
            formSchema={formSchema}
            onBlockAdd={addBlock}
            onBlockDelete={deleteBlock}
            onBlockSelect={setSelectedBlockId}
            onBlocksUpdate={updateBlocks}
            onBlockUpdate={updateBlock}
            onFieldAdd={addField}
            onFieldChangeType={noop}
            onFieldDelete={deleteField}
            onFieldDuplicate={noop}
            onFieldSelect={setSelectedFieldId}
            onFieldsReorder={reorderFields}
            onFieldUpdate={updateField}
            onFormSettingsUpdate={updateFormSettings}
            onSchemaUpdate={handleSchemaUpdate}
            onScreenDelete={removeScreen}
            onScreenSelect={(screen) => {
              if (screen) setSelectedFieldId(null);
            }}
            onStepSelect={handleStepSelection}
            onThankyouUpdate={updateThankyouScreen}
            onWelcomeUpdate={updateWelcomeScreen}
            selectedBlockId={selectedBlockId}
            selectedField={selectedField}
            selectedFieldId={selectedFieldId}
            selectedScreen={null}
          />
        </div>
      )}
      <FormBuilderModals
        formId={undefined}
        formSchema={formSchema}
        isPublished={false}
        onCloseFormSettings={closeFormSettings}
        onCloseJsonView={() => setShowJsonView(false)}
        onCloseSettings={() => setShowSettings(false)}
        onCloseShareModal={() => setShowShareModal(false)}
        onFormSettingsUpdate={updateFormSettings}
        onPublish={asyncNoop}
        onSchemaUpdate={handleSchemaUpdate}
        showFormSettings={showFormSettings}
        showJsonView={showJsonView}
        showSettings={showSettings}
        showShareModal={showShareModal}
        userEmail={undefined}
      />
      <PreviewWorkspace
        formSchema={formSchema}
        onClose={() => setShowPreviewDialog(false)}
        open={showPreviewDialog}
      />
      <Drawer onOpenChange={setShowFieldPalette} open={showFieldPalette}>
        <DrawerContent className="mx-auto w-full rounded-t-2xl p-4">
          <div className="h-[70vh] w-full">
            <FieldPalette onAddField={handleAddField} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
