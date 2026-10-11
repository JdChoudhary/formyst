import {
  Zap,
  BarChart3,
  Puzzle,
  Shield,
  Palette,
  Globe,
  ArrowRight,
  Sparkles,
  Layers,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast Builder",
    description:
      "Build complete forms in under 2 minutes. Our drag-and-drop editor is designed for speed — no learning curve, just results.",
    color: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600",
    span: "sm:col-span-2",
  },
  {
    icon: Palette,
    title: "Beautiful by Default",
    description:
      "Every form looks professional out of the box. Customize themes, fonts, and colors to match your brand.",
    color: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600",
    span: "",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "See responses as they come in. Visualize data with built-in charts, export to CSV, or connect to your analytics stack.",
    color: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-600",
    span: "",
  },
  {
    icon: Puzzle,
    title: "Seamless Integrations",
    description:
      "Share a public link, embed a form, and connect your workflow with webhooks when you need automation.",
    color: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600",
    span: "sm:col-span-2",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Keep collection focused with required fields, validation, rate limits, and controls for public forms.",
    color: "from-rose-500/10 to-pink-500/10",
    iconColor: "text-rose-600",
    span: "",
  },
  {
    icon: Globe,
    title: "Share Anywhere",
    description:
      "Embed forms on any website, share via link, or collect offline. Works perfectly on every device and screen size.",
    color: "from-cyan-500/10 to-sky-500/10",
    iconColor: "text-cyan-600",
    span: "",
  },
];

const highlights = [
  {
    icon: GitBranch,
    title: "Conditional Logic",
    description: "Show or hide fields based on user answers. Create dynamic, intelligent forms.",
  },
  {
    icon: Layers,
    title: "Multi-step Forms",
    description: "Break long forms into steps. Improve completion rates with Typeform-style flows.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Let AI generate forms from your descriptions. Smart suggestions as you build.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need to build{" "}
            <span className="text-muted-foreground">exceptional forms</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features wrapped in a simple interface. From basic contact forms to complex
            workflows — Formyst handles it all.
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 ${feature.span}`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <div className="relative">
                <div
                  className={`mb-4 flex size-10 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/50 ${feature.iconColor}`}
                >
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="group flex items-start gap-4 rounded-2xl border border-border/50 bg-card p-5 transition-all hover:border-primary/20 hover:shadow-md"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">{item.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            render={<Link href="/register" />}
            nativeButton={false}
          >
            Explore All Features
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
