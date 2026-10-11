"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Palette,
  Trash2,
  Copy,
  Star,
  ArrowLeft,
  Search,
  Inbox,
  Clock,
  Loader2,
} from "lucide-react";
import { useGetThemes, useThemeMutations } from "@/hooks/api/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { ThemeEditor } from "~/components/theme-editor/theme-editor";
import { DEFAULT_THEME } from "@repo/shared/form/form-utils";

type View = "list" | "editor";

export function ThemesPageClient() {
  const [view, setView] = useState<View>("list");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: themes = [], isLoading } = useGetThemes();

  const { createTheme, deleteTheme, duplicateTheme, setDefault } =
    useThemeMutations();

  const filteredThemes = themes.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;
    try {
      const created = await createTheme.mutateAsync({
        name: newThemeName.trim(),
        config: DEFAULT_THEME,
      });
      toast.success("Theme created");
      setNewThemeName("");
      setCreateDialogOpen(false);
      setEditingThemeId(created.id);
      setView("editor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create theme");
    }
  };

  const handleDeleteTheme = async (id: string, name: string) => {
    if (!confirm(`Delete theme "${name}"? This cannot be undone.`)) return;
    try {
      await deleteTheme.mutateAsync({ id });
      toast.success("Theme deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete theme");
    }
  };

  const handleDuplicateTheme = async (id: string) => {
    try {
      const copy = await duplicateTheme.mutateAsync({ id });
      toast.success("Theme duplicated");
      setEditingThemeId(copy.id);
      setView("editor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate theme");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault.mutateAsync({ id });
      toast.success("Default theme updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set default");
    }
  };

  const handleOpenEditor = (themeId: string) => {
    setEditingThemeId(themeId);
    setView("editor");
  };

  const handleBackFromEditor = () => {
    setEditingThemeId(null);
    setView("list");
  };

  if (view === "editor" && editingThemeId) {
    return (
      <ThemeEditor
        themeId={editingThemeId}
        onBack={handleBackFromEditor}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Themes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage reusable form themes for your workspace.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          New theme
        </Button>
      </div>

      {/* Search */}
      {themes.length > 0 && (
        <div className="relative mt-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search themes..."
            value={searchQuery}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : filteredThemes.length === 0 ? (
        /* Empty state */
        <div className="mt-8 rounded-xl border border-dashed bg-card/40 p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Palette className="size-7 text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">
            {searchQuery ? "No matching themes" : "No themes yet"}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search."
              : "Create your first theme to apply consistent styling across your forms."}
          </p>
          {!searchQuery && (
            <Button className="mt-5 gap-1.5" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="size-4" />
              Create theme
            </Button>
          )}
        </div>
      ) : (
        /* Theme grid */
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredThemes.map((theme) => {
            const config = (theme as any).config || {};
            const colors = config.colors || {};
            return (
              <Card
                key={theme.id}
                className="group cursor-pointer overflow-hidden p-0 shadow-none transition-colors hover:bg-accent/50"
                onClick={() => handleOpenEditor(theme.id)}
              >
                {/* Color preview bar */}
                <div className="flex h-24 items-center justify-center gap-1 p-4" style={{ backgroundColor: colors.background || "#ffffff" }}>
                  {[colors.primary, colors.text, colors.border, colors.question, colors.answer]
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((c, i) => (
                      <div
                        className="size-6 rounded-full border border-black/10"
                        key={i}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                </div>

                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{theme.name}</p>
                      {theme.isDefault && (
                        <Badge className="shrink-0 text-[10px]" variant="secondary">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {formatDate(theme.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {!theme.isDefault && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(theme.id);
                        }}
                        size="icon-sm"
                        title="Set as default"
                        variant="ghost"
                      >
                        <Star className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateTheme(theme.id);
                      }}
                      size="icon-sm"
                      title="Duplicate"
                      variant="ghost"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTheme(theme.id, theme.name);
                      }}
                      size="icon-sm"
                      title="Delete"
                      variant="ghost"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Palette className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Create a new theme</DialogTitle>
                <DialogDescription>
                  Give your theme a name. You can customize colors, typography, and
                  layout after creating it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme name</Label>
              <Input
                autoFocus
                className="h-10"
                id="theme-name"
                onChange={(e) => setNewThemeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTheme();
                }}
                placeholder="e.g. Brand Blue, Dark Mode"
                value={newThemeName}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={!newThemeName.trim() || createTheme.isPending}
              onClick={handleCreateTheme}
            >
              {createTheme.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              Create theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
