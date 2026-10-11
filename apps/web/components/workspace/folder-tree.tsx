"use client";

import { Fragment, createContext, useContext, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  LayoutTemplate,
  Loader2,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { RouterOutputs } from "@repo/trpc/client";

export type FolderNode = RouterOutputs["folder"]["getAll"][number];

export type SidebarForm = {
  id: string;
  title: string;
  status: string;
  slug: string;
  updatedAt: Date | string;
};

export type DropTarget =
  | { kind: "nest"; id: string }
  | { kind: "gap"; parentId: string | null; index: number };

export type CreatingState = { parentId: string | null } | null;

export type FolderTreeProps = {
  folders: FolderNode[];
  formsByFolder: Map<string | null, SidebarForm[]>;
  selectedId: string | null;
  /** `null` means "everything expanded" (default); a Set means explicit user state. */
  expanded: Set<string> | null;
  creating: CreatingState;
  renamingId: string | null;
  pendingId: string | null;
  dragId: string | null;
  dropTarget: DropTarget | null;
  canDropOn: (dragId: string, targetId: string) => boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropTarget: (target: DropTarget | null) => void;
  onDropOnFolder: (dragId: string, targetId: string) => void;
  onDropInGap: (dragId: string, parentId: string | null, index: number) => void;
  onStartCreate: (parentId: string | null) => void;
  onCancelCreate: () => void;
  onSubmitCreate: (parentId: string | null, name: string) => void;
  onStartRename: (id: string) => void;
  onCancelRename: () => void;
  onSubmitRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
};

const ICONS: Record<string, LucideIcon> = {
  folder: FolderIcon,
  "layout-template": LayoutTemplate,
  archive: Archive,
  trash: Trash2,
};

const TreeContext = createContext<FolderTreeProps | null>(null);

function useTree() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("FolderTree internals must be used within a <FolderTree>");
  return ctx;
}

/** Inline text input used for creating/renaming folders (Enter commits, Esc cancels). */
export function InlineInput({
  defaultValue,
  placeholder,
  autoFocus,
  className,
  onCommit,
  onCancel,
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const doneRef = useRef(false);

  const commit = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCommit(value);
  };
  const cancel = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel();
  };

  return (
    <Input
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
      className={cn("h-7 px-2 text-sm", className)}
    />
  );
}

function RowAction({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
        danger
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Thin drop zone between siblings — dropping here reorders within that parent. */
function DropGap({ parentId, index }: { parentId: string | null; index: number }) {
  const ctx = useTree();
  const isValidTarget =
    ctx.dragId !== null && (parentId === null || ctx.canDropOn(ctx.dragId, parentId));
  const isActive =
    isValidTarget &&
    ctx.dropTarget?.kind === "gap" &&
    ctx.dropTarget.parentId === parentId &&
    ctx.dropTarget.index === index;

  return (
    <div
      onDragOver={(e) => {
        if (!isValidTarget) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        ctx.onDropTarget({ kind: "gap", parentId, index });
      }}
      onDragLeave={(e) => {
        if ((e.relatedTarget as Node | null) && e.currentTarget.contains(e.relatedTarget as Node)) {
          return;
        }
        if (isActive) ctx.onDropTarget(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isValidTarget && ctx.dragId) ctx.onDropInGap(ctx.dragId, parentId, index);
        ctx.onDragEnd();
      }}
      className={cn("h-1.5 rounded-full transition-colors", isActive && "bg-primary/40")}
    />
  );
}

/** Renders a single form item inside a folder. */
function FormRow({ form, depth }: { form: SidebarForm; depth: number }) {
  const pathname = usePathname();
  const isActive = pathname === `/dashboard/forms/${form.id}`;
  const isPublished = form.status === "published";

  return (
    <Link
      href={`/dashboard/forms/${form.id}/analytics`}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md py-1 pr-1.5 pl-1.5 text-[13px] transition-colors",
        isActive
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      style={{ paddingLeft: depth * 14 + 24 }}
    >
      <FileText className="size-3.5 shrink-0 opacity-60" />
      <span className="min-w-0 flex-1 truncate">{form.title}</span>
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          isPublished ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />
    </Link>
  );
}

function FolderRow({ folder, depth }: { folder: FolderNode; depth: number }) {
  const ctx = useTree();
  const Icon = ICONS[folder.icon ?? ""] ?? FolderIcon;
  const isExpanded = ctx.expanded === null || ctx.expanded.has(folder.id);
  const isSelected = ctx.selectedId === folder.id;
  const hasChildren = folder.children.length > 0;
  const isDragging = ctx.dragId === folder.id;
  const isPending = ctx.pendingId === folder.id;
  const isArchived = folder.archivedAt != null;
  const isCreatingSub = ctx.creating?.parentId === folder.id;

  const folderForms = ctx.formsByFolder.get(folder.id) ?? [];
  const hasForms = folderForms.length > 0;

  const isValidNestTarget =
    ctx.dragId !== null && ctx.dragId !== folder.id && ctx.canDropOn(ctx.dragId, folder.id);
  const isNestActive = ctx.dropTarget?.kind === "nest" && ctx.dropTarget.id === folder.id;

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          ctx.onDragStart(folder.id);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", folder.id);
        }}
        onDragEnd={ctx.onDragEnd}
        onDragOver={(e) => {
          if (!isValidNestTarget) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          ctx.onDropTarget({ kind: "nest", id: folder.id });
        }}
        onDragLeave={(e) => {
          if ((e.relatedTarget as Node | null) && e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
          }
          if (isNestActive) ctx.onDropTarget(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (ctx.dragId && isValidNestTarget) ctx.onDropOnFolder(ctx.dragId, folder.id);
          ctx.onDragEnd();
        }}
        role="button"
        tabIndex={0}
        onClick={() => {
          ctx.onToggle(folder.id);
          ctx.onSelect(folder.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            ctx.onToggle(folder.id);
            ctx.onSelect(folder.id);
          }
        }}
        className={cn(
          "group flex w-full cursor-grab items-center gap-1.5 rounded-md py-1.5 pr-1.5 text-sm transition-colors active:cursor-grabbing",
          isDragging && "opacity-40",
          isNestActive && "bg-primary/10 ring-2 ring-primary/70",
          isSelected
            ? "bg-accent font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {(hasChildren || hasForms) ? (
          <button
            type="button"
            aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
            onClick={(e) => {
              e.stopPropagation();
              ctx.onToggle(folder.id);
            }}
            className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform duration-200", isExpanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        <Icon
          className={cn(
            "size-4 shrink-0",
            isSelected ? "text-foreground" : "text-muted-foreground",
            isArchived && !isSelected && "opacity-60",
          )}
        />

        {ctx.renamingId === folder.id ? (
          <InlineInput
            defaultValue={folder.name}
            autoFocus
            onCommit={(v) => ctx.onSubmitRename(folder.id, v)}
            onCancel={ctx.onCancelRename}
            className="h-6 flex-1"
          />
        ) : (
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              isArchived && "italic text-muted-foreground/70",
            )}
          >
            {folder.name}
          </span>
        )}

        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
            isSelected ? "bg-background text-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {folder.formCount}
        </span>

        {isPending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <RowAction
              label="New subfolder"
              onClick={(e) => {
                e.stopPropagation();
                ctx.onStartCreate(folder.id);
              }}
            >
              <FolderPlus className="size-3.5" />
            </RowAction>
            <RowAction
              label="Rename"
              onClick={(e) => {
                e.stopPropagation();
                ctx.onStartRename(folder.id);
              }}
            >
              <Pencil className="size-3.5" />
            </RowAction>
            {isArchived ? (
              <RowAction
                label="Restore"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onRestore(folder.id);
                }}
              >
                <ArchiveRestore className="size-3.5" />
              </RowAction>
            ) : (
              <RowAction
                label="Archive"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onArchive(folder.id);
                }}
              >
                <Archive className="size-3.5" />
              </RowAction>
            )}
            <RowAction
              label="Delete"
              danger
              onClick={(e) => {
                e.stopPropagation();
                ctx.onDelete(folder.id);
              }}
            >
              <Trash2 className="size-3.5" />
            </RowAction>
          </div>
        )}
      </div>

      {isCreatingSub && (
        <div style={{ paddingLeft: depth * 14 + 24 }} className="py-1 pr-1.5">
          <InlineInput
            autoFocus
            placeholder="Folder name"
            onCommit={(v) => ctx.onSubmitCreate(folder.id, v)}
            onCancel={ctx.onCancelCreate}
            className="h-7"
          />
        </div>
      )}

      {isExpanded && (
        <div className="relative flex flex-col">
          {/* Forms inside this folder */}
          {hasForms && (
            <div style={{ paddingLeft: depth * 14 + 6 }}>
              {folderForms.map((form) => (
                <FormRow key={form.id} form={form} depth={depth + 1} />
              ))}
            </div>
          )}
          {/* Subfolders */}
          {hasChildren && (
            <div className="relative ml-2.5 flex flex-col border-l border-border/70 pl-2">
              <FolderTreeRecursive folders={folder.children} depth={depth + 1} parentId={folder.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FolderTreeRecursive({
  folders,
  depth,
  parentId,
}: {
  folders: FolderNode[];
  depth: number;
  parentId: string | null;
}) {
  const ctx = useTree();

  return (
    <>
      {folders.map((folder, index) => {
        return (
          <Fragment key={folder.id}>
            <DropGap parentId={parentId} index={index} />
            <FolderRow folder={folder} depth={depth} />
          </Fragment>
        );
      })}
      <DropGap parentId={parentId} index={folders.length} />
    </>
  );
}

/**
 * Interactive folder tree with inline form rendering. Folders can be
 * dragged onto another folder (nest) or dropped in the gap between siblings
 * (reorder). Forms appear as children of their parent folder.
 */
export function FolderTree(props: FolderTreeProps) {
  return (
    <TreeContext.Provider value={props}>
      <div className="flex flex-col">
        <FolderTreeRecursive folders={props.folders} depth={0} parentId={null} />
      </div>
    </TreeContext.Provider>
  );
}
