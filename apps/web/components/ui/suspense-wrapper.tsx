"use client";

import { Suspense, type ReactNode } from "react";

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * Thin client wrapper around React's `Suspense` that also applies a layout
 * class. Kept because several pages stream a skeleton while a client tree
 * hydrates.
 */
export function SuspenseWrapper({ children, fallback = null, className }: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      <div className={className}>{children}</div>
    </Suspense>
  );
}
