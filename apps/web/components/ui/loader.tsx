import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZE_CLASSES = {
  sm: "size-4",
  md: "size-8",
  lg: "size-12",
} as const;

export function Loader({ className, size = "md", label }: LoaderProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label ?? "Loading"}
      className={cn("flex items-center justify-center", className)}
      role="status"
    >
      <Loader2Icon
        aria-hidden="true"
        className={cn("animate-spin text-muted-foreground", SIZE_CLASSES[size])}
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
