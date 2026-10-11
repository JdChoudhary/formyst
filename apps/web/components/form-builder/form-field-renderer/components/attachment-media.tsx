import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@repo/shared";

interface AttachmentMediaProps {
  attachment?: Attachment | null;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

/**
 * Renders an attachment as an image or video depending on its type.
 * Used everywhere the builder/runtime shows question or screen media.
 * Videos show a clean fallback instead of a broken player when they fail.
 */
export function AttachmentMedia({
  attachment,
  className,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
}: AttachmentMediaProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  if (!attachment?.href) return null;

  const description = attachment.properties?.description ?? "";

  if (attachment.type === "video") {
    if (videoFailed) {
      return (
        <div
          className={cn(
            "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-accent text-muted-foreground",
            className,
          )}
          role="img"
        >
          <AlertTriangle className="size-6 opacity-70" />
          <span className="px-4 text-center text-sm">Unable to load this video.</span>
        </div>
      );
    }
    return (
      <video
        autoPlay={autoPlay}
        className={cn("rounded-2xl bg-accent", className)}
        controls={controls}
        loop={loop}
        muted={muted}
        onError={() => setVideoFailed(true)}
        playsInline
        preload="metadata"
        src={attachment.href}
      />
    );
  }

  return (
    <img
      alt={description}
      className={cn("object-contain", className)}
      loading="lazy"
      src={attachment.href}
    />
  );
}
