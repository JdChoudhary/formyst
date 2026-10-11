import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

import type { FormSchema } from "@repo/shared";
import { normalizeFormSchema } from "@repo/shared";

import { useGetForm, useUpdateForm } from "@/hooks/api/form";
import { createDefaultFormSchema, ensureDefaultRateLimitSettings } from "@/lib/forms";

import { DRAFT_KEYS, FORM_BUILDER_CONSTANTS } from "../constants";
import type { FormBuilderActions, FormBuilderState } from "../types";
import {
  ensureFieldRefs,
  findSelectedField,
  hasFormChanges,
  loadDraftFromStorage,
  removeDraftFromStorage,
  saveDraftToStorage,
} from "../utils";

export const useFormBuilder = (formId?: string) => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useGetForm(formId ?? "");
  const { updateForm } = useUpdateForm();

  const [state, setState] = useState<FormBuilderState>({
    loading: false,
    saving: false,
    autoSaving: false,
    publishing: false,
    isPublished: false,
    hasUnsavedChanges: false,
    selectedFieldId: null,
    selectedBlockId: null,
    selectedScreen: null,
    builderView: "build",
    showSettings: false,
    showFormSettings: false,
    showJsonView: false,
    showShareModal: false,
    formSlug: null,
    formSchema: createDefaultFormSchema({
      title: FORM_BUILDER_CONSTANTS.DEFAULT_FORM_TITLE,
      description: FORM_BUILDER_CONSTANTS.DEFAULT_FORM_DESCRIPTION,
    }),
  });

  const draftKey = DRAFT_KEYS.getDraftKey(formId);
  const isRestored = useRef(false);
  const isFormLoaded = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSchemaRef = useRef<FormSchema | null>(null);
  const lastManuallySavedSchemaRef = useRef<FormSchema | null>(null);

  const actions: FormBuilderActions = {
    setLoading: (loading) => setState((prev) => ({ ...prev, loading })),
    setSaving: (saving) => setState((prev) => ({ ...prev, saving })),
    setAutoSaving: (autoSaving) => setState((prev) => ({ ...prev, autoSaving })),
    setPublishing: (publishing) => setState((prev) => ({ ...prev, publishing })),
    setIsPublished: (isPublished) => setState((prev) => ({ ...prev, isPublished })),
    setHasUnsavedChanges: (hasUnsavedChanges) =>
      setState((prev) => ({ ...prev, hasUnsavedChanges })),
    setSelectedFieldId: (selectedFieldId) => setState((prev) => ({ ...prev, selectedFieldId })),
    setSelectedBlockId: (selectedBlockId) => setState((prev) => ({ ...prev, selectedBlockId })),
    setSelectedScreen: (selectedScreen) => setState((prev) => ({ ...prev, selectedScreen })),
    setBuilderView: (builderView) => setState((prev) => ({ ...prev, builderView })),
    setShowSettings: (showSettings) => setState((prev) => ({ ...prev, showSettings })),
    setShowFormSettings: (showFormSettings) => setState((prev) => ({ ...prev, showFormSettings })),
    setShowJsonView: (showJsonView) => setState((prev) => ({ ...prev, showJsonView })),
    setShowShareModal: (showShareModal) => setState((prev) => ({ ...prev, showShareModal })),
    setFormSlug: (formSlug) => setState((prev) => ({ ...prev, formSlug })),
    setFormSchema: (schema) =>
      setState((prev) => ({
        ...prev,
        formSchema: typeof schema === "function" ? schema(prev.formSchema) : schema,
      })),
  };

  useEffect(() => {
    if (isRestored.current) return;
    isRestored.current = true;

    const draft = loadDraftFromStorage(draftKey);
    if (draft) {
      actions.setFormSchema(ensureFieldRefs(draft));
    }
  }, [draftKey]);

  useEffect(() => {
    saveDraftToStorage(draftKey, state.formSchema);
  }, [state.formSchema, draftKey]);

  useEffect(() => {
    if (formId && user && !isFormLoaded.current) {
      loadForm();
    }
  }, [formId, user]);

  useEffect(() => {
    isFormLoaded.current = false;
  }, [formId]);

  useEffect(
    () => () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const hasChanges = hasFormChanges(state.formSchema, lastManuallySavedSchemaRef.current);
    actions.setHasUnsavedChanges(hasChanges);
  }, [state.formSchema]);

  useEffect(() => {
    const imported = localStorage.getItem(DRAFT_KEYS.IMPORTED_FORM_SCHEMA);
    if (imported) {
      try {
        const schema = JSON.parse(imported);
        const normalizedSchema = {
          fields: Array.isArray(schema.fields) ? schema.fields : [],
          settings:
            typeof schema.settings === "object" && schema.settings
              ? {
                  title: schema.settings.title || FORM_BUILDER_CONSTANTS.DEFAULT_FORM_TITLE,
                  description:
                    schema.settings.description || FORM_BUILDER_CONSTANTS.DEFAULT_FORM_DESCRIPTION,
                  submitText:
                    schema.settings.submitText || FORM_BUILDER_CONSTANTS.DEFAULT_SUBMIT_TEXT,
                  successMessage:
                    schema.settings.successMessage ||
                    FORM_BUILDER_CONSTANTS.DEFAULT_SUCCESS_MESSAGE,
                  redirectUrl:
                    schema.settings.redirectUrl || FORM_BUILDER_CONSTANTS.DEFAULT_REDIRECT_URL,
                  showProgress:
                    "showProgress" in schema.settings ? !!schema.settings.showProgress : true,
                  ...schema.settings,
                }
              : {
                  title: FORM_BUILDER_CONSTANTS.DEFAULT_FORM_TITLE,
                  description: FORM_BUILDER_CONSTANTS.DEFAULT_FORM_DESCRIPTION,
                  submitText: FORM_BUILDER_CONSTANTS.DEFAULT_SUBMIT_TEXT,
                  successMessage: FORM_BUILDER_CONSTANTS.DEFAULT_SUCCESS_MESSAGE,
                  redirectUrl: FORM_BUILDER_CONSTANTS.DEFAULT_REDIRECT_URL,
                  showProgress: true,
                },
        };

        try {
          actions.setFormSchema(
            ensureFieldRefs(ensureDefaultRateLimitSettings(normalizeFormSchema(normalizedSchema))),
          );
        } catch {
          // Malformed imported schema — fall back to a fresh form.
          actions.setFormSchema(
            createDefaultFormSchema({
              title: schema.settings?.title || FORM_BUILDER_CONSTANTS.DEFAULT_FORM_TITLE,
            }),
          );
        }
        actions.setHasUnsavedChanges(true);
      } catch {}
      localStorage.removeItem(DRAFT_KEYS.IMPORTED_FORM_SCHEMA);
    }
  }, []);

  const loadForm = async () => {
    if (!(formId && user) || isFormLoaded.current) return;

    actions.setLoading(true);
    try {
      const result = await refetch();
      const detail = result.data;
      if (!detail) throw new Error("Form not found");

      const schema = ensureFieldRefs(
        ensureDefaultRateLimitSettings(
          detail.schema ?? createDefaultFormSchema({ title: detail.title }),
        ),
      );
      actions.setFormSchema(schema);
      actions.setIsPublished(detail.isPublished);
      actions.setFormSlug(detail.slug || null);
      lastSavedSchemaRef.current = {
        ...schema,
        fields: [...schema.fields],
      };
      lastManuallySavedSchemaRef.current = {
        ...schema,
        fields: [...schema.fields],
      };
      isFormLoaded.current = true;

      removeDraftFromStorage(draftKey);
    } catch (error) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form. Please try again.");
    } finally {
      actions.setLoading(false);
    }
  };

  const lastAutoSavedHashRef = useRef<string>("");

  const debouncedAutoSave = async (schema: FormSchema) => {
    if (!(formId && user) || state.saving || state.autoSaving) return;

    const schemaHash = JSON.stringify(schema);
    if (schemaHash === lastAutoSavedHashRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      const currentHash = JSON.stringify(schema);
      if (currentHash === lastAutoSavedHashRef.current) return;

      actions.setAutoSaving(true);
      try {
        await updateForm(formId, { schema });
        lastSavedSchemaRef.current = schema;
        lastAutoSavedHashRef.current = currentHash;
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        actions.setAutoSaving(false);
      }
    }, FORM_BUILDER_CONSTANTS.AUTOSAVE_DELAY);
  };

  const selectedField = findSelectedField(state.formSchema, state.selectedFieldId);

  return {
    state,
    actions,
    selectedField,
    user,
    authLoading,
    debouncedAutoSave,
    loadForm,
    lastSavedSchemaRef,
    lastManuallySavedSchemaRef,
  };
};
