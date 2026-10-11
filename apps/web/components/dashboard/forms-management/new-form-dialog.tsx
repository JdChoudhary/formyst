"use client";

import { ArrowRight, Check, FilePen, FileText, ListChecks, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ComponentType, FormEvent } from "react";
import { toast } from "sonner";

import { useCreateForm } from "@/hooks/api/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormType = "single" | "multi";

const FORM_TYPES: {
  value: FormType;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}[] = [
  {
    value: "single",
    icon: FileText,
    title: "Single-page form",
    description: "Traditional form with all fields on one page.",
  },
  {
    value: "multi",
    icon: ListChecks,
    title: "Multi-step form",
    description: "Guided form experience across multiple steps.",
  },
];

interface NewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shared "Create a new form" flow. Used by the dashboard and shown
 * automatically when landing on `/form-builder`. After creating the form it
 * redirects to the builder for that form.
 */
export function NewFormDialog({ open, onOpenChange }: NewFormDialogProps) {
  const { createForm, isPending: createPending } = useCreateForm();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [formType, setFormType] = useState<FormType>("single");
  const [internalTitle, setInternalTitle] = useState("");
  const [publicTitle, setPublicTitle] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setStep(1);
    setFormType("single");
    setInternalTitle("");
    setPublicTitle("");
    setDescription("");
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) reset();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    if (!internalTitle.trim()) return;
    try {
      const newForm = await createForm({
        title: internalTitle.trim(),
        publicTitle: publicTitle.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Form created");
      reset();
      onOpenChange(false);
      router.push(`/form-builder/${newForm.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <FilePen className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Create a new form</DialogTitle>
              <DialogDescription>
                {step === 1
                  ? "Choose how your form flows."
                  : "Set the internal and public information for your form."}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${step * 50}%` }}
            />
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {FORM_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = formType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFormType(type.value)}
                    className={cn(
                      "relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "hover:border-foreground/25 hover:bg-accent/50",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{type.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                    {selected ? (
                      <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-internal-title">Internal title</Label>
                <Input
                  id="form-internal-title"
                  value={internalTitle}
                  onChange={(e) => setInternalTitle(e.target.value)}
                  placeholder="Event registration"
                  className="h-10"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Only visible in the dashboard and builder.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-public-title">Public title</Label>
                <Input
                  id="form-public-title"
                  value={publicTitle}
                  onChange={(e) => setPublicTitle(e.target.value)}
                  placeholder="Event registration 2026"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Shown to users on the form. Leave empty to reuse the internal title.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-description">Short description</Label>
                <Textarea
                  id="form-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell users what this form is for..."
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Helps users understand the form&apos;s purpose.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className={step === 2 ? "sm:justify-between" : undefined}>
            {step === 2 ? (
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            ) : null}
            {step === 1 ? (
              <Button type="submit">
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={!internalTitle.trim() || createPending}>
                <Plus className="size-4" />
                {createPending ? "Creating..." : "Create form"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}