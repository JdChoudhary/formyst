import type React from "react";
import { useState } from "react";
import { Clapperboard, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Attachment, FormField } from "@repo/shared";

interface MediaSettingsProps {
  field: FormField;
  onFieldUpdate: (field: FormField) => void;
}

/**
 * Question media — image/video attached to a question as presentation media.
 * Conversational only. URL-based (the application does not support uploads).
 * An attachment is only persisted once a valid URL exists.
 */
export const MediaSettings: React.FC<MediaSettingsProps> = ({ field, onFieldUpdate }) => {
  const attachment = field.attachment ?? field.layout?.attachment;
  const [addingType, setAddingType] = useState<"image" | "video" | null>(null);
  const [draftUrl, setDraftUrl] = useState("");

  const persistAttachment = (updates: Partial<Attachment>) => {
    const next: Attachment = {
      ...(attachment ?? { type: "image", href: "" }),
      ...updates,
    };
    if (!next.href) return;
    onFieldUpdate({
      ...field,
      attachment: undefined,
      layout: {
        ...(field.layout ?? { type: "stack" }),
        attachment: next,
      },
    });
  };

  const removeAttachment = () => {
    if (field.layout) {
      onFieldUpdate({
        ...field,
        attachment: undefined,
        layout: { ...field.layout, attachment: undefined },
      });
    } else {
      onFieldUpdate({ ...field, attachment: undefined });
    }
  };

  const confirmAdd = () => {
    if (!addingType || !draftUrl.trim()) return;
    persistAttachment({ type: addingType, href: draftUrl.trim() });
    setAddingType(null);
    setDraftUrl("");
  };

  return (
    <div className="flex flex-col gap-3">
      {attachment ? (
        <>
          <div className="flex gap-2">
            <button
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                attachment.type === "image"
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => persistAttachment({ type: "image" })}
              type="button"
            >
              <ImageIcon className="size-3.5" />
              Image
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                attachment.type === "video"
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => persistAttachment({ type: "video" })}
              type="button"
            >
              <Clapperboard className="size-3.5" />
              Video
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" htmlFor="media-url">
              {attachment.type === "video" ? "Video URL" : "Image URL"}
            </Label>
            <Input
              id="media-url"
              onChange={(e) => persistAttachment({ href: e.target.value })}
              placeholder={
                attachment.type === "video"
                  ? "https://example.com/video.mp4"
                  : "https://example.com/image.jpg"
              }
              type="url"
              value={attachment.href}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" htmlFor="media-description">
              Description / Alt text (optional)
            </Label>
            <Textarea
              className="resize-none"
              id="media-description"
              onChange={(e) =>
                persistAttachment({
                  properties: {
                    ...(attachment.properties ?? {}),
                    description: e.target.value,
                  },
                })
              }
              placeholder="Describe this media..."
              rows={2}
              value={attachment.properties?.description ?? ""}
            />
          </div>

          <Button
            className="gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={removeAttachment}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
            Remove media
          </Button>
        </>
      ) : addingType ? (
        <>
          <p className="text-xs text-muted-foreground">
            Paste the {addingType} URL below. The application does not support uploads.
          </p>
          <Input
            autoFocus
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmAdd();
              }
              if (e.key === "Escape") setAddingType(null);
            }}
            placeholder={
              addingType === "image"
                ? "https://example.com/image.jpg"
                : "https://example.com/video.mp4"
            }
            type="url"
            value={draftUrl}
          />
          <div className="flex gap-2">
            <Button disabled={!draftUrl.trim()} onClick={confirmAdd} size="sm">
              Add {addingType}
            </Button>
            <Button onClick={() => setAddingType(null)} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            onClick={() => setAddingType("image")}
            type="button"
          >
            <ImageIcon className="size-4" />
            Image
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            onClick={() => setAddingType("video")}
            type="button"
          >
            <Clapperboard className="size-4" />
            Video
          </button>
        </div>
      )}
    </div>
  );
};
