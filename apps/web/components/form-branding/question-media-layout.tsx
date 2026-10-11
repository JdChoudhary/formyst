"use client";

import type { ReactNode } from "react";
import type { FormField } from "@repo/shared";
import { AttachmentMedia } from "@/components/form-builder/form-field-renderer/components/attachment-media";
import { cn } from "@/lib/utils";

interface QuestionMediaLayoutProps {
  field: FormField;
  /** The answer control (input/choices) rendered in the content column. */
  children: ReactNode;
  /**
   * Custom placement of the media node. Defaults to a sensible spot for the
   * configured layout — split/float put it beside the content, stack below,
   * wallpaper behind. When provided, the caller fully controls ordering.
   */
  renderMedia?: (media: ReactNode) => ReactNode;
  /** Whether the question title is rendered by the caller above the layout. */
  titleAbove?: boolean;
}

function AttachmentMediaView({ field }: { field: FormField }) {
  const attachment = field.attachment ?? field.layout?.attachment;
  const layoutType = field.layout?.type;
  const isWallpaper = layoutType === "wallpaper";
  return (
    <AttachmentMedia
      attachment={attachment}
      className={cn(
        "w-full rounded-2xl",
        isWallpaper ? "h-full w-full object-cover" : "max-h-72 w-full object-contain",
      )}
    />
  );
}

/**
 * Question-specific media placement. The media always derives from the
 * current field only — it can never leak from a previous screen. Layouts
 * (stack / split / float / wallpaper) collapse to a stacked column on small
 * screens, and wallpaper applies the image as the screen background.
 */
export function QuestionMediaLayout({ field, children, renderMedia }: QuestionMediaLayoutProps) {
  const attachment = field.attachment ?? field.layout?.attachment;
  if (!attachment?.href) return <>{children}</>;

  const layoutType = field.layout?.type ?? "stack";
  const placement = field.layout?.placement ?? "left";

  const mediaNode = (
    <div className="min-w-0">
      <AttachmentMediaView field={field} />
    </div>
  );

  if (layoutType === "wallpaper") {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl">
        <div className="absolute inset-0 z-0">
          <AttachmentMedia attachment={attachment} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 p-6 text-white sm:p-8">{children}</div>
      </div>
    );
  }

  if (layoutType === "split") {
    return (
      <div
        className={cn(
          "grid items-center gap-5 sm:gap-6",
          placement === "right"
            ? "sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            : "sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
        )}
      >
        {placement === "right" ? (
          <>
            <div className="flex min-w-0 flex-col gap-5 sm:gap-6">{children}</div>
            {mediaNode}
          </>
        ) : (
          <>
            {mediaNode}
            <div className="flex min-w-0 flex-col gap-5 sm:gap-6">{children}</div>
          </>
        )}
      </div>
    );
  }

  if (layoutType === "float") {
    return (
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="w-full shrink-0 sm:w-48">{mediaNode}</div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  // stack — media above the answer, question content is rendered by caller
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {renderMedia ? (
        renderMedia(mediaNode)
      ) : (
        <>
          <div className="flex justify-center">{mediaNode}</div>
          {children}
        </>
      )}
    </div>
  );
}
