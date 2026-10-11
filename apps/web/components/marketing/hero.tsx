import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Sparkles,
  Check,
  Type,
  ToggleLeft,
  List,
  Calendar,
  Mail,
  Hash,
  GripVertical,
  Star,
  Users,
  Zap,
} from "lucide-react";

const formFields = [
  { icon: Type, label: "Text Input" },
  { icon: Mail, label: "Email" },
  { icon: Hash, label: "Number" },
  { icon: List, label: "Dropdown" },
  { icon: ToggleLeft, label: "Toggle" },
  { icon: Calendar, label: "Date Picker" },
];

const stats = [
  { value: "10K+", label: "Forms Created" },
  { value: "50K+", label: "Responses Collected" },
  { value: "4.9", label: "User Rating", icon: Star },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[500px] rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute top-1/2 left-0 size-[400px] -translate-y-1/2 rounded-full bg-primary/3 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top badge + social proof */}
        <div className="flex flex-col items-center gap-4">
          <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 text-xs">
            <Sparkles className="size-3" />
            Now in public beta — try it free
          </Badge>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium">Built for thoughtful teams</span>
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="hidden items-center gap-1 sm:flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs font-medium">4.9/5</span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="mx-auto mt-8 max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            Build forms that{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              look beautiful
            </span>
            <br />
            and work beautifully
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Build multi-step forms with branching logic anyone on your team can read, collect
            responses in a clean table, and understand every answer — no code required.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-13 px-8 text-sm shadow-lg shadow-primary/20"
            render={<Link href="/register" />}
            nativeButton={false}
          >
            Start Building Free
            <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-13 px-8 text-sm"
            render={<Link href="#how-it-works" />}
            nativeButton={false}
          >
            See How It Works
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Start free and upgrade when your workflow needs more
        </p>

        {/* Stats bar */}
        <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-6 sm:gap-10">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                {stat.icon && <stat.icon className="size-4 fill-amber-400 text-amber-400" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Interactive Form Builder Preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          {/* Glow effect behind the card */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-2xl" />

          <div className="relative rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/5">
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-400/80" />
                <div className="size-3 rounded-full bg-yellow-400/80" />
                <div className="size-3 rounded-full bg-green-400/80" />
              </div>
              <div className="ml-4 flex-1 rounded-lg bg-muted/50 px-3 py-1 text-center text-xs text-muted-foreground">
                formyst.app/builder
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 sm:flex">
                  <Zap className="size-3" />
                  Live
                </div>
              </div>
            </div>

            {/* Builder content */}
            <div className="flex min-h-[320px] sm:min-h-[420px]">
              {/* Field palette */}
              <div className="hidden w-52 border-r border-border/50 p-3 sm:block">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Fields
                </p>
                <div className="space-y-1">
                  {formFields.map((field) => (
                    <div
                      key={field.label}
                      className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 py-2 text-xs transition-colors hover:border-primary/30 hover:bg-primary/5 cursor-grab"
                    >
                      <GripVertical className="size-3 text-muted-foreground/50" />
                      <field.icon className="size-3.5 text-muted-foreground" />
                      <span>{field.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 p-4 sm:p-6">
                <div className="mb-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-center">
                  <p className="text-xs font-medium text-primary/70">✨ Customer Feedback Form</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Full Name", placeholder: "Jane Doe", width: "full" },
                    { label: "Email Address", placeholder: "jane@company.com", width: "full" },
                    { label: "Rating", placeholder: "★★★★★", width: "half", isSpecial: true },
                    {
                      label: "Feedback",
                      placeholder: "Tell us what you think...",
                      width: "full",
                      isTextarea: true,
                    },
                  ].map((field, i) => (
                    <div
                      key={field.label}
                      className={`group/field rounded-xl border border-border/50 bg-background/80 p-3 transition-all hover:border-primary/30 hover:shadow-sm ${
                        field.width === "half" ? "sm:w-1/2" : "w-full"
                      }`}
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          {field.label}
                        </label>
                        <span className="text-[10px] text-primary/50 opacity-0 transition-opacity group-hover/field:opacity-100">
                          ✏️ Edit
                        </span>
                      </div>
                      {field.isTextarea ? (
                        <div className="h-16 rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-xs text-muted-foreground/50">
                          {field.placeholder}
                        </div>
                      ) : field.isSpecial ? (
                        <div className="flex gap-1 text-lg">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={s <= 4 ? "text-yellow-400" : "text-muted-foreground/30"}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-xs text-muted-foreground/50">
                          {field.placeholder}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submit button preview */}
                <div className="mt-4 flex justify-end">
                  <div className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background transition-transform hover:scale-105 cursor-pointer">
                    Submit Response
                  </div>
                </div>
              </div>

              {/* Properties panel */}
              <div className="hidden w-56 border-l border-border/50 p-3 lg:block">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Properties
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: "Label", value: "Full Name" },
                    { label: "Placeholder", value: "Jane Doe" },
                    { label: "Required", value: true },
                    { label: "Validation", value: "None" },
                  ].map((prop) => (
                    <div key={prop.label}>
                      <p className="text-[10px] text-muted-foreground/70">{prop.label}</p>
                      {typeof prop.value === "boolean" ? (
                        <div className="mt-1 flex items-center gap-2">
                          <div
                            className={`flex size-5 items-center justify-center rounded-md ${
                              prop.value
                                ? "bg-primary text-primary-foreground"
                                : "border border-border"
                            }`}
                          >
                            {prop.value && <Check className="size-3" />}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {prop.value ? "Yes" : "No"}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 rounded-md border border-border/30 bg-muted/20 px-2 py-1 text-xs text-muted-foreground">
                          {prop.value as string}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
