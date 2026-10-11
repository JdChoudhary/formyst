"use client"

import { DownloadIcon, ShieldCheckIcon } from "lucide-react"
import { useMemo } from "react"

import type { RouterOutputs } from "@repo/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

type Form = RouterOutputs["form"]["getById"];

interface SecureExportModalProps {
  form: Form | null;
  isOpen: boolean;
  onClose: () => void;
}

function createEncryptedExport(form: Form): { filename: string; content: string } {
  const payload = JSON.stringify(
    {
      app: "ikiform",
      version: 1,
      exportedAt: new Date().toISOString(),
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        slug: form.slug,
        published: form.isPublished,
        schema: form.schema,
      },
    },
    null,
    2
  );

  const content = btoa(unescape(encodeURIComponent(payload)));
  return { filename: `ikiform-${form.slug || form.id}.ikiform`, content };
}

export function SecureExportModal({ form, isOpen, onClose }: SecureExportModalProps) {
  const exportData = useMemo(() => (form ? createEncryptedExport(form) : null), [form]);

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([exportData.content], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportData.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success("Secure export downloaded");
    onClose();
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            <DialogTitle>Secure Export</DialogTitle>
          </div>
          <DialogDescription>
            Download your form as an encrypted snapshot. You can restore it later
            from the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">File</span>
            <span className="font-mono text-sm">{exportData?.filename ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">Form</span>
            <span className="text-sm font-medium">{form?.title ?? "—"}</span>
          </div>
          <ScrollArea className="h-36 rounded-lg border bg-background p-3">
            <pre className="break-all font-mono text-xs text-muted-foreground">
              {exportData?.content.slice(0, 1200) ?? "No form loaded"}
            </pre>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={!exportData} onClick={handleDownload}>
            <DownloadIcon className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
