"use client";

import { toast as sonnerToast } from "sonner";

/**
 * Toast helpers used throughout the form-builder. Backed by sonner — the
 * <Toaster /> component is already mounted in the global providers.
 */
export const toast = sonnerToast;
export type { ToasterProps } from "sonner";
