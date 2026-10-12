"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Code2,
  Copy,
  Download,
  ExternalLink,
  EyeOff,
  Globe,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { RouterOutputs } from "@repo/trpc/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationModal } from "@/components/dashboard/modals/form-delete-confirmation-modal";
import { ShareFormModal } from "@/components/form-builder/modals/share-form-modal";
import { exportToCSV, exportToJSON } from "@/components/forms/form-analytics/utils";
import { useDeleteForm, useDuplicateForm, useFormExport, useTogglePublishForm } from "@/hooks/api/form";

type FormSummary = RouterOutputs["form"]["getAll"][number];

interface FormActionsMenuProps {
  form: FormSummary;
  align?: "start" | "end";
  showQuickActions?: boolean;
  onDeleted?: () => void;
}

export function FormActionsMenu({
  form,
  align = "end",
  showQuickActions = true,
  onDeleted,
}: FormActionsMenuProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  const duplicate = useDuplicateForm({
    onSuccess: () => toast.success("Form duplicated"),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to duplicate form"),
  });

  const { deleteForm } = useDeleteForm({
    onSuccess: () => {
      toast.success("Form deleted");
      onDeleted?.();
    },
  });

  const { togglePublish, isPending: publishPending } = useTogglePublishForm();
  const { fetchExportData, isExporting: exportFetching } = useFormExport();

  const handleSharePublish = async () => {
    try {
      await togglePublish(form.id, true);
      toast.success("Form published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish form");
    }
  };

  const handleTogglePublish = () => {
    const next = !form.isPublished;
    void togglePublish(form.id, next)
      .then(() => toast.success(next ? "Form published" : "Form unpublished"))
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to update publish state",
        ),
      );
  };

  const handleExport = async (type: "csv" | "json") => {
    setExporting(type);
    try {
      const { form: exportForm, submissions } = await fetchExportData(form.id);
      if (type === "csv") {
        exportToCSV(exportForm, submissions);
      } else {
        exportToJSON(exportForm, submissions);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  const stopPropagation = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <>
      <div
        className="flex items-center gap-1"
        onClick={stopPropagation}
        onKeyDown={stopPropagation}
      >
        {showQuickActions ? (
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={`/form-builder/${form.id}`} />}
            nativeButton={false}
            aria-label="Edit form"
            title="Edit form"
          >
            <Pencil className="size-4" />
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button aria-label="More actions" variant="ghost" size="icon-sm" title="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          ></DropdownMenuTrigger>
          <DropdownMenuContent align={align} sideOffset={4} className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{form.title}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <Link href={`/form-builder/${form.id}`}>
                    <Pencil className="size-4 shrink-0" />
                    <span>Edit form</span>
                  </Link>
                }
              />
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <Share2 className="size-4 shrink-0" />
                <span>Share form</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={duplicate.isPending}
                onClick={() => duplicate.mutate({ id: form.id })}
              >
                {duplicate.isPending ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Copy className="size-4 shrink-0" />
                )}
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link href={`/f/${form.slug}`}>
                    <ExternalLink className="size-4 shrink-0" />
                    <span>View form</span>
                  </Link>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <Link href={`/dashboard/forms/${form.id}/analytics`}>
                    <BarChart3 className="size-4 shrink-0" />
                    <span>View analytics</span>
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <Link href={`/dashboard/forms/${form.id}/submissions`}>
                    <ListChecks className="size-4 shrink-0" />
                    <span>View submissions</span>
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <Link href={`/embed?formid=${form.id}`}>
                    <Code2 className="size-4 shrink-0" />
                    <span>Embed</span>
                  </Link>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={exporting !== null || exportFetching} onClick={() => handleExport("csv")}>
                {exporting === "csv" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Download className="size-4 shrink-0" />
                )}
                <span>Export CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={exporting !== null || exportFetching} onClick={() => handleExport("json")}>
                {exporting === "json" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Download className="size-4 shrink-0" />
                )}
                <span>Export JSON</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={publishPending}
                onClick={handleTogglePublish}
              >
                {form.isPublished ? (
                  <EyeOff className="size-4 shrink-0" />
                ) : (
                  <Globe className="size-4 shrink-0" />
                )}
                <span>{form.isPublished ? "Unpublish" : "Publish"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4 shrink-0" />
                <span>Delete form</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ShareFormModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        formId={form.id}
        formSlug={form.slug}
        isPublished={form.isPublished}
        onPublish={handleSharePublish}
      />

      <ConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete form?"
        description={`This will permanently delete "${form.title}" and all of its responses. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          await deleteForm({ id: form.id });
          setDeleteOpen(false);
        }}
      />
    </>
  );
}
