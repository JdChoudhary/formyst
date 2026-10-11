"use client"

import { FileUpIcon, Loader2Icon, UploadCloudIcon } from "lucide-react"
import { useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface FileUploadProps {
  accept?: string;
  className?: string;
  disabled?: boolean;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  onUpload?: (files: File[]) => Promise<void> | void;
  showPreview?: boolean;
}

export function FileUpload({
  accept = "*",
  className,
  disabled,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024,
  multiple = true,
  onUpload,
  showPreview = true,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, maxFiles);
    setBusy(true);
    try {
      await onUpload?.(files);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      aria-disabled={disabled || busy}
      className={cn(
        "relative flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40",
        dragging && "border-primary bg-primary/5",
        (disabled || busy) && "pointer-events-none cursor-not-allowed opacity-60",
        className
      )}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) void handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={disabled || busy ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        accept={accept}
        className="sr-only"
        disabled={disabled || busy}
        multiple={multiple}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
        type="file"
      />
      {busy ? (
        <Loader2Icon aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
      ) : dragging ? (
        <UploadCloudIcon aria-hidden="true" className="size-8 text-primary" />
      ) : (
        <FileUpIcon aria-hidden="true" className="size-8 text-muted-foreground" />
      )}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">
          {dragging ? "Drop files here" : "Click to upload or drag & drop"}
        </p>
        <p className="text-xs text-muted-foreground">
          Up to {maxFiles} file{maxFiles !== 1 ? "s" : ""} · max{" "}
          {Math.round(maxSize / 1024 / 1024)}MB each
        </p>
      </div>
    </div>
  );
}
