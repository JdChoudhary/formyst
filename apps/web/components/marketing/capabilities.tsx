import Link from "next/link";
import {
  BarChart3,
  Check,
  Layers,
  Route,
  Table2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    icon: Layers,
    eyebrow: "Multi-step",
    title: "Long forms, broken into easy steps",
    description:
      "Turn one overwhelming page into a guided flow. Add, rename and rearrange steps right on the canvas, and respondents get a progress bar instead of a wall of questions.",
    points: ["Step-by-step builder canvas", "Progress indicator", "Per-step questions"],
  },
  {
    icon: Route,
    eyebrow: "Smart routing",
    title: "Logic anyone on your team can write",
    description:
      "No formulas, no code. Build rules as plain sentences like “if Do you own a car? is Yes, go to Car details”. Everyone else simply continues to the next step.",
    points: ["Plain-language rules", "Jump to any step", "Skip steps automatically"],
  },
  {
    icon: Table2,
    eyebrow: "Responses",
    title: "Every answer, ready to read",
    description:
      "Responses land in a sortable table with a column per question, plus answer breakdowns, drop-off and trends — so you can see what people actually said.",
    points: ["Table with a column per question", "Per-question breakdowns", "CSV and JSON export"],
  },
];

export function Capabilities() {
  return (
    <section className="border-border/60 border-y bg-muted/20 py-20 sm:py-28" id="capabilities">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-medium text-primary text-sm uppercase tracking-wider">
            Capabilities
          </p>
          <h2 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl lg:text-5xl">
            Forms that adapt to{" "}
            <span className="text-muted-foreground">every answer</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Multi-step flows, friendly branching logic, and analytics that make responses
            obvious at a glance.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <div
              className="group flex flex-col rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
              key={capability.title}
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border/50">
                <capability.icon className="size-5" />
              </div>
              <p className="font-medium text-primary text-xs uppercase tracking-wider">
                {capability.eyebrow}
              </p>
              <h3 className="mt-2 font-semibold text-lg">{capability.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {capability.description}
              </p>
              <ul className="mt-5 flex flex-col gap-2 border-border/60 border-t pt-4">
                {capability.points.map((point) => (
                  <li className="flex items-center gap-2 text-sm" key={point}>
                    <Check className="size-3.5 shrink-0 text-emerald-500" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            className="gap-2"
            nativeButton={false}
            render={<Link href="/register" />}
            size="lg"
          >
            Start building free
            <ArrowRight className="size-4" />
          </Button>
          <Button
            className="gap-2"
            nativeButton={false}
            render={<Link href="#how-it-works" />}
            size="lg"
            variant="outline"
          >
            <BarChart3 className="size-4" />
            See how it works
          </Button>
        </div>
      </div>
    </section>
  );
}
