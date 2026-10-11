"use client";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

import { toast } from "@/hooks/use-toast";

import type { FormField, FormSchema, ThankyouScreen, WelcomeScreen } from "@repo/shared";
import { createFieldId, getDefaultThankyou, getWelcomeScreen } from "@repo/shared";
import type { FormBlock } from "@repo/shared";

import { useCreateForm, useTogglePublishForm, useUpdateForm } from "@/hooks/api/form";
import { createFieldFromType } from "@/lib/fields/field-config";
import { FieldPalette } from "../field-palette";
import { FieldSettingsPanel } from "../field-settings-panel";
import { FormBuilderSkeleton } from "../form-builder-skeleton";
import { FormPreview } from "../form-preview";
import { FormBuilderHeader } from "./components/form-builder-header";
import { FormBuilderModals } from "./components/form-builder-modals";
import { FormBuilderPanels } from "./components/form-builder-panels";
import { BuilderToolbar } from "./components/builder-toolbar";
import { BuilderBottomNav } from "./components/builder-bottom-nav";
import { DesignTab } from "./components/design-tab";
import { LogicBuilderView } from "./components/logic/logic-builder-view";
import { FormSettingsPanel } from "../form-settings-modal/form-settings-panel";
import type { PreviewDevice } from "./components/builder-toolbar";
import { CONTENT_TYPES } from "./components/add-content-menu";
import { PreviewWorkspace } from "../preview/preview-workspace";

import { DRAFT_KEYS } from "./constants";
import { useFormBuilder } from "./hooks/useFormBuilder";
import type { BuilderView, FormBuilderProps, SelectedScreen } from "./types";
import {
  addFieldToSchema,
  generateBlockId,
  getBlocksFromSchema,
  removeDraftFromStorage,
  removeFieldFromSchema,
  syncSchemaFromBlocks,
  updateFieldInSchema,
  asBuilderSchema,
} from "./utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    // Match Tailwind's `lg` breakpoint (min-width: 1024px): below it the
    // builder uses the mobile shell with the bottom navigation.
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const CHOICE_TYPES = new Set([
  "multiple_choice",
  "checkbox",
  "dropdown",
  "picture_choice",
  "ranking",
]);

export const FormBuilder: React.FC<FormBuilderProps> = ({ formId }) => {
  const router = useRouter();
  const { createForm } = useCreateForm();
  const { updateForm } = useUpdateForm();
  const { togglePublish: togglePublishForm } = useTogglePublishForm();
  const {
    state,
    actions,
    selectedField,
    user,
    authLoading,
    debouncedAutoSave,
    lastSavedSchemaRef,
    lastManuallySavedSchemaRef,
  } = useFormBuilder(formId);

  const isMobile = useIsMobile();
  const [showFieldPalette, setShowFieldPalette] = useState(false);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

  /* ------------------------------------------------------------------ *
   * Undo / redo history
   * ------------------------------------------------------------------ */
  const historyRef = useRef<{ past: FormSchema[]; future: FormSchema[] }>({
    past: [],
    future: [],
  });
  // Track history lengths in state so the toolbar undo/redo buttons update
  // without reading refs during render.
  const [historySizes, setHistorySizes] = useState({ past: 0, future: 0 });
  const syncHistoryState = useCallback(() => {
    setHistorySizes({
      past: historyRef.current.past.length,
      future: historyRef.current.future.length,
    });
  }, []);

  const commitHistory = useCallback(() => {
    historyRef.current.past.push(state.formSchema);
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
    syncHistoryState();
  }, [state.formSchema, syncHistoryState]);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!past.length) return;
    const prev = past[past.length - 1];
    historyRef.current = {
      past: past.slice(0, -1),
      future: [state.formSchema, ...future],
    };
    actions.setFormSchema(prev);
    syncHistoryState();
  }, [state.formSchema, actions, syncHistoryState]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!future.length) return;
    const next = future[0];
    historyRef.current = {
      past: [...past, state.formSchema],
      future: future.slice(1),
    };
    actions.setFormSchema(next);
    syncHistoryState();
  }, [state.formSchema, actions, syncHistoryState]);

  const canUndo = historySizes.past > 0;
  const canRedo = historySizes.future > 0;

  /* ------------------------------------------------------------------ *
   * Field actions
   * ------------------------------------------------------------------ */
  const addField = (fieldType: FormField["type"], index?: number) => {
    const newField = createFieldFromType(fieldType);
    commitHistory();
    const updatedSchema = addFieldToSchema(
      state.formSchema,
      newField,
      state.selectedBlockId,
      index,
    );
    actions.setFormSchema(updatedSchema);
    actions.setSelectedFieldId(newField.ref ?? null);
    actions.setSelectedScreen(null);
  };

  /**
   * Add anything (question field or content block) from the panels / canvas.
   * Content identifiers ("content_welcome", …) are resolved here so the left
   * sidebar and canvas empty states use the same pipeline as the toolbar.
   */
  const addContentFromPanels = (contentType: string, index?: number) => {
    if (contentType === CONTENT_TYPES.WELCOME) {
      ensureWelcome();
      selectScreen("welcome");
      return;
    }
    if (contentType === CONTENT_TYPES.ENDING) {
      ensureEnding();
      selectScreen("ending");
      return;
    }
    addField(contentType as FormField["type"], index);
  };

  const handleAddField = useCallback(
    (fieldType: FormField["type"], index?: number) => {
      addField(fieldType, index);
      setShowFieldPalette(false);
    },
    [addField],
  );

  const handleFieldSelect = useCallback(
    (fieldId: string | null) => {
      actions.setSelectedFieldId(fieldId);
      if (fieldId) setShowFieldSettings(true);
      else setShowFieldSettings(false);
    },
    [actions],
  );

  const updateField = (updatedField: FormField) => {
    commitHistory();
    const updatedSchema = updateFieldInSchema(state.formSchema, updatedField);
    actions.setFormSchema(updatedSchema);
  };

  const deleteField = (fieldId: string) => {
    commitHistory();
    const updatedSchema = removeFieldFromSchema(state.formSchema, fieldId);
    actions.setFormSchema(updatedSchema);

    if (state.selectedFieldId === fieldId) {
      actions.setSelectedFieldId(null);
    }
  };

  const duplicateField = (fieldId: string) => {
    const fields = state.formSchema.fields ?? [];
    const index = fields.findIndex((f) => f.ref === fieldId);
    if (index < 0) return;
    const original = fields[index];
    const copy: FormField = {
      ...original,
      ref: createFieldId("field"),
      title: original.title,
      properties: original.properties
        ? {
            ...original.properties,
            choices: original.properties.choices?.map((c) => ({ ...c })),
          }
        : undefined,
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);

    commitHistory();
    actions.setFormSchema((prev) => {
      const groups = asBuilderSchema(prev).groups;
      if (!groups?.length) return { ...prev, fields: next };
      const target = groups.find((g) => g.fieldIds.includes(fieldId));
      return {
        ...prev,
        fields: next,
        groups: groups.map((g) => {
          if (!target || g.id !== target.id) return g;
          const ids = [...g.fieldIds];
          const at = ids.indexOf(fieldId);
          ids.splice(at + 1, 0, copy.ref ?? "");
          return { ...g, fieldIds: ids };
        }),
      };
    });
    actions.setSelectedFieldId(copy.ref ?? null);
    actions.setSelectedScreen(null);
  };

  const changeFieldType = (fieldId: string, type: FormField["type"]) => {
    const fields = state.formSchema.fields ?? [];
    const existing = fields.find((f) => f.ref === fieldId);
    if (!existing || existing.type === type) return;

    commitHistory();
    actions.setFormSchema((prev) => ({
      ...prev,
      fields: (prev.fields ?? []).map((f) => {
        if (f.ref !== fieldId) return f;
        const fresh = createFieldFromType(type);
        const keepChoices =
          CHOICE_TYPES.has(f.type) && CHOICE_TYPES.has(type) && f.properties?.choices;
        return {
          ...fresh,
          ref: f.ref,
          title: f.title,
          properties: {
            ...fresh.properties,
            ...(keepChoices ? { choices: f.properties?.choices } : {}),
            description: f.properties?.description,
          },
          validations: { ...f.validations },
        };
      }),
    }));
  };

  const reorderFields = (fields: FormField[]) => {
    commitHistory();
    actions.setFormSchema((prev) => {
      const blocks = getBlocksFromSchema(prev);
      // Reorder applies to the currently selected step, falling back to the first.
      const targetIndex = blocks.findIndex((b) => b.id === state.selectedBlockId);
      const index = targetIndex >= 0 ? targetIndex : 0;
      if (blocks[index]) {
        blocks[index] = { ...blocks[index], fields };
      }
      return syncSchemaFromBlocks(prev, blocks);
    });
  };

  const addBlock = () => {
    commitHistory();
    const blocks = getBlocksFromSchema(state.formSchema);
    const newBlock: FormBlock = {
      id: generateBlockId(),
      title: `Step ${blocks.length + 1}`,
      description: "",
      fields: [],
    };

    actions.setFormSchema((prev) => {
      const current = getBlocksFromSchema(prev);
      const synced = syncSchemaFromBlocks(prev, [...current, newBlock]);
      const blocks = getBlocksFromSchema(synced);
      return {
        ...synced,
        mode: prev.mode || "classic",
        settings: { ...synced.settings, show_progress_bar: blocks.length > 1 },
      };
    });

    actions.setSelectedBlockId(newBlock.id);
  };

  const updateBlocks = (blocks: FormBlock[]) => {
    commitHistory();
    actions.setFormSchema((prev) => syncSchemaFromBlocks(prev, blocks));
  };

  const updateBlock = (blockId: string, updates: Partial<FormBlock>) => {
    commitHistory();
    actions.setFormSchema((prev) => {
      const blocks = getBlocksFromSchema(prev).map((block) =>
        block.id === blockId ? { ...block, ...updates } : block,
      );
      return syncSchemaFromBlocks(prev, blocks);
    });
  };

  const deleteBlock = (blockId: string) => {
    commitHistory();
    actions.setFormSchema((prev) => {
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

    if (state.selectedBlockId === blockId) {
      actions.setSelectedBlockId(null);
    }
  };

  /* ------------------------------------------------------------------ *
   * Screen actions (welcome / ending)
   * ------------------------------------------------------------------ */
  const ensureWelcome = () => {
    if (getWelcomeScreen(state.formSchema)) return;
    actions.setFormSchema((prev) => ({
      ...prev,
      welcome_screens: [
        {
          ref: "welcome",
          title: prev.title || "Welcome!",
          properties: {
            description: "",
            show_button: true,
            button_text: "Start",
          },
        },
      ],
    }));
  };

  const ensureEnding = () => {
    if (getDefaultThankyou(state.formSchema)) return;
    actions.setFormSchema((prev) => ({
      ...prev,
      thankyou_screens: [
        {
          ref: "default_thankyou",
          title: "Thank you for your submission!",
          type: "thankyou_screen",
          properties: {
            show_button: true,
            button_text: "Submit another response",
            button_mode: "reload",
          },
        },
      ],
    }));
  };

  const updateWelcomeScreen = (updates: Partial<WelcomeScreen>) => {
    commitHistory();
    actions.setFormSchema((prev) => {
      const current = (prev.welcome_screens ?? [])[0];
      const merged = current
        ? { ...current, ...updates }
        : { ref: "welcome", title: "Welcome!", ...updates };
      return { ...prev, welcome_screens: [merged] };
    });
  };

  const updateThankyouScreen = (updates: Partial<ThankyouScreen>) => {
    commitHistory();
    actions.setFormSchema((prev) => {
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

  const selectScreen = (screen: SelectedScreen) => {
    actions.setSelectedScreen(screen);
    if (screen) actions.setSelectedFieldId(null);
  };

  /**
   * Delete the intro or thank-you screen. The key is left as an explicit empty
   * array (rather than removed) so normalization keeps it deleted instead of
   * re-seeding a default ending on the next save.
   */
  const removeScreen = (kind: "welcome" | "ending") => {
    commitHistory();
    actions.setFormSchema((prev) => ({
      ...prev,
      welcome_screens: kind === "welcome" ? [] : prev.welcome_screens,
      thankyou_screens: kind === "ending" ? [] : prev.thankyou_screens,
    }));
    actions.setSelectedScreen(null);
  };

  /* ------------------------------------------------------------------ *
   * Add content (from the toolbar command menu)
   * ------------------------------------------------------------------ */
  const handleAddContent = (contentType: string) => {
    if (contentType === CONTENT_TYPES.WELCOME) {
      ensureWelcome();
      selectScreen("welcome");
      return;
    }
    if (contentType === CONTENT_TYPES.ENDING) {
      ensureEnding();
      selectScreen("ending");
      return;
    }
    if (contentType === CONTENT_TYPES.PAGE) {
      addBlock();
      return;
    }
    // Otherwise it's a plain field type.
    addField(contentType as FormField["type"]);
  };

  /* ------------------------------------------------------------------ *
   * Save / publish / share
   * ------------------------------------------------------------------ */
  const handleTitleChange = (title: string) => {
    actions.setFormSchema((prev) => ({ ...prev, title }));
  };

  const updateFormSettings = (settings: Partial<FormSchema["settings"]>) => {
    commitHistory();
    actions.setFormSchema((prev) => {
      const newSchema = {
        ...prev,
        settings: { ...prev.settings, ...settings },
      };

      debouncedAutoSave(newSchema);
      return newSchema;
    });
  };

  /* ------------------------------------------------------------------ *
   * Deferred persistence
   *
   * Editing a question or a setting updates local state immediately but does
   * NOT hit the API on every keystroke. Instead we remember the latest schema
   * and flush it once, when the user moves on — selects another field, step,
   * screen or view — or leaves the builder. This keeps API calls to roughly
   * one per field edited instead of one per character.
   * ------------------------------------------------------------------ */
  const pendingSchemaRef = useRef<FormSchema | null>(null);
  const persistSchemaRef = useRef<(schema: FormSchema) => void>(() => {});

  const persistSchema = async (schema: FormSchema) => {
    if (!(formId && user)) {
      actions.setHasUnsavedChanges(true);
      return;
    }
    try {
      await updateForm(formId, { schema });
      lastSavedSchemaRef.current = schema;
      lastManuallySavedSchemaRef.current = schema;
    } catch (error) {
      console.error("Error saving schema:", error);
      toast.error("Failed to save changes. Please try again.");
      actions.setHasUnsavedChanges(true);
    }
  };
  persistSchemaRef.current = (schema) => {
    void persistSchema(schema);
  };

  const flushPendingSchema = useCallback(() => {
    const pending = pendingSchemaRef.current;
    if (!pending) return;
    pendingSchemaRef.current = null;
    persistSchemaRef.current(pending);
  }, []);

  const prevSelectionRef = useRef({
    field: state.selectedFieldId,
    block: state.selectedBlockId,
    screen: state.selectedScreen,
    view: state.builderView,
  });

  useEffect(() => {
    const prev = prevSelectionRef.current;
    const movedOn =
      prev.field !== state.selectedFieldId ||
      prev.block !== state.selectedBlockId ||
      prev.screen !== state.selectedScreen ||
      prev.view !== state.builderView;
    if (!movedOn) return;
    prevSelectionRef.current = {
      field: state.selectedFieldId,
      block: state.selectedBlockId,
      screen: state.selectedScreen,
      view: state.builderView,
    };
    flushPendingSchema();
  }, [
    state.selectedFieldId,
    state.selectedBlockId,
    state.selectedScreen,
    state.builderView,
    flushPendingSchema,
  ]);

  // Never lose the last edit when the builder unmounts.
  useEffect(() => () => flushPendingSchema(), [flushPendingSchema]);

  const handleSchemaUpdate = async (updates: Partial<FormSchema>) => {
    const updatedSchema = {
      ...state.formSchema,
      ...updates,
      settings: { ...state.formSchema.settings, ...updates.settings },
    };

    actions.setFormSchema(updatedSchema);
    actions.setHasUnsavedChanges(true);
    pendingSchemaRef.current = updatedSchema;
  };

  const saveForm = async () => {
    if (!user) {
      toast.error("Please log in to save your form.");
      return;
    }

    actions.setSaving(true);
    try {
      if (formId && user) {
        await updateForm(formId, { schema: state.formSchema });
        toast.success("Form saved successfully!");
      } else {
        const newForm = await createForm({
          title: state.formSchema.title,
          schema: state.formSchema,
        });
        router.push(`/form-builder/${newForm.id}`);
        toast.success("Form created successfully!");
      }
      removeDraftFromStorage(DRAFT_KEYS.getDraftKey(formId));
    } catch (error) {
      console.error("Error saving form:", error);
      toast.error("Failed to save form. Please try again.");
    } finally {
      actions.setSaving(false);
    }
  };

  const shareForm = () => {
    if (!formId) {
      toast.error("Please save your form before sharing.");
      return;
    }
    actions.setShowShareModal(true);
  };

  const handlePublishForm = async () => {
    if (!(formId && user)) return;

    try {
      await togglePublishForm(formId, true, state.formSchema);
      actions.setIsPublished(true);
      toast.success("Form published successfully!");
    } catch (error) {
      console.error("Error publishing form:", error);
      toast.error("Failed to publish form. Please try again.");
      throw error;
    }
  };

  const viewAnalytics = () => {
    if (!formId) {
      toast.error("Please save your form before viewing analytics.");
      return;
    }
    toast.success("Loading Analytics");
    router.push(`/dashboard/forms/${formId}/analytics`);
  };

  const togglePublish = async () => {
    if (!formId) {
      toast.error("Please save your form before publishing.");
      return;
    }
    if (!user) {
      toast.error("User authentication required");
      return;
    }

    actions.setPublishing(true);
    try {
      const newPublishState = !state.isPublished;
      await togglePublishForm(
        formId,
        newPublishState,
        newPublishState ? state.formSchema : undefined,
      );
      actions.setIsPublished(newPublishState);

      if (newPublishState) {
        toast.success("Form published successfully!");
      } else {
        toast.success("Form unpublished successfully!");
      }
    } catch (error) {
      console.error("Error toggling publish state:", error);
      toast.error("Failed to update form status. Please try again.");
    } finally {
      actions.setPublishing(false);
    }
  };

  const handleStepSelection = (stepIndex: number) => {
    const blocks = getBlocksFromSchema(state.formSchema);
    if (blocks[stepIndex]) {
      actions.setSelectedBlockId(blocks[stepIndex].id);
    }
  };

  /**
   * Classical layout selector: Single Page | Multi-Step.
   */
  const handleLayoutChange = (layout: "single" | "multi") => {
    const blocks = getBlocksFromSchema(state.formSchema);
    commitHistory();

    if (layout === "multi") {
      if (blocks.length <= 1) {
        // A single "default" block is the whole form. Split it into two real
        // steps so the form is genuinely multi-step (isMultiStep requires
        // more than one group) and the layout toggle doesn't flip back.
        const currentFields = blocks[0]?.fields || state.formSchema.fields || [];
        const stepOne: FormBlock = {
          id: "step-1",
          title: "Step 1",
          description: "First step of your form",
          fields: currentFields,
        };
        const stepTwo: FormBlock = {
          id: "step-2",
          title: "Step 2",
          description: "Second step of your form",
          fields: [],
        };
        const synced = syncSchemaFromBlocks(state.formSchema, [stepOne, stepTwo]);
        actions.setFormSchema({
          ...synced,
          mode: "classic",
          settings: { ...synced.settings, show_progress_bar: true },
        });
        actions.setSelectedBlockId("step-1");
      } else {
        actions.setFormSchema((prev) => ({
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
      const synced = syncSchemaFromBlocks(state.formSchema, [defaultBlock]);
      actions.setFormSchema({
        ...synced,
        mode: "classic",
        settings: { ...synced.settings, show_progress_bar: false },
      });
      actions.setSelectedBlockId("default");
    }
  };

  const handleBuilderViewChange = (view: BuilderView) => {
    actions.setBuilderView(view);
    // Settings render inline as a tab now — make sure the legacy modal is closed.
    if (view === "settings") {
      actions.setShowFormSettings(false);
    }
  };

  const closeFormSettings = () => {
    actions.setShowFormSettings(false);
    if (state.builderView === "settings") {
      actions.setBuilderView("build");
    }
  };

  const openPreview = (device?: PreviewDevice) => {
    if (device) setPreviewDevice(device);
    setShowPreviewDialog(true);
  };

  /* ------------------------------------------------------------------ *
   * Keyboard shortcuts
   * ------------------------------------------------------------------ */
  const fields = state.formSchema.fields ?? [];

  useEffect(() => {
    const isEditable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return true;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      );
    };

    const moveSelection = (dir: -1 | 1) => {
      const index = fields.findIndex((f) => f.ref === state.selectedFieldId);
      const nextIndex = index + dir;
      if (nextIndex >= 0 && nextIndex < fields.length) {
        actions.setSelectedScreen(null);
        actions.setSelectedFieldId(fields[nextIndex].ref ?? null);
      } else if (dir === -1 && nextIndex < 0 && getWelcomeScreen(state.formSchema)) {
        actions.setSelectedScreen("welcome");
        actions.setSelectedFieldId(null);
      } else if (dir === 1 && nextIndex >= fields.length && getDefaultThankyou(state.formSchema)) {
        actions.setSelectedScreen("ending");
        actions.setSelectedFieldId(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "s") {
        e.preventDefault();
        saveForm();
        return;
      }
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        if (state.selectedFieldId) duplicateField(state.selectedFieldId);
        return;
      }
      if (isEditable(e.target)) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedFieldId) {
          e.preventDefault();
          deleteField(state.selectedFieldId);
        }
        return;
      }
      if (e.key === "Escape") {
        if (state.selectedFieldId) actions.setSelectedFieldId(null);
        else if (state.selectedScreen) actions.setSelectedScreen(null);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedFieldId, state.selectedScreen, state.formSchema, fields, actions]);

  if (authLoading || state.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <FormBuilderSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 font-bold text-2xl">Authentication Required</h2>
          <p className="mb-6 text-muted-foreground">Please log in to use the form builder.</p>
          <Button onClick={() => router.push("/")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const headerProps = {
    autoSaving: state.autoSaving,
    builderView: state.builderView,
    formId,
    formSchema: state.formSchema,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isPublished: state.isPublished,
    onAnalytics: viewAnalytics,
    onJsonView: () => actions.setShowJsonView(true),
    onPreview: () => openPreview(),
    onPublish: togglePublish,
    onSave: saveForm,
    onSettings: () => actions.setBuilderView("settings"),
    onShare: shareForm,
    onTitleChange: handleTitleChange,
    onViewChange: handleBuilderViewChange,
    publishing: state.publishing,
    saving: state.saving,
  };

  const panelsProps = {
    builderView: state.builderView,
    formId,
    userEmail: user?.email ?? undefined,
    onViewChange: handleBuilderViewChange,
    formSchema: state.formSchema,
    onBlockAdd: addBlock,
    onBlockDelete: deleteBlock,
    onBlockSelect: actions.setSelectedBlockId,
    onBlocksUpdate: updateBlocks,
    onBlockUpdate: updateBlock,
    onFieldAdd: addContentFromPanels,
    onFieldChangeType: changeFieldType,
    onFieldDelete: deleteField,
    onFieldDuplicate: duplicateField,
    onFieldSelect: actions.setSelectedFieldId,
    onFieldsReorder: reorderFields,
    onFieldUpdate: updateField,
    onFormSettingsUpdate: updateFormSettings,
    onSchemaUpdate: handleSchemaUpdate,
    onScreenDelete: removeScreen,
    onScreenSelect: selectScreen,
    onStepSelect: handleStepSelection,
    onThankyouUpdate: updateThankyouScreen,
    onWelcomeUpdate: updateWelcomeScreen,
    selectedBlockId: state.selectedBlockId,
    selectedField: selectedField,
    selectedFieldId: state.selectedFieldId,
    selectedScreen: state.selectedScreen,
  };

  const modalsProps = {
    formId,
    formSchema: state.formSchema,
    formSlug: state.formSlug,
    isPublished: state.isPublished,
    onCloseFormSettings: closeFormSettings,
    onCloseJsonView: () => actions.setShowJsonView(false),
    onCloseSettings: () => actions.setShowSettings(false),
    onCloseShareModal: () => actions.setShowShareModal(false),
    onFormSettingsUpdate: updateFormSettings,
    onPublish: handlePublishForm,
    onSchemaUpdate: handleSchemaUpdate,
    showFormSettings: state.showFormSettings,
    showJsonView: state.showJsonView,
    showSettings: state.showSettings,
    showShareModal: state.showShareModal,
    userEmail: user?.email ?? undefined,
  };

  const previewDialogProps = {
    formSchema: state.formSchema,
    formId,
    slug: state.formSlug,
    open: showPreviewDialog,
    onClose: () => setShowPreviewDialog(false),
    device: previewDevice,
    onDeviceChange: setPreviewDevice,
    skipWelcome: true,
    selectedFieldRef: state.selectedFieldId,
  };

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <div className="sticky top-0 z-30 bg-card">
          <FormBuilderHeader {...headerProps} />
        </div>
        {/* Content switches with the bottom-nav view so each tab does real
            work on mobile instead of only recolouring the header. */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            {state.builderView === "build" ? (
              <FormPreview
                onAddField={addField}
                onBlockAdd={addBlock}
                onBlockDelete={deleteBlock}
                onBlockUpdate={updateBlock}
                onFieldDelete={deleteField}
                onFieldSelect={handleFieldSelect}
                onFieldsReorder={reorderFields}
                onFormSettingsUpdate={updateFormSettings}
                onStepSelect={handleStepSelection}
                schema={state.formSchema}
                selectedBlockId={state.selectedBlockId}
                selectedFieldId={state.selectedFieldId}
              />
            ) : state.builderView === "design" ? (
              <DesignTab
                formSchema={state.formSchema}
                onFormSettingsUpdate={updateFormSettings}
                onSchemaUpdate={handleSchemaUpdate}
              />
            ) : state.builderView === "logic" ? (
              <LogicBuilderView schema={state.formSchema} onSchemaUpdate={handleSchemaUpdate} />
            ) : (
              <FormSettingsPanel
                formId={formId}
                onBack={() => handleBuilderViewChange("build")}
                onSchemaUpdate={handleSchemaUpdate}
                schema={state.formSchema}
                userEmail={user?.email ?? undefined}
              />
            )}
          </div>

          {/* Floating add-question button — the mobile counterpart of the
              desktop "+ Add content" toolbar. */}
          {state.builderView === "build" && (
            <button
              aria-label="Add question"
              className="absolute bottom-4 right-4 z-20 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
              onClick={() => setShowFieldPalette(true)}
              type="button"
            >
              <Plus className="size-5" />
            </button>
          )}
        </div>
        <BuilderBottomNav activeView={state.builderView} onViewChange={handleBuilderViewChange} />
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
            if (!open) actions.setSelectedFieldId(null);
          }}
          open={showFieldSettings}
        >
          <DrawerContent className="mx-auto w-full rounded-t-2xl p-0">
            <div className="flex h-[80vh] flex-col">
              <FieldSettingsPanel
                field={selectedField}
                formMode="classic"
                formSchema={state.formSchema}
                onClose={() => {
                  setShowFieldSettings(false);
                  actions.setSelectedFieldId(null);
                }}
                onFieldChangeType={changeFieldType}
                onSchemaUpdate={handleSchemaUpdate}
                onFieldUpdate={updateField}
              />
            </div>
          </DrawerContent>
        </Drawer>
        <FormBuilderModals {...modalsProps} />
        <PreviewWorkspace {...previewDialogProps} />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <FormBuilderHeader {...headerProps} />

      {state.builderView === "build" && (
        <BuilderToolbar
          canRedo={canRedo}
          canUndo={canUndo}
          formSchema={state.formSchema}
          onAddContent={handleAddContent}
          onLayoutChange={handleLayoutChange}
          onPreview={openPreview}
          onRedo={redo}
          onUndo={undo}
        />
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        <FormBuilderPanels {...panelsProps} />
      </div>

      <FormBuilderModals {...modalsProps} />

      <PreviewWorkspace {...previewDialogProps} />

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
          if (!open) actions.setSelectedFieldId(null);
        }}
        open={showFieldSettings}
      >
        <DrawerContent className="mx-auto w-full rounded-t-2xl p-0">
          <div className="flex h-[80vh] flex-col">
            <FieldSettingsPanel
              field={selectedField}
              formMode="classic"
              formSchema={state.formSchema}
              onClose={() => {
                setShowFieldSettings(false);
                actions.setSelectedFieldId(null);
              }}
              onFieldChangeType={changeFieldType}
              onSchemaUpdate={handleSchemaUpdate}
              onFieldUpdate={updateField}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
