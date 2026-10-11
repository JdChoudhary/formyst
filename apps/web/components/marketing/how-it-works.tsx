import { MousePointerClick, Settings, Share2, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MousePointerClick,
    title: "Drag & Drop Fields",
    description:
      "Choose from 30+ field types and drag them onto your canvas. Reorder, group, and arrange with intuitive controls.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: Settings,
    title: "Customize Everything",
    description:
      "Set validation rules, conditional logic, and custom themes. Make each form uniquely yours with advanced styling options.",
    color: "from-violet-500 to-purple-500",
  },
  {
    number: "03",
    icon: Share2,
    title: "Share & Collect",
    description:
      "Publish with one click. Share via link, embed on your site, or QR code. Responses flow in instantly with real-time updates.",
    color: "from-emerald-500 to-teal-500",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10 bg-muted/30" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Three steps to your{" "}
            <span className="text-muted-foreground">perfect form</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No tutorials needed. If you can click and type, you can build a form
            with Formyst.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.number} className="group relative">
              {/* Connector arrow */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden -translate-y-1/2 translate-x-[calc(50%+12px)] sm:block">
                  <ArrowRight className="size-5 text-muted-foreground/30" />
                </div>
              )}

              <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                {/* Gradient accent */}
                <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${step.color}`} />

                <div className="relative">
                  <div className="mb-6 flex items-center gap-3">
                    <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-lg`}>
                      <step.icon className="size-6" />
                    </div>
                    <span className="text-3xl font-bold text-muted-foreground/20">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
