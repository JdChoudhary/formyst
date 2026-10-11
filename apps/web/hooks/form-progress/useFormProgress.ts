import { useCallback, useEffect, useRef, useState } from "react";
import { FormProgressStorage } from "../../lib/form-progress/storage";
import type {
  FormFieldEvent,
  FormProgressActions,
  FormProgressConfig,
  FormProgressState,
  SaveProgressOptions,
} from "../../lib/form-progress/types";

const DEFAULT_CONFIG: FormProgressConfig = {
  enabled: true,
  storage: "localStorage",
  autoSaveInterval: 1000,
  retentionDays: 7,
  compressionEnabled: false,
  encryptionEnabled: false,
};

const DEFAULT_SAVE_OPTIONS: SaveProgressOptions = {
  debounceMs: 500,
  maxRetries: 3,
  skipFields: [],
  enableAutoSave: true,
};

export function useFormProgress(
  formId: string,
  totalFields: number,
  config: Partial<FormProgressConfig> = {},
  options: Partial<SaveProgressOptions> = {},
): FormProgressState & FormProgressActions & { sessionId: string | null } {
  const [state, setState] = useState<FormProgressState>({
    progress: null,
    loading: false,
    saving: false,
    error: null,
  });
  const [sessionId, setSessionId] = useState<string | null>(null);

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const finalOptions = { ...DEFAULT_SAVE_OPTIONS, ...options };

  const storageRef = useRef<FormProgressStorage | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<FormFieldEvent[]>([]);

  useEffect(() => {
    if (!storageRef.current) {
      storageRef.current = new FormProgressStorage(finalConfig);

      const existingSessionKey = `ikiform_session_${formId}`;
      const existingSessionId = localStorage.getItem(existingSessionKey);

      if (existingSessionId) {
        sessionIdRef.current = existingSessionId;
        setSessionId(existingSessionId);
      } else {
        sessionIdRef.current = storageRef.current.generateSessionId();
        localStorage.setItem(existingSessionKey, sessionIdRef.current);
        setSessionId(sessionIdRef.current);
      }
    }
  }, [finalConfig, formId]);

  const recordEvent = useCallback((event: FormFieldEvent) => {
    if (eventsRef.current.length >= 1000) {
      eventsRef.current.shift();
    }
    eventsRef.current.push(event);
  }, []);

  const flushEvents = useCallback(() => {
    const events = [...eventsRef.current];
    eventsRef.current = [];
    return events;
  }, []);

  /** Core (non-debounced) save. Flushes queued field events. */
  const persist = useCallback(
    async (
      formData: Record<string, any>,
      currentStep = 0,
      totalSteps = 1,
      lastFieldId?: string | null,
    ) => {
      if (!(storageRef.current && sessionIdRef.current && finalConfig.enabled)) return;

      try {
        setState((prev: FormProgressState) => ({
          ...prev,
          saving: true,
          error: null,
        }));

        const filteredFormData = { ...formData };
        finalOptions.skipFields?.forEach((fieldId: string) => {
          delete filteredFormData[fieldId];
        });

        const progress = storageRef.current.createProgress(
          formId,
          sessionIdRef.current,
          filteredFormData,
          currentStep,
          totalSteps,
          undefined,
          lastFieldId,
        );
        progress.events = [...eventsRef.current];

        await storageRef.current.saveProgress(progress);
        eventsRef.current = [];

        setState((prev: FormProgressState) => ({
          ...prev,
          progress,
          saving: false,
          error: null,
        }));
      } catch (error) {
        setState((prev: FormProgressState) => ({
          ...prev,
          saving: false,
          error:
            error instanceof Error ? error.message : "Failed to save progress",
        }));
      }
    },
    [finalConfig.enabled, formId, finalOptions.skipFields],
  );

  const saveProgress = useCallback(
    async (
      formData: Record<string, any>,
      currentStep = 0,
      totalSteps = 1,
      lastFieldId?: string | null,
    ) => {
      if (!finalOptions.enableAutoSave) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      return new Promise<void>((resolve) => {
        saveTimeoutRef.current = setTimeout(async () => {
          await persist(formData, currentStep, totalSteps, lastFieldId);
          resolve();
        }, finalOptions.debounceMs);
      });
    },
    [finalOptions.debounceMs, finalOptions.enableAutoSave, persist],
  );

  /** Immediate save — used by the manual "Save now" button. */
  const saveNow = useCallback(
    async (
      formData: Record<string, any>,
      currentStep = 0,
      totalSteps = 1,
      lastFieldId?: string | null,
    ) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await persist(formData, currentStep, totalSteps, lastFieldId);
    },
    [persist],
  );

  const loadProgress = useCallback(async () => {
    if (!(storageRef.current && sessionIdRef.current && finalConfig.enabled)) {
      return;
    }

    try {
      setState((prev: FormProgressState) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const progress = await storageRef.current.loadProgress(
        formId,
        sessionIdRef.current,
      );

      setState((prev: FormProgressState) => ({
        ...prev,
        progress,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev: FormProgressState) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load progress",
      }));
    }
  }, [finalConfig.enabled, formId]);

  const clearProgress = useCallback(async () => {
    if (!(storageRef.current && sessionIdRef.current)) return;

    try {
      await storageRef.current.deleteProgress(formId, sessionIdRef.current);

      const existingSessionKey = `ikiform_session_${formId}`;
      localStorage.removeItem(existingSessionKey);

      eventsRef.current = [];

      setState((prev: FormProgressState) => ({
        ...prev,
        progress: null,
        error: null,
      }));
    } catch (error) {
      setState((prev: FormProgressState) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to clear progress",
      }));
    }
  }, [formId]);

  const restoreProgress = useCallback(() => {}, []);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (
      !hasLoadedRef.current &&
      finalConfig.enabled &&
      storageRef.current &&
      sessionIdRef.current
    ) {
      hasLoadedRef.current = true;
      loadProgress();
    }
  }, [finalConfig.enabled, loadProgress]);

  const lastSavedDataRef = useRef<string>("");

  useEffect(() => {
    if (finalConfig.autoSaveInterval > 0) {
      autoSaveIntervalRef.current = setInterval(() => {
        if (state.progress) {
          const currentData = JSON.stringify(state.progress.formData);
          if (currentData !== lastSavedDataRef.current) {
            lastSavedDataRef.current = currentData;
            persist(
              state.progress.formData,
              state.progress.currentStep,
              state.progress.totalSteps,
              state.progress.lastFieldId,
            );
          }
        }
      }, finalConfig.autoSaveInterval);

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    }
  }, [finalConfig.autoSaveInterval, state.progress, persist]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    },
    [],
  );

  return {
    ...state,
    sessionId,
    saveProgress,
    saveNow,
    loadProgress,
    clearProgress,
    restoreProgress,
    recordEvent,
    flushEvents,
  };
}
