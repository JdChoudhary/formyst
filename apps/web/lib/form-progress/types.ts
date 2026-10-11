export interface FormFieldEvent {
  fieldId?: string | null;
  eventType: "view" | "focus" | "blur" | "change" | "step";
  value?: unknown;
  timeSpentMs?: number;
}

export interface FormProgress {
  id: string;
  formId: string;
  userId?: string;
  sessionId: string;
  formData: Record<string, any>;
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  /** Last field the respondent interacted with (drives field-level drop-off). */
  lastFieldId?: string | null;
  /** True when the last save only reached local storage (offline). */
  offline?: boolean;
  /** Pending field events queued for the next save. */
  events?: FormFieldEvent[];
  lastUpdated: Date;
  expiresAt: Date;
}

export interface FormProgressState {
  progress: FormProgress | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export interface FormProgressActions {
  saveProgress: (
    formData: Record<string, any>,
    currentStep?: number,
    totalSteps?: number,
    lastFieldId?: string | null,
  ) => Promise<void>;
  /** Immediate (non-debounced) save — used by the manual "Save now" button. */
  saveNow: (
    formData: Record<string, any>,
    currentStep?: number,
    totalSteps?: number,
    lastFieldId?: string | null,
  ) => Promise<void>;
  loadProgress: () => Promise<void>;
  clearProgress: () => Promise<void>;
  restoreProgress: () => void;
  /** Queue a field/step event to be flushed with the next save. */
  recordEvent: (event: FormFieldEvent) => void;
  /** Returns and clears queued events (used to attach them to a submit). */
  flushEvents: () => FormFieldEvent[];
}

export interface SaveProgressOptions {
  debounceMs?: number;
  maxRetries?: number;
  skipFields?: string[];
  enableAutoSave?: boolean;
}

export interface ProgressStorageAdapter {
  save: (key: string, data: FormProgress) => Promise<void>;
  load: (key: string) => Promise<FormProgress | null>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface FormProgressConfig {
  enabled: boolean;
  storage: "localStorage" | "sessionStorage" | "indexedDB" | "server";
  autoSaveInterval: number;
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}
